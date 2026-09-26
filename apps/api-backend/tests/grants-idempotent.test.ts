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

async function countAccessRevoked(token: string): Promise<number> {
  const audit = await request(app)
    .get("/api/v1/audit-logs")
    .set("Authorization", `Bearer ${token}`);
  expect(audit.status).toBe(200);
  return audit.body.data.filter(
    (log: { action: string }) => log.action === "ACCESS_REVOKED",
  ).length;
}

describe("grant revoke idempotency", () => {
  it("revokes once, then returns the same revoked Grant without a second ACCESS_REVOKED", async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const context = await createContext(owner.token, SOCIAL_CONTEXT);
    const client = await createClient(owner.token);
    const { accessToken } = await authorizeAndGetToken({
      token: owner.token,
      clientId: client.application.clientId,
      clientSecret: client.clientSecret,
      redirectUri: client.application.redirectUri,
      contextId: context.body.data.id,
    });

    expect((await getProfile(accessToken)).status).toBe(200);

    const listed = await request(app)
      .get("/api/v1/grants")
      .set("Authorization", `Bearer ${owner.token}`);
    expect(listed.status).toBe(200);
    const grantId = listed.body.data[0].id as string;
    expect(listed.body.data[0].revokedAt).toBeNull();

    const first = await request(app)
      .post(`/api/v1/grants/${grantId}/revoke`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(first.status).toBe(200);
    expect(first.body.status).toBe("success");
    expect(first.body.message).toBe("Grant revoked");
    expect(first.body.data.id).toBe(grantId);
    expect(first.body.data.revokedAt).toBeTruthy();
    expect(first.body.data.application).not.toHaveProperty("clientSecretHash");
    expect(JSON.stringify(first.body)).not.toContain(client.clientSecret);

    const firstRevokedAt = first.body.data.revokedAt as string;
    expect(await countAccessRevoked(owner.token)).toBe(1);
    expect((await getProfile(accessToken)).status).toBe(401);

    const second = await request(app)
      .post(`/api/v1/grants/${grantId}/revoke`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(second.status).toBe(200);
    expect(second.body.status).toBe("success");
    expect(second.body.message).toBe("Grant revoked");
    expect(second.body.data.id).toBe(grantId);
    expect(second.body.data.revokedAt).toBe(firstRevokedAt);
    expect(await countAccessRevoked(owner.token)).toBe(1);
    expect((await getProfile(accessToken)).status).toBe(401);

    const foreign = await request(app)
      .post(`/api/v1/grants/${grantId}/revoke`)
      .set("Authorization", `Bearer ${other.token}`);
    expect(foreign.status).toBe(403);
    expect(await countAccessRevoked(owner.token)).toBe(1);

    await authorizeAndGetToken({
      token: owner.token,
      clientId: client.application.clientId,
      clientSecret: client.clientSecret,
      redirectUri: client.application.redirectUri,
      contextId: context.body.data.id,
    });

    const reactivated = await request(app)
      .get("/api/v1/grants")
      .set("Authorization", `Bearer ${owner.token}`);
    expect(reactivated.body.data).toHaveLength(1);
    expect(reactivated.body.data[0].id).toBe(grantId);
    expect(reactivated.body.data[0].revokedAt).toBeNull();
  });
});
