import { describe, expect, it } from "vitest";
import request from "supertest";
import {
  app,
  authorizeAndGetToken,
  createClient,
  createContext,
  registerUser,
  SOCIAL_CONTEXT,
} from "./helpers";

describe("cross-user ownership", () => {
  it("rejects reading, updating, or deleting another user's context", async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const created = await createContext(owner.token, SOCIAL_CONTEXT);
    const contextId = created.body.data.id as string;

    const read = await request(app)
      .get(`/api/v1/contexts/${contextId}`)
      .set("Authorization", `Bearer ${other.token}`);
    expect(read.status).toBe(403);

    const update = await request(app)
      .put(`/api/v1/contexts/${contextId}`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ displayName: "Hijacked" });
    expect(update.status).toBe(403);

    const del = await request(app)
      .delete(`/api/v1/contexts/${contextId}`)
      .set("Authorization", `Bearer ${other.token}`);
    expect(del.status).toBe(403);

    const stillOwned = await request(app)
      .get(`/api/v1/contexts/${contextId}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(stillOwned.status).toBe(200);
    expect(stillOwned.body.data.displayName).toBe("AngelaTech");
  });

  it("rejects inspecting or rotating another user's client", async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const client = await createClient(owner.token);
    const applicationId = client.application.id;

    const detail = await request(app)
      .get(`/api/v1/clients/${applicationId}`)
      .set("Authorization", `Bearer ${other.token}`);
    expect(detail.status).toBe(403);

    const rotate = await request(app)
      .post(`/api/v1/clients/${applicationId}/rotate-secret`)
      .set("Authorization", `Bearer ${other.token}`);
    expect(rotate.status).toBe(403);

    const list = await request(app)
      .get("/api/v1/clients")
      .set("Authorization", `Bearer ${other.token}`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(0);
  });

  it("rejects revoking another user's grant", async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const context = await createContext(owner.token, SOCIAL_CONTEXT);
    const client = await createClient(owner.token);
    await authorizeAndGetToken({
      token: owner.token,
      clientId: client.application.clientId,
      clientSecret: client.clientSecret,
      redirectUri: client.application.redirectUri,
      contextId: context.body.data.id,
    });

    const grants = await request(app)
      .get("/api/v1/grants")
      .set("Authorization", `Bearer ${owner.token}`);
    expect(grants.status).toBe(200);
    const grantId = grants.body.data[0].id as string;

    const revoke = await request(app)
      .post(`/api/v1/grants/${grantId}/revoke`)
      .set("Authorization", `Bearer ${other.token}`);
    expect(revoke.status).toBe(403);

    const stillActive = await request(app)
      .get("/api/v1/grants")
      .set("Authorization", `Bearer ${owner.token}`);
    expect(stillActive.body.data[0].revokedAt).toBeNull();
  });
});
