import { expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

export const app = createApp();

export const DEFAULT_REDIRECT_URI = "http://localhost:3001/api/callback";

let counter = 0;
function uniqueEmail(): string {
  counter += 1;
  return `user_${Date.now()}_${counter}@example.com`;
}

export interface RegisteredUser {
  token: string;
  user: { id: string; email: string };
  email: string;
  password: string;
}

export async function registerUser(
  overrides: Record<string, unknown> = {},
): Promise<RegisteredUser> {
  const email = (overrides.email as string) ?? uniqueEmail();
  const password = (overrides.password as string) ?? "password123";
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({
      email,
      password,
      legalFirstName: "Angela Paola",
      legalLastName: "Lozano Ochoa",
      ...overrides,
    });

  if (res.status !== 201) {
    throw new Error(`registerUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return { token: res.body.token, user: res.body.user, email, password };
}

export function createContext(
  token: string,
  payload: Record<string, unknown>,
) {
  return request(app)
    .post("/api/v1/contexts")
    .set("Authorization", `Bearer ${token}`)
    .send(payload);
}

export interface CreatedClient {
  application: { id: string; clientId: string; name: string; redirectUri: string };
  clientSecret: string;
}

export async function createClient(
  token: string,
  payload: Record<string, unknown> = {
    name: "PrymeCab Luxury Client",
    redirectUri: DEFAULT_REDIRECT_URI,
  },
): Promise<CreatedClient> {
  const res = await request(app)
    .post("/api/v1/clients")
    .set("Authorization", `Bearer ${token}`)
    .send(payload);

  if (res.status !== 201) {
    throw new Error(`createClient failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return res.body.data;
}

export async function requestDecision(params: {
  token: string;
  clientId: string;
  redirectUri: string;
  contextId: string;
  approved?: boolean;
}) {
  return request(app)
    .post("/oauth/authorize/decision")
    .set("Authorization", `Bearer ${params.token}`)
    .send({
      clientId: params.clientId,
      redirectUri: params.redirectUri,
      contextId: params.contextId,
      approved: params.approved ?? true,
    });
}

export function extractCode(redirectTo: string): string {
  const code = new URL(redirectTo).searchParams.get("code");
  if (!code) {
    throw new Error(`No code found in redirect: ${redirectTo}`);
  }
  return code;
}

export function exchangeCode(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}) {
  return request(app)
    .post("/oauth/token")
    .send({
      grant_type: "authorization_code",
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
    });
}

/** Runs the entire authorize-decision -> token exchange flow. */
export async function authorizeAndGetToken(params: {
  token: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  contextId: string;
}): Promise<{ code: string; accessToken: string }> {
  const decision = await requestDecision(params);
  if (decision.status !== 200) {
    throw new Error(
      `decision failed: ${decision.status} ${JSON.stringify(decision.body)}`,
    );
  }
  const code = extractCode(decision.body.redirectTo);
  const tokenRes = await exchangeCode({ ...params, code });
  if (tokenRes.status !== 200) {
    throw new Error(
      `token exchange failed: ${tokenRes.status} ${JSON.stringify(tokenRes.body)}`,
    );
  }
  return { code, accessToken: tokenRes.body.access_token };
}

export function getProfile(
  accessToken: string,
  headers: Record<string, string> = {},
) {
  return request(app)
    .get("/api/v1/profiles/me")
    .set("Authorization", `Bearer ${accessToken}`)
    .set(headers);
}

export const SOCIAL_CONTEXT = {
  category: "SOCIAL",
  internalName: "Gaming Community",
  displayName: "AngelaTech",
  username: "AngelaTech",
  pronouns: "hidden",
  avatarUrl: "https://example.com/avatar-social.png",
};

export const PROFESSIONAL_CONTEXT = {
  category: "PROFESSIONAL",
  internalName: "Work",
  displayName: "Angela Lozano",
  pronouns: "she/her",
  jobTitle: "Software Engineer",
  company: "SecuriSelf",
  shortBio: "Software Engineer & Founder",
  avatarUrl: "https://example.com/avatar-pro.png",
};

export const LEGAL_CONTEXT = {
  category: "LEGAL",
  internalName: "Government",
  documentId: "PER-74829104",
  avatarUrl: "https://example.com/avatar-legal.png",
};

export const PRIVATE_CONTEXT = {
  category: "PRIVATE",
  internalName: "Minimal",
  displayName: "Angela",
  pronouns: "she/her",
  avatarUrl: "https://example.com/avatar-private.png",
};

/** Shared privacy vocabulary used across backend and mirrored in E2E helpers. */
export const FORBIDDEN_ROOT_FIELDS = [
  "email",
  "gender",
  "legalFirstName",
  "legalLastName",
  "legal_first_name",
  "legal_last_name",
  "documentId",
  "document_id",
  "passwordHash",
  "password_hash",
] as const;

export const SOCIAL_FORBIDDEN_FIELDS = [
  ...FORBIDDEN_ROOT_FIELDS,
  "jobTitle",
  "job_title",
  "company",
  "shortBio",
  "short_bio",
] as const;

export const PROFESSIONAL_FORBIDDEN_FIELDS = [
  "email",
  "gender",
  "legalFirstName",
  "legalLastName",
  "legal_first_name",
  "legal_last_name",
  "documentId",
  "document_id",
] as const;

export const LEGAL_FORBIDDEN_FIELDS = [
  "email",
  "gender",
  "username",
  "jobTitle",
  "job_title",
  "company",
  "shortBio",
  "short_bio",
  "display_name",
] as const;

export const PRIVATE_FORBIDDEN_FIELDS = [
  ...FORBIDDEN_ROOT_FIELDS,
  "username",
  "jobTitle",
  "job_title",
  "company",
  "shortBio",
  "short_bio",
] as const;

export function expectNoForbiddenFields(
  data: Record<string, unknown>,
  forbidden: readonly string[],
): void {
  for (const field of forbidden) {
    expect(data).not.toHaveProperty(field);
  }
}
