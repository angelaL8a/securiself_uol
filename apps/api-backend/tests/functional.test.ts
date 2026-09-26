import { describe, expect, it } from "vitest";
import request from "supertest";
import {
  app,
  authorizeAndGetToken,
  createClient,
  createContext,
  getProfile,
  LEGAL_CONTEXT,
  PROFESSIONAL_CONTEXT,
  registerUser,
  SOCIAL_CONTEXT,
} from "./helpers";

describe("functional flows", () => {
  it("registers a user and returns a session token without the password hash", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({
      email: "angela@example.com",
      password: "password123",
      legalFirstName: "Angela Paola",
      legalLastName: "Lozano Ochoa",
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user.email).toBe("angela@example.com");
    expect(res.body.user).not.toHaveProperty("passwordHash");
  });

  it("logs a user in with valid credentials", async () => {
    await registerUser({ email: "login@example.com", password: "password123" });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "login@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user).not.toHaveProperty("passwordHash");
  });

  it("returns the current user from /auth/me", async () => {
    const { token, email } = await registerUser();
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
  });

  it("updates vault data for the authenticated user", async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .put("/api/v1/vault")
      .set("Authorization", `Bearer ${token}`)
      .send({
        displayName: "Angela",
        gender: "female",
        avatarUrl: "https://example.com/me.png",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.displayName).toBe("Angela");
    expect(res.body.data.gender).toBe("female");
    expect(res.body.data).not.toHaveProperty("passwordHash");
  });

  it("creates PROFESSIONAL, LEGAL and SOCIAL contexts", async () => {
    const { token } = await registerUser();

    const professional = await createContext(token, PROFESSIONAL_CONTEXT);
    expect(professional.status).toBe(201);
    expect(professional.body.data.category).toBe("PROFESSIONAL");

    const legal = await createContext(token, LEGAL_CONTEXT);
    expect(legal.status).toBe(201);
    expect(legal.body.data.category).toBe("LEGAL");

    const social = await createContext(token, SOCIAL_CONTEXT);
    expect(social.status).toBe(201);
    expect(social.body.data.category).toBe("SOCIAL");

    const list = await request(app)
      .get("/api/v1/contexts")
      .set("Authorization", `Bearer ${token}`);
    expect(list.body.data).toHaveLength(3);
  });

  it("authorizes a client and exchanges the code for an access token", async () => {
    const { token } = await registerUser();
    const social = await createContext(token, SOCIAL_CONTEXT);
    const client = await createClient(token);

    const { accessToken } = await authorizeAndGetToken({
      token,
      clientId: client.application.clientId,
      clientSecret: client.clientSecret,
      redirectUri: client.application.redirectUri,
      contextId: social.body.data.id,
    });

    expect(accessToken).toBeTypeOf("string");
  });

  it("reads the filtered profile via /profiles/me", async () => {
    const { token } = await registerUser();
    const social = await createContext(token, SOCIAL_CONTEXT);
    const client = await createClient(token);

    const { accessToken } = await authorizeAndGetToken({
      token,
      clientId: client.application.clientId,
      clientSecret: client.clientSecret,
      redirectUri: client.application.redirectUri,
      contextId: social.body.data.id,
    });

    const profile = await getProfile(accessToken);
    expect(profile.status).toBe(200);
    expect(profile.body.status).toBe("success");
    expect(profile.body.context).toBe("SOCIAL");
    expect(profile.body.data.username).toBe("AngelaTech");
  });

  it("exposes a health endpoint", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
