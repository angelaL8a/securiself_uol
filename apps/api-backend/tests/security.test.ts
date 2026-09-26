import { describe, expect, it } from "vitest";
import request from "supertest";
import { prisma } from "../src/lib/prisma";
import {
  app,
  authorizeAndGetToken,
  createClient,
  createContext,
  exchangeCode,
  extractCode,
  getProfile,
  PROFESSIONAL_CONTEXT,
  registerUser,
  requestDecision,
  SOCIAL_CONTEXT,
} from "./helpers";

async function setupGrantedFlow() {
  const { token } = await registerUser();
  const context = await createContext(token, SOCIAL_CONTEXT);
  const client = await createClient(token);
  const decision = await requestDecision({
    token,
    clientId: client.application.clientId,
    redirectUri: client.application.redirectUri,
    contextId: context.body.data.id,
  });
  const code = extractCode(decision.body.redirectTo);
  return { token, client, context, code };
}

async function revokeOnlyGrant(token: string) {
  const grants = await request(app)
    .get("/api/v1/grants")
    .set("Authorization", `Bearer ${token}`);
  expect(grants.body.data).toHaveLength(1);
  const revoke = await request(app)
    .post(`/api/v1/grants/${grants.body.data[0].id}/revoke`)
    .set("Authorization", `Bearer ${token}`);
  expect(revoke.status).toBe(200);
}

describe("security - oauth token exchange", () => {
  it("rejects an expired authorization code", async () => {
    const { client, code } = await setupGrantedFlow();

    await prisma.authorizationCode.update({
      where: { code },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await exchangeCode({
      code,
      clientId: client.application.clientId,
      clientSecret: client.clientSecret,
      redirectUri: client.application.redirectUri,
    });

    expect(res.status).toBe(400);
  });

  it("rejects a consumed authorization code", async () => {
    const { client, code } = await setupGrantedFlow();

    const first = await exchangeCode({
      code,
      clientId: client.application.clientId,
      clientSecret: client.clientSecret,
      redirectUri: client.application.redirectUri,
    });
    expect(first.status).toBe(200);

    const second = await exchangeCode({
      code,
      clientId: client.application.clientId,
      clientSecret: client.clientSecret,
      redirectUri: client.application.redirectUri,
    });
    expect(second.status).toBe(400);
  });

  it("rejects a wrong client secret", async () => {
    const { client, code } = await setupGrantedFlow();

    const res = await exchangeCode({
      code,
      clientId: client.application.clientId,
      clientSecret: "totally-wrong-secret",
      redirectUri: client.application.redirectUri,
    });

    expect(res.status).toBe(401);
  });

  it("rejects a wrong redirect uri", async () => {
    const { client, code } = await setupGrantedFlow();

    const res = await exchangeCode({
      code,
      clientId: client.application.clientId,
      clientSecret: client.clientSecret,
      redirectUri: "http://localhost:3001/api/evil-callback",
    });

    expect(res.status).toBe(400);
  });

  it("issues exactly one token when the same code is exchanged concurrently", async () => {
    const { client, code } = await setupGrantedFlow();
    const params = {
      code,
      clientId: client.application.clientId,
      clientSecret: client.clientSecret,
      redirectUri: client.application.redirectUri,
    };

    const results = await Promise.all([
      exchangeCode(params),
      exchangeCode(params),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
    expect(
      await prisma.accessToken.count({
        where: { applicationId: client.application.id },
      }),
    ).toBe(1);
  });
});

describe("security - grant revoked before token exchange", () => {
  it("rejects an unexchanged code once its Grant is revoked and issues no token", async () => {
    const { token, client, context, code } = await setupGrantedFlow();
    const params = {
      code,
      clientId: client.application.clientId,
      clientSecret: client.clientSecret,
      redirectUri: client.application.redirectUri,
    };

    const issued = await prisma.authorizationCode.findUniqueOrThrow({
      where: { code },
    });
    expect(issued.consumedAt).toBeNull();
    expect(issued.expiresAt.getTime()).toBeGreaterThan(Date.now());

    await revokeOnlyGrant(token);

    const res = await exchangeCode(params);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      status: "error",
      message: "Invalid authorization code",
    });
    expect(res.body).not.toHaveProperty("access_token");
    expect(JSON.stringify(res.body)).not.toContain(client.clientSecret);

    // Still rejected on retry: the code is permanently unusable.
    expect((await exchangeCode(params)).status).toBe(400);

    expect(
      await prisma.accessToken.count({
        where: { applicationId: client.application.id },
      }),
    ).toBe(0);

    // Only the consent produced ACCESS_GRANTED; the failed exchange is
    // recorded as TOKEN_EXCHANGE_FAILED with the revocation reason.
    const logs = await prisma.auditLog.findMany({
      where: { applicationId: client.application.id },
    });
    expect(logs.filter((l) => l.action === "ACCESS_GRANTED")).toHaveLength(1);
    expect(logs.filter((l) => l.action === "PROFILE_READ")).toHaveLength(0);
    const failures = logs.filter((l) => l.action === "TOKEN_EXCHANGE_FAILED");
    expect(failures.length).toBeGreaterThanOrEqual(1);
    expect(failures[0]).toMatchObject({
      contextId: context.body.data.id,
      metadata: { reason: "grant_revoked" },
    });
  });

  it("allows a new authorization after revocation while the old code stays dead", async () => {
    const { token, client, context, code: codeA } = await setupGrantedFlow();
    const exchange = (code: string) =>
      exchangeCode({
        code,
        clientId: client.application.clientId,
        clientSecret: client.clientSecret,
        redirectUri: client.application.redirectUri,
      });

    await revokeOnlyGrant(token);
    expect((await exchange(codeA)).status).toBe(400);

    const decision = await requestDecision({
      token,
      clientId: client.application.clientId,
      redirectUri: client.application.redirectUri,
      contextId: context.body.data.id,
    });
    expect(decision.status).toBe(200);
    const codeB = extractCode(decision.body.redirectTo);
    expect(codeB).not.toBe(codeA);

    // Re-authorisation reactivates the Grant but must not resurrect code A.
    expect((await exchange(codeA)).status).toBe(400);

    const tokenRes = await exchange(codeB);
    expect(tokenRes.status).toBe(200);
    expect(tokenRes.body.access_token).toBeTruthy();

    const profile = await getProfile(tokenRes.body.access_token);
    expect(profile.status).toBe(200);
    expect(profile.body.context).toBe("SOCIAL");
    expect(profile.body.data.display_name).toBe(SOCIAL_CONTEXT.displayName);
  });
});

describe("security - access token", () => {
  it("rejects a missing bearer token", async () => {
    const res = await request(app).get("/api/v1/profiles/me");
    expect(res.status).toBe(401);
  });

  it("rejects a manipulated bearer token", async () => {
    const { token } = await registerUser();
    const context = await createContext(token, SOCIAL_CONTEXT);
    const client = await createClient(token);
    const { accessToken } = await authorizeAndGetToken({
      token,
      clientId: client.application.clientId,
      clientSecret: client.clientSecret,
      redirectUri: client.application.redirectUri,
      contextId: context.body.data.id,
    });

    const tampered = `${accessToken.slice(0, -4)}0000`;
    const res = await getProfile(tampered);
    expect(res.status).toBe(401);
  });

  it("rejects a revoked token after the grant is revoked", async () => {
    const { token } = await registerUser();
    const context = await createContext(token, SOCIAL_CONTEXT);
    const client = await createClient(token);
    const { accessToken } = await authorizeAndGetToken({
      token,
      clientId: client.application.clientId,
      clientSecret: client.clientSecret,
      redirectUri: client.application.redirectUri,
      contextId: context.body.data.id,
    });

    // Token works before revocation.
    expect((await getProfile(accessToken)).status).toBe(200);

    const grants = await request(app)
      .get("/api/v1/grants")
      .set("Authorization", `Bearer ${token}`);
    const grantId = grants.body.data[0].id;

    const revoke = await request(app)
      .post(`/api/v1/grants/${grantId}/revoke`)
      .set("Authorization", `Bearer ${token}`);
    expect(revoke.status).toBe(200);

    const res = await getProfile(accessToken);
    expect(res.status).toBe(401);
  });

  it("lists grants with application and context display fields and no secrets", async () => {
    const { token } = await registerUser();
    const context = await createContext(token, SOCIAL_CONTEXT);
    const client = await createClient(token, {
      name: "PrymeCab Display Client",
      redirectUri: "http://localhost:3001/api/callback",
    });
    await authorizeAndGetToken({
      token,
      clientId: client.application.clientId,
      clientSecret: client.clientSecret,
      redirectUri: client.application.redirectUri,
      contextId: context.body.data.id,
    });

    const grants = await request(app)
      .get("/api/v1/grants")
      .set("Authorization", `Bearer ${token}`);
    expect(grants.status).toBe(200);
    expect(grants.body.data).toHaveLength(1);

    const grant = grants.body.data[0];
    expect(grant.application.name).toBe("PrymeCab Display Client");
    expect(grant.application.clientId).toBe(client.application.clientId);
    expect(grant.application).not.toHaveProperty("clientSecretHash");
    expect(grant.context.category).toBe("SOCIAL");
    expect(grant.context.internalName).toBe(SOCIAL_CONTEXT.internalName);
    expect(grant.context).toHaveProperty("displayName");
    expect(grant.revokedAt).toBeNull();
    expect(JSON.stringify(grants.body)).not.toContain(client.clientSecret);
  });

  it("reactivates a revoked grant on re-authorisation by clearing revokedAt", async () => {
    const { token } = await registerUser();
    const context = await createContext(token, SOCIAL_CONTEXT);
    const client = await createClient(token);
    await authorizeAndGetToken({
      token,
      clientId: client.application.clientId,
      clientSecret: client.clientSecret,
      redirectUri: client.application.redirectUri,
      contextId: context.body.data.id,
    });

    const listed = await request(app)
      .get("/api/v1/grants")
      .set("Authorization", `Bearer ${token}`);
    const grantId = listed.body.data[0].id as string;

    await request(app)
      .post(`/api/v1/grants/${grantId}/revoke`)
      .set("Authorization", `Bearer ${token}`);

    const revoked = await request(app)
      .get("/api/v1/grants")
      .set("Authorization", `Bearer ${token}`);
    expect(revoked.body.data[0].revokedAt).toBeTruthy();

    await authorizeAndGetToken({
      token,
      clientId: client.application.clientId,
      clientSecret: client.clientSecret,
      redirectUri: client.application.redirectUri,
      contextId: context.body.data.id,
    });

    const reactivated = await request(app)
      .get("/api/v1/grants")
      .set("Authorization", `Bearer ${token}`);
    expect(reactivated.body.data).toHaveLength(1);
    expect(reactivated.body.data[0].id).toBe(grantId);
    expect(reactivated.body.data[0].revokedAt).toBeNull();
  });

  it("binds a token to a single context and cannot read another", async () => {
    const { token } = await registerUser();
    const social = await createContext(token, SOCIAL_CONTEXT);
    const professional = await createContext(token, PROFESSIONAL_CONTEXT);
    const client = await createClient(token);

    const socialFlow = await authorizeAndGetToken({
      token,
      clientId: client.application.clientId,
      clientSecret: client.clientSecret,
      redirectUri: client.application.redirectUri,
      contextId: social.body.data.id,
    });
    const professionalFlow = await authorizeAndGetToken({
      token,
      clientId: client.application.clientId,
      clientSecret: client.clientSecret,
      redirectUri: client.application.redirectUri,
      contextId: professional.body.data.id,
    });

    const socialProfile = await getProfile(socialFlow.accessToken);
    const professionalProfile = await getProfile(professionalFlow.accessToken);

    expect(socialProfile.body.context).toBe("SOCIAL");
    expect(professionalProfile.body.context).toBe("PROFESSIONAL");

    // The SOCIAL token never exposes professional-only fields.
    expect(socialProfile.body.data).not.toHaveProperty("job_title");
  });
});
