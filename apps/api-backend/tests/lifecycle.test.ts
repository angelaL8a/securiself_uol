import { describe, expect, it } from "vitest";
import request from "supertest";
import {
  app,
  createClient,
  createContext,
  exchangeCode,
  expectNoForbiddenFields,
  extractCode,
  getProfile,
  PRIVATE_CONTEXT,
  PRIVATE_FORBIDDEN_FIELDS,
  registerUser,
  requestDecision,
  SOCIAL_CONTEXT,
} from "./helpers";

describe("context lifecycle", () => {
  it("persists a valid update and enforces category validation", async () => {
    const { token } = await registerUser();
    const created = await createContext(token, SOCIAL_CONTEXT);
    const contextId = created.body.data.id as string;

    const updated = await request(app)
      .put(`/api/v1/contexts/${contextId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        displayName: "AngelaUpdated",
        username: "AngelaUpdated",
        pronouns: "she/her",
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data.displayName).toBe("AngelaUpdated");
    expect(updated.body.data.pronouns).toBe("she/her");

    const invalid = await request(app)
      .put(`/api/v1/contexts/${contextId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        displayName: null,
        username: null,
      });
    expect(invalid.status).toBe(400);
  });

  it("deletes an owned context so it is no longer readable", async () => {
    const { token } = await registerUser();
    const created = await createContext(token, PRIVATE_CONTEXT);
    const contextId = created.body.data.id as string;

    const del = await request(app)
      .delete(`/api/v1/contexts/${contextId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(204);

    const read = await request(app)
      .get(`/api/v1/contexts/${contextId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(read.status).toBe(404);
  });
});

describe("consent denial", () => {
  it("issues no authorization code and no ACCESS_GRANTED event", async () => {
    const { token } = await registerUser();
    const context = await createContext(token, SOCIAL_CONTEXT);
    const client = await createClient(token);

    const decision = await requestDecision({
      token,
      clientId: client.application.clientId,
      redirectUri: client.application.redirectUri,
      contextId: context.body.data.id,
      approved: false,
    });

    expect(decision.status).toBe(403);
    expect(decision.body).not.toHaveProperty("redirectTo");
    expect(JSON.stringify(decision.body)).not.toMatch(/code=/);

    const audit = await request(app)
      .get("/api/v1/audit-logs")
      .set("Authorization", `Bearer ${token}`);
    expect(audit.status).toBe(200);
    const actions = audit.body.data.map((log: { action: string }) => log.action);
    expect(actions).not.toContain("ACCESS_GRANTED");
    expect(actions).not.toContain("PROFILE_READ");
  });
});

describe("client-secret rotation", () => {
  it("returns a new secret once and invalidates the old secret", async () => {
    const { token } = await registerUser();
    const context = await createContext(token, SOCIAL_CONTEXT);
    const client = await createClient(token);
    const oldSecret = client.clientSecret;
    const applicationId = client.application.id;

    const rotated = await request(app)
      .post(`/api/v1/clients/${applicationId}/rotate-secret`)
      .set("Authorization", `Bearer ${token}`);
    expect(rotated.status).toBe(200);
    const newSecret = rotated.body.data.clientSecret as string;
    expect(newSecret).toBeTruthy();
    expect(newSecret).not.toBe(oldSecret);

    const list = await request(app)
      .get("/api/v1/clients")
      .set("Authorization", `Bearer ${token}`);
    expect(JSON.stringify(list.body)).not.toContain(oldSecret);
    expect(JSON.stringify(list.body)).not.toContain(newSecret);

    const detail = await request(app)
      .get(`/api/v1/clients/${applicationId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(JSON.stringify(detail.body)).not.toContain(oldSecret);
    expect(JSON.stringify(detail.body)).not.toContain(newSecret);

    const decision = await requestDecision({
      token,
      clientId: client.application.clientId,
      redirectUri: client.application.redirectUri,
      contextId: context.body.data.id,
    });
    const code = extractCode(decision.body.redirectTo);

    const withOld = await exchangeCode({
      code,
      clientId: client.application.clientId,
      clientSecret: oldSecret,
      redirectUri: client.application.redirectUri,
    });
    expect(withOld.status).toBe(401);

    // Code was not consumed by the failed exchange; reuse it with the new secret.
    const withNew = await exchangeCode({
      code,
      clientId: client.application.clientId,
      clientSecret: newSecret,
      redirectUri: client.application.redirectUri,
    });
    expect(withNew.status).toBe(200);
    expect(withNew.body.access_token).toBeTruthy();
  });
});

describe("PRIVATE profile filtering", () => {
  it("exposes only display_name, pronouns, and avatar_url", async () => {
    const { token, email } = await registerUser();
    const context = await createContext(token, PRIVATE_CONTEXT);
    const client = await createClient(token);
    const decision = await requestDecision({
      token,
      clientId: client.application.clientId,
      redirectUri: client.application.redirectUri,
      contextId: context.body.data.id,
    });
    const code = extractCode(decision.body.redirectTo);
    const tokenRes = await exchangeCode({
      code,
      clientId: client.application.clientId,
      clientSecret: client.clientSecret,
      redirectUri: client.application.redirectUri,
    });
    const profile = await getProfile(tokenRes.body.access_token);

    expect(profile.status).toBe(200);
    expect(profile.body.context).toBe("PRIVATE");
    expect(profile.body.data).toMatchObject({
      display_name: "Angela",
      pronouns: "she/her",
      avatar_url: "https://example.com/avatar-private.png",
    });
    expectNoForbiddenFields(profile.body.data, PRIVATE_FORBIDDEN_FIELDS);
    expect(JSON.stringify(profile.body)).not.toContain(email);
  });
});
