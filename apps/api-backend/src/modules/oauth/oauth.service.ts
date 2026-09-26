import type { User } from "@prisma/client";
import { env } from "../../config/env";
import {
  generateOpaqueToken,
  sha256,
  verifyClientSecret,
} from "../../lib/crypto";
import { badRequest, forbidden, unauthorized } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import type { RequestMeta } from "../../lib/request";
import { getOwnedContext } from "../contexts/contexts.service";
import { recordAudit } from "../audit/audit.service";
import type {
  AuthorizeDecisionInput,
  AuthorizeQuery,
  TokenInput,
} from "./oauth.schemas";

interface AvailableContext {
  id: string;
  category: string;
  internalName: string;
  displayName: string | null;
  username: string | null;
  pronouns: string | null;
  avatarUrl: string | null;
}

export interface AuthorizeView {
  application: {
    clientId: string;
    name: string;
    redirectUri: string;
  };
  availableContexts: AvailableContext[];
}

/** Builds the consent-screen payload for GET /oauth/authorize. */
export async function getAuthorizeView(
  userId: string,
  query: AuthorizeQuery,
): Promise<AuthorizeView> {
  const application = await prisma.application.findUnique({
    where: { clientId: query.client_id },
  });
  if (!application) {
    throw badRequest("Unknown client_id");
  }
  if (application.redirectUri !== query.redirect_uri) {
    throw badRequest("redirect_uri does not match the registered redirect URI");
  }

  const contexts = await prisma.context.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  return {
    application: {
      clientId: application.clientId,
      name: application.name,
      redirectUri: application.redirectUri,
    },
    availableContexts: contexts.map((context) => ({
      id: context.id,
      category: context.category,
      internalName: context.internalName,
      displayName: context.displayName,
      username: context.username,
      pronouns: context.pronouns,
      avatarUrl: context.avatarUrl,
    })),
  };
}

/** Handles the consent decision for POST /oauth/authorize/decision. */
export async function decideAuthorization(
  user: User,
  input: AuthorizeDecisionInput,
  meta: RequestMeta,
): Promise<{ redirectTo: string }> {
  const application = await prisma.application.findUnique({
    where: { clientId: input.clientId },
  });
  if (!application) {
    throw badRequest("Unknown client_id");
  }
  if (application.redirectUri !== input.redirectUri) {
    throw badRequest("redirect_uri does not match the registered redirect URI");
  }

  // Ensures the context exists and is owned by the consenting user.
  const context = await getOwnedContext(user.id, input.contextId);

  if (!input.approved) {
    throw forbidden("Authorization request was denied by the user");
  }

  const code = generateOpaqueToken(32);
  const expiresAt = new Date(
    Date.now() + env.AUTH_CODE_TTL_MINUTES * 60 * 1000,
  );

  await prisma.authorizationCode.create({
    data: {
      code,
      userId: user.id,
      applicationId: application.id,
      contextId: context.id,
      redirectUri: input.redirectUri,
      expiresAt,
    },
  });

  await prisma.grant.upsert({
    where: {
      userId_applicationId_contextId: {
        userId: user.id,
        applicationId: application.id,
        contextId: context.id,
      },
    },
    create: {
      userId: user.id,
      applicationId: application.id,
      contextId: context.id,
    },
    update: { revokedAt: null },
  });

  await recordAudit({
    userId: user.id,
    applicationId: application.id,
    contextId: context.id,
    action: "ACCESS_GRANTED",
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    metadata: { scope: "identity_context" },
  });

  const separator = input.redirectUri.includes("?") ? "&" : "?";
  return { redirectTo: `${input.redirectUri}${separator}code=${code}` };
}

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
}

/** Exchanges an authorization code for a context-bound access token. */
export async function exchangeToken(
  input: TokenInput,
  meta: RequestMeta,
): Promise<TokenResponse> {
  const application = await prisma.application.findUnique({
    where: { clientId: input.client_id },
  });
  if (!application) {
    throw unauthorized("Invalid client credentials");
  }

  const authorizationCode = await prisma.authorizationCode.findUnique({
    where: { code: input.code },
  });
  if (!authorizationCode) {
    throw badRequest("Invalid authorization code");
  }

  // From here on we can attribute failures to the resource owner via audit log.
  const auditFailure = (reason: string) =>
    recordAudit({
      userId: authorizationCode.userId,
      applicationId: authorizationCode.applicationId,
      contextId: authorizationCode.contextId,
      action: "TOKEN_EXCHANGE_FAILED",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { reason },
    });

  if (authorizationCode.applicationId !== application.id) {
    await auditFailure("application_mismatch");
    throw badRequest("Authorization code was not issued to this client");
  }

  const secretValid = await verifyClientSecret(
    input.client_secret,
    application.clientSecretHash,
  );
  if (!secretValid) {
    await auditFailure("invalid_client_secret");
    throw unauthorized("Invalid client credentials");
  }

  if (
    input.redirect_uri !== authorizationCode.redirectUri ||
    input.redirect_uri !== application.redirectUri
  ) {
    await auditFailure("redirect_uri_mismatch");
    throw badRequest("redirect_uri does not match");
  }

  if (authorizationCode.expiresAt.getTime() <= Date.now()) {
    await auditFailure("code_expired");
    throw badRequest("Authorization code has expired");
  }

  // The authorisation behind the code must still be in force. The response
  // stays generic so it does not disclose the Grant's state to the client.
  const grant = await prisma.grant.findUnique({
    where: {
      userId_applicationId_contextId: {
        userId: authorizationCode.userId,
        applicationId: authorizationCode.applicationId,
        contextId: authorizationCode.contextId,
      },
    },
  });
  if (!grant || grant.revokedAt) {
    await auditFailure("grant_revoked");
    throw badRequest("Invalid authorization code");
  }

  if (authorizationCode.consumedAt) {
    await auditFailure("code_already_consumed");
    throw badRequest("Authorization code has already been used");
  }

  const rawToken = generateOpaqueToken(32);
  const expiresInSeconds = env.ACCESS_TOKEN_TTL_HOURS * 60 * 60;
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

  // Conditional consume + token insert in one transaction: a code yields at
  // most one token under concurrent exchanges, and a concurrent revocation
  // either retires the code first (count 0) or waits and then revokes the
  // token created here.
  const issued = await prisma.$transaction(async (tx) => {
    const consumed = await tx.authorizationCode.updateMany({
      where: { id: authorizationCode.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count === 0) {
      return false;
    }

    await tx.accessToken.create({
      data: {
        tokenHash: sha256(rawToken),
        userId: authorizationCode.userId,
        contextId: authorizationCode.contextId,
        applicationId: authorizationCode.applicationId,
        expiresAt,
      },
    });
    return true;
  });
  if (!issued) {
    await auditFailure("code_already_consumed");
    throw badRequest("Authorization code has already been used");
  }

  return {
    access_token: rawToken,
    token_type: "Bearer",
    expires_in: expiresInSeconds,
  };
}
