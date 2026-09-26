import type { Application, Context, Grant } from "@prisma/client";
import { forbidden, notFound } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import type { RequestMeta } from "../../lib/request";
import { serializeApplication } from "../clients/clients.service";

type GrantWithRelations = Grant & {
  application: Application;
  context: Context;
};

export type GrantListItem = {
  id: string;
  scope: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  application: ReturnType<typeof serializeApplication>;
  context: {
    id: string;
    category: Context["category"];
    internalName: string;
    displayName: string | null;
  };
};

function toGrantListItem(grant: GrantWithRelations): GrantListItem {
  return {
    id: grant.id,
    scope: grant.scope,
    expiresAt: grant.expiresAt,
    revokedAt: grant.revokedAt,
    createdAt: grant.createdAt,
    application: serializeApplication(grant.application),
    context: {
      id: grant.context.id,
      category: grant.context.category,
      internalName: grant.context.internalName,
      displayName: grant.context.displayName,
    },
  };
}

export async function listGrants(userId: string): Promise<GrantListItem[]> {
  const grants = await prisma.grant.findMany({
    where: { userId },
    include: { application: true, context: true },
    orderBy: { createdAt: "desc" },
  });

  return grants.map(toGrantListItem);
}

/**
 * Revokes a Grant owned by the caller.
 * Idempotent: a second revoke of an already-revoked Grant returns the same
 * revoked row without changing `revokedAt`, creating another ACCESS_REVOKED,
 * or re-mutating already-revoked tokens.
 */
export async function revokeGrant(
  userId: string,
  grantId: string,
  meta: RequestMeta,
): Promise<GrantListItem> {
  const grant = await prisma.grant.findUnique({
    where: { id: grantId },
    include: { application: true, context: true },
  });
  if (!grant) {
    throw notFound("Grant not found");
  }
  if (grant.userId !== userId) {
    throw forbidden("You do not have access to this grant");
  }

  if (grant.revokedAt) {
    return toGrantListItem(grant);
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    // Conditional update: only the first concurrent winner transitions the row.
    const updated = await tx.grant.updateMany({
      where: { id: grant.id, userId, revokedAt: null },
      data: { revokedAt: now },
    });

    if (updated.count === 0) {
      const current = await tx.grant.findUniqueOrThrow({
        where: { id: grant.id },
        include: { application: true, context: true },
      });
      return toGrantListItem(current);
    }

    // Retire unexchanged codes for this Grant. Re-authorisation reactivates the
    // same Grant row, so a code left open here could otherwise be exchanged
    // later. Runs before token revocation so it serialises with an in-flight
    // exchange on the code row (see exchangeToken).
    await tx.authorizationCode.updateMany({
      where: {
        userId: grant.userId,
        applicationId: grant.applicationId,
        contextId: grant.contextId,
        consumedAt: null,
      },
      data: { consumedAt: now },
    });

    await tx.accessToken.updateMany({
      where: {
        userId: grant.userId,
        applicationId: grant.applicationId,
        contextId: grant.contextId,
        revokedAt: null,
      },
      data: { revokedAt: now },
    });

    await tx.auditLog.create({
      data: {
        userId: grant.userId,
        applicationId: grant.applicationId,
        contextId: grant.contextId,
        action: "ACCESS_REVOKED",
        ipAddress: meta.ipAddress ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });

    const result = await tx.grant.findUniqueOrThrow({
      where: { id: grant.id },
      include: { application: true, context: true },
    });
    return toGrantListItem(result);
  });
}
