import { describe, expect, it } from "vitest";
import request from "supertest";
import {
  app,
  authorizeAndGetToken,
  createClient,
  createContext,
  expectNoForbiddenFields,
  getProfile,
  PRIVATE_CONTEXT,
  PRIVATE_FORBIDDEN_FIELDS,
  PROFESSIONAL_CONTEXT,
  registerUser,
  SOCIAL_CONTEXT,
  SOCIAL_FORBIDDEN_FIELDS,
} from "./helpers";

const BILINGUAL_PROFESSIONAL = {
  ...PROFESSIONAL_CONTEXT,
  pronouns: "she/her",
  pronounsI18n: { en: "she/her", es: "ella" },
  jobTitle: "Software Engineer",
  jobTitleI18n: { en: "Software Engineer", es: "Ingeniera de software" },
  shortBio: "Software Engineer & Founder",
  shortBioI18n: {
    en: "Software Engineer & Founder",
    es: "Ingeniera de software y fundadora",
  },
};

const BILINGUAL_SOCIAL = {
  ...SOCIAL_CONTEXT,
  pronouns: "she/her",
  pronounsI18n: { en: "she/her", es: "ella" },
  shortBio: "Should stay hidden",
  shortBioI18n: { es: "Debe permanecer oculto" },
};

const BILINGUAL_PRIVATE = {
  ...PRIVATE_CONTEXT,
  pronouns: "she/her",
  pronounsI18n: { en: "she/her", es: "ella" },
  shortBio: "Should stay hidden",
  shortBioI18n: { es: "Debe permanecer oculto" },
};

async function profileForContext(
  contextPayload: Record<string, unknown>,
  acceptLanguage?: string,
) {
  const { token } = await registerUser();
  const context = await createContext(token, contextPayload);
  const client = await createClient(token);
  const { accessToken } = await authorizeAndGetToken({
    token,
    clientId: client.application.clientId,
    clientSecret: client.clientSecret,
    redirectUri: client.application.redirectUri,
    contextId: context.body.data.id,
  });
  const headers = acceptLanguage
    ? { "Accept-Language": acceptLanguage }
    : {};
  const profile = await getProfile(accessToken, headers);
  return { profile, token, context, accessToken };
}

describe("context shortBio i18n persistence", () => {
  it("stores language variants and keeps English scalars as the default", async () => {
    const { token } = await registerUser();
    const created = await createContext(token, BILINGUAL_PROFESSIONAL);

    expect(created.status).toBe(201);
    expect(created.body.data.pronouns).toBe("she/her");
    expect(created.body.data.jobTitle).toBe("Software Engineer");
    expect(created.body.data.shortBio).toBe("Software Engineer & Founder");
    expect(created.body.data.pronounsI18n).toEqual({
      en: "she/her",
      es: "ella",
    });
    expect(created.body.data.jobTitleI18n).toEqual({
      en: "Software Engineer",
      es: "Ingeniera de software",
    });
    expect(created.body.data.shortBioI18n).toEqual({
      en: "Software Engineer & Founder",
      es: "Ingeniera de software y fundadora",
    });
  });

  it("still accepts a plain shortBio without translations", async () => {
    const { token } = await registerUser();
    const created = await createContext(token, PROFESSIONAL_CONTEXT);

    expect(created.status).toBe(201);
    expect(created.body.data.shortBio).toBe("Software Engineer & Founder");
  });

  it("updates Spanish independently and syncs English from shortBioI18n.en", async () => {
    const { token } = await registerUser();
    const created = await createContext(token, PROFESSIONAL_CONTEXT);

    const updated = await request(app)
      .put(`/api/v1/contexts/${created.body.data.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        shortBioI18n: {
          en: "Founder",
          es: "Fundadora",
        },
      });

    expect(updated.status).toBe(200);
    expect(updated.body.data.shortBio).toBe("Founder");
    expect(updated.body.data.shortBioI18n).toEqual({
      en: "Founder",
      es: "Fundadora",
    });
  });
});

describe("GET /profiles/me Accept-Language", () => {
  it("returns Spanish localisable fields when they exist", async () => {
    const { profile } = await profileForContext(
      BILINGUAL_PROFESSIONAL,
      "es",
    );

    expect(profile.status).toBe(200);
    expect(profile.body.data.pronouns).toBe("ella");
    expect(profile.body.data.job_title).toBe("Ingeniera de software");
    expect(profile.body.data.short_bio).toBe(
      "Ingeniera de software y fundadora",
    );
    expect(profile.body.data.display_name).toBe("Angela Lozano");
    expect(profile.body.data.company).toBe("SecuriSelf");
  });

  it("returns English for en, omitted, unsupported, and regional Spanish tags", async () => {
    const { token } = await registerUser();
    const context = await createContext(token, BILINGUAL_PROFESSIONAL);
    const client = await createClient(token);
    const { accessToken } = await authorizeAndGetToken({
      token,
      clientId: client.application.clientId,
      clientSecret: client.clientSecret,
      redirectUri: client.application.redirectUri,
      contextId: context.body.data.id,
    });

    const [en, omitted, french, regional] = await Promise.all([
      getProfile(accessToken, { "Accept-Language": "en" }),
      getProfile(accessToken),
      getProfile(accessToken, { "Accept-Language": "fr" }),
      getProfile(accessToken, { "Accept-Language": "es-MX" }),
    ]);

    expect(en.body.context).toBe("PROFESSIONAL");
    expect(omitted.body.context).toBe("PROFESSIONAL");
    expect(french.body.context).toBe("PROFESSIONAL");
    expect(regional.body.context).toBe("PROFESSIONAL");
    expect(en.body.data.short_bio).toBe("Software Engineer & Founder");
    expect(en.body.data.job_title).toBe("Software Engineer");
    expect(omitted.body.data.short_bio).toBe("Software Engineer & Founder");
    expect(french.body.data.short_bio).toBe("Software Engineer & Founder");
    expect(regional.body.data.short_bio).toBe(
      "Ingeniera de software y fundadora",
    );
    expect(regional.body.data.pronouns).toBe("ella");
    expect(en.status).toBe(200);
    expect(french.status).toBe(200);
  });

  it("falls back per field when only some Spanish variants exist", async () => {
    const { profile } = await profileForContext(
      {
        ...PROFESSIONAL_CONTEXT,
        jobTitle: "Software Engineer",
        shortBio: null,
        shortBioI18n: { es: "Fundadora" },
      },
      "es",
    );

    expect(profile.status).toBe(200);
    expect(profile.body.data.job_title).toBe("Software Engineer");
    expect(profile.body.data.short_bio).toBe("Fundadora");
  });

  it("falls back to Spanish when that is the only available variant", async () => {
    const { profile } = await profileForContext(
      {
        ...PROFESSIONAL_CONTEXT,
        shortBio: null,
        shortBioI18n: { es: "Fundadora" },
      },
      "en",
    );

    expect(profile.status).toBe(200);
    expect(profile.body.data.short_bio).toBe("Fundadora");
  });

  it("returns Spanish pronouns for SOCIAL without disclosing short_bio", async () => {
    const { profile } = await profileForContext(BILINGUAL_SOCIAL, "es");

    expect(profile.status).toBe(200);
    expect(profile.body.context).toBe("SOCIAL");
    expect(profile.body.data.pronouns).toBe("ella");
    expectNoForbiddenFields(profile.body.data, SOCIAL_FORBIDDEN_FIELDS);
  });

  it("returns Spanish pronouns for PRIVATE without disclosing short_bio", async () => {
    const { profile } = await profileForContext(BILINGUAL_PRIVATE, "es");

    expect(profile.status).toBe(200);
    expect(profile.body.context).toBe("PRIVATE");
    expect(profile.body.data.pronouns).toBe("ella");
    expect(profile.body.data.display_name).toBe("Angela");
    expectNoForbiddenFields(profile.body.data, PRIVATE_FORBIDDEN_FIELDS);
  });
});
