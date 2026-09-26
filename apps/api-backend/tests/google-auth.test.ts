import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The Google verifier is the only network-bound part of the flow, so it is
// replaced by a deterministic stub. Everything else (Prisma, Express, JWT,
// OAuth-like consent, privacy filter) runs for real against PostgreSQL.
const { verifyGoogleIdToken } = vi.hoisted(() => ({
  verifyGoogleIdToken: vi.fn(),
}));
vi.mock("../src/lib/googleIdToken", () => ({ verifyGoogleIdToken }));

import { unauthorized } from "../src/lib/errors";
import { prisma } from "../src/lib/prisma";
import {
  app,
  authorizeAndGetToken,
  createClient,
  createContext,
  DEFAULT_REDIRECT_URI,
  expectNoForbiddenFields,
  getProfile,
  LEGAL_CONTEXT,
  LEGAL_FORBIDDEN_FIELDS,
  registerUser,
  SOCIAL_CONTEXT,
  SOCIAL_FORBIDDEN_FIELDS,
} from "./helpers";

function googleIdentity(sub: string, email: string) {
  verifyGoogleIdToken.mockResolvedValue({ sub, email });
}

function signInWithGoogle(credential = "google-credential") {
  return request(app).post("/api/v1/auth/google").send({ credential });
}

beforeEach(() => {
  verifyGoogleIdToken.mockReset();
});

describe("POST /api/v1/auth/google", () => {
  it("creates a SecuriSelf account for a new Google user", async () => {
    googleIdentity("google-sub-new", "New.User@Gmail.com");

    const res = await signInWithGoogle();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    // Email is normalised exactly like email/password registration.
    expect(res.body.user.email).toBe("new.user@gmail.com");
    expect(res.body.token).toBeTruthy();

    const stored = await prisma.user.findUnique({
      where: { id: res.body.user.id },
    });
    expect(stored?.googleId).toBe("google-sub-new");
    // Google-only accounts have no password: /login must stay impossible.
    expect(stored?.passwordHash).toBeNull();
    // Google profile claims never populate the LEGAL-disclosable root fields.
    expect(stored?.legalFirstName).toBeNull();
    expect(stored?.legalLastName).toBeNull();
  });

  it("never returns the Google subject to the client", async () => {
    googleIdentity("google-sub-secret", "leak@example.com");

    const res = await signInWithGoogle();

    expect(res.body.user).not.toHaveProperty("googleId");
    expect(res.body.user).not.toHaveProperty("passwordHash");
  });

  it("returns the SAME account for a returning Google user", async () => {
    googleIdentity("google-sub-returning", "returning@example.com");
    const first = await signInWithGoogle();
    const second = await signInWithGoogle();

    expect(second.status).toBe(200);
    expect(second.body.user.id).toBe(first.body.user.id);
    expect(await prisma.user.count()).toBe(1);
  });

  it("links an existing email/password account instead of duplicating it", async () => {
    const owner = await registerUser({ email: "owner@example.com" });
    const context = await createContext(owner.token, SOCIAL_CONTEXT);
    expect(context.status).toBe(201);

    googleIdentity("google-sub-link", "Owner@Example.com");
    const res = await signInWithGoogle();

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(owner.user.id);
    expect(await prisma.user.count()).toBe(1);

    // Existing user-owned data stays attached to the same account...
    const contexts = await request(app)
      .get("/api/v1/contexts")
      .set("Authorization", `Bearer ${res.body.token}`);
    expect(contexts.status).toBe(200);
    expect(contexts.body.data).toHaveLength(1);
    expect(contexts.body.data[0].id).toBe(context.body.data.id);

    // ...and the original password still works.
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: owner.email, password: owner.password });
    expect(login.status).toBe(200);
    expect(login.body.user.id).toBe(owner.user.id);
  });

  it("preserves the existing Vault when linking Google to an account", async () => {
    const owner = await registerUser({ email: "vault.owner@example.com" });
    const vaultBefore = await request(app)
      .put("/api/v1/vault")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        displayName: "Angela Owner",
        gender: "female",
        avatarUrl: "http://localhost:3001/fixtures/e2e-avatar.png",
      });
    expect(vaultBefore.status).toBe(200);

    googleIdentity("google-sub-vault", "vault.owner@example.com");
    const res = await signInWithGoogle();
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(owner.user.id);

    // Every Vault value read through the Google-issued session is identical to
    // the Vault the password account already owned. `updatedAt` is excluded
    // because linking writes googleId onto the same row, which is exactly the
    // point: one row is updated, no data is replaced and nothing is recreated.
    const vaultAfter = await request(app)
      .get("/api/v1/vault")
      .set("Authorization", `Bearer ${res.body.token}`);
    expect(vaultAfter.status).toBe(200);

    const { updatedAt: _after, ...after } = vaultAfter.body.data;
    const { updatedAt: _before, ...before } = vaultBefore.body.data;
    expect(after).toEqual(before);
    expect(after.legalFirstName).toBe("Angela Paola");
    expect(after.legalLastName).toBe("Lozano Ochoa");
    expect(after.displayName).toBe("Angela Owner");
    expect(after.avatarUrl).toBe(
      "http://localhost:3001/fixtures/e2e-avatar.png",
    );
    // The Google subject is not disclosed through the Vault either.
    expect(after).not.toHaveProperty("googleId");
  });

  it("rejects an invalid Google credential", async () => {
    verifyGoogleIdToken.mockRejectedValue(
      unauthorized("Invalid Google credential"),
    );

    const res = await signInWithGoogle("tampered-credential");

    expect(res.status).toBe(401);
    expect(await prisma.user.count()).toBe(0);
  });

  it("rejects a request without a credential", async () => {
    const res = await request(app).post("/api/v1/auth/google").send({});

    expect(res.status).toBe(400);
    expect(verifyGoogleIdToken).not.toHaveBeenCalled();
  });

  it("issues a session token accepted by the existing session middleware", async () => {
    googleIdentity("google-sub-session", "session@example.com");
    const res = await signInWithGoogle();

    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${res.body.token}`);

    expect(me.status).toBe(200);
    expect(me.body.user.id).toBe(res.body.user.id);

    // The same token drives an ordinary authenticated write.
    const vault = await request(app)
      .put("/api/v1/vault")
      .set("Authorization", `Bearer ${res.body.token}`)
      .send({ legalFirstName: "Angela Paola" });
    expect(vault.status).toBe(200);
  });
});

describe("Google accounts keep the contextual disclosure model", () => {
  it("discloses only context fields through the full consent flow", async () => {
    googleIdentity("google-sub-disclosure", "disclosure@example.com");
    const auth = await signInWithGoogle();
    const token: string = auth.body.token;

    // Legal identity is set explicitly by the owner, never by Google.
    await request(app)
      .put("/api/v1/vault")
      .set("Authorization", `Bearer ${token}`)
      .send({ legalFirstName: "Angela Paola", legalLastName: "Lozano Ochoa" });

    const social = await createContext(token, SOCIAL_CONTEXT);
    const legal = await createContext(token, LEGAL_CONTEXT);
    const { application, clientSecret } = await createClient(token);

    const socialGrant = await authorizeAndGetToken({
      token,
      clientId: application.clientId,
      clientSecret,
      redirectUri: DEFAULT_REDIRECT_URI,
      contextId: social.body.data.id,
    });
    const socialProfile = await getProfile(socialGrant.accessToken);
    expect(socialProfile.status).toBe(200);
    expect(socialProfile.body.context).toBe("SOCIAL");
    expect(socialProfile.body.data.username).toBe(SOCIAL_CONTEXT.username);
    expectNoForbiddenFields(socialProfile.body.data, SOCIAL_FORBIDDEN_FIELDS);
    // The Google-derived root email is never disclosed.
    expect(JSON.stringify(socialProfile.body)).not.toContain(
      "disclosure@example.com",
    );

    const legalGrant = await authorizeAndGetToken({
      token,
      clientId: application.clientId,
      clientSecret,
      redirectUri: DEFAULT_REDIRECT_URI,
      contextId: legal.body.data.id,
    });
    const legalProfile = await getProfile(legalGrant.accessToken);
    expect(legalProfile.status).toBe(200);
    expect(legalProfile.body.data.legal_first_name).toBe("Angela Paola");
    expectNoForbiddenFields(legalProfile.body.data, LEGAL_FORBIDDEN_FIELDS);
  });
});
