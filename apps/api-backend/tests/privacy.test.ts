import { describe, expect, it } from "vitest";
import {
  authorizeAndGetToken,
  createClient,
  createContext,
  expectNoForbiddenFields,
  getProfile,
  LEGAL_CONTEXT,
  LEGAL_FORBIDDEN_FIELDS,
  PRIVATE_CONTEXT,
  PRIVATE_FORBIDDEN_FIELDS,
  PROFESSIONAL_CONTEXT,
  PROFESSIONAL_FORBIDDEN_FIELDS,
  registerUser,
  SOCIAL_CONTEXT,
  SOCIAL_FORBIDDEN_FIELDS,
} from "./helpers";

async function profileForContext(contextPayload: Record<string, unknown>) {
  const { token, email } = await registerUser();
  const context = await createContext(token, contextPayload);
  const client = await createClient(token);
  const { accessToken } = await authorizeAndGetToken({
    token,
    clientId: client.application.clientId,
    clientSecret: client.clientSecret,
    redirectUri: client.application.redirectUri,
    contextId: context.body.data.id,
  });
  const profile = await getProfile(accessToken);
  return { profile, email, accessToken, token, contextId: context.body.data.id as string, client };
}

describe("privacy filtering", () => {
  it("SOCIAL payload omits all forbidden fields", async () => {
    const { profile, email } = await profileForContext(SOCIAL_CONTEXT);

    expect(profile.status).toBe(200);
    expect(profile.body.context).toBe("SOCIAL");

    const data = profile.body.data;
    expect(data).toMatchObject({
      display_name: "AngelaTech",
      username: "AngelaTech",
      pronouns: "hidden",
    });
    expectNoForbiddenFields(data, SOCIAL_FORBIDDEN_FIELDS);
    expect(JSON.stringify(profile.body)).not.toContain(email);
  });

  it("PROFESSIONAL payload omits documentId, email and gender", async () => {
    const { profile, email } = await profileForContext(PROFESSIONAL_CONTEXT);

    expect(profile.status).toBe(200);
    expect(profile.body.context).toBe("PROFESSIONAL");

    const data = profile.body.data;
    expect(data).toMatchObject({
      display_name: "Angela Lozano",
      job_title: "Software Engineer",
      company: "SecuriSelf",
      short_bio: "Software Engineer & Founder",
    });
    expectNoForbiddenFields(data, PROFESSIONAL_FORBIDDEN_FIELDS);
    expect(JSON.stringify(profile.body)).not.toContain(email);
  });

  it("LEGAL payload includes legal identity and document id", async () => {
    const { profile, email } = await profileForContext(LEGAL_CONTEXT);

    expect(profile.status).toBe(200);
    expect(profile.body.context).toBe("LEGAL");

    const data = profile.body.data;
    expect(data).toMatchObject({
      legal_first_name: "Angela Paola",
      legal_last_name: "Lozano Ochoa",
      document_id: "PER-74829104",
    });
    expectNoForbiddenFields(data, LEGAL_FORBIDDEN_FIELDS);
    expect(JSON.stringify(profile.body)).not.toContain(email);
  });

  it("PRIVATE payload exposes only the minimal identity slice", async () => {
    const { profile, email } = await profileForContext(PRIVATE_CONTEXT);

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

  it("keeps legal identifiers out of non-LEGAL contexts and never leaks root email", async () => {
    for (const payload of [SOCIAL_CONTEXT, PROFESSIONAL_CONTEXT, PRIVATE_CONTEXT]) {
      const { profile, email } = await profileForContext(payload);
      expect(profile.status).toBe(200);
      expect(profile.body.data).not.toHaveProperty("legal_first_name");
      expect(profile.body.data).not.toHaveProperty("legal_last_name");
      expect(profile.body.data).not.toHaveProperty("document_id");
      expect(JSON.stringify(profile.body)).not.toContain(email);
    }
  });
});
