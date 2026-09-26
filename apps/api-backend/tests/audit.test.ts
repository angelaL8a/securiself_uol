import { describe, expect, it } from "vitest";
import request from "supertest";
import {
  app,
  authorizeAndGetToken,
  createClient,
  createContext,
  getProfile,
  registerUser,
  SOCIAL_CONTEXT,
} from "./helpers";

async function listAuditActions(token: string): Promise<string[]> {
  const res = await request(app)
    .get("/api/v1/audit-logs")
    .set("Authorization", `Bearer ${token}`);
  expect(res.status).toBe(200);
  return res.body.data.map((log: { action: string }) => log.action);
}

describe("audit logging", () => {
  it("records ACCESS_GRANTED, PROFILE_READ and ACCESS_REVOKED", async () => {
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

    expect(await listAuditActions(token)).toContain("ACCESS_GRANTED");

    await getProfile(accessToken);
    expect(await listAuditActions(token)).toContain("PROFILE_READ");

    const grants = await request(app)
      .get("/api/v1/grants")
      .set("Authorization", `Bearer ${token}`);
    const grantId = grants.body.data[0].id;
    await request(app)
      .post(`/api/v1/grants/${grantId}/revoke`)
      .set("Authorization", `Bearer ${token}`);

    expect(await listAuditActions(token)).toContain("ACCESS_REVOKED");
  });

  it("returns audit logs newest first", async () => {
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
    await getProfile(accessToken);

    const res = await request(app)
      .get("/api/v1/audit-logs")
      .set("Authorization", `Bearer ${token}`);

    const timestamps = res.body.data.map((log: { timestamp: string }) =>
      new Date(log.timestamp).getTime(),
    );
    const sorted = [...timestamps].sort((a, b) => b - a);
    expect(timestamps).toEqual(sorted);
  });

  it("associates PROFILE_READ with the expected user, application, and context", async () => {
    const { token, user } = await registerUser();
    const context = await createContext(token, SOCIAL_CONTEXT);
    const client = await createClient(token);
    const contextId = context.body.data.id as string;
    const { accessToken } = await authorizeAndGetToken({
      token,
      clientId: client.application.clientId,
      clientSecret: client.clientSecret,
      redirectUri: client.application.redirectUri,
      contextId,
    });

    await getProfile(accessToken);

    const res = await request(app)
      .get("/api/v1/audit-logs")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);

    const profileRead = res.body.data.find(
      (log: { action: string }) => log.action === "PROFILE_READ",
    );
    expect(profileRead).toBeTruthy();
    expect(profileRead.userId).toBe(user.id);
    expect(profileRead.applicationId).toBe(client.application.id);
    expect(profileRead.contextId).toBe(contextId);
  });
});
