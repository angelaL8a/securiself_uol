import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema } from "@/features/auth/schemas";
import { createClientSchema } from "@/features/clients/schemas";
import {
  contextFormSchema,
  EMPTY_CONTEXT_FORM,
  toContextPayload,
} from "./schemas";

describe("auth schemas", () => {
  it("rejects an invalid email on sign in", () => {
    expect(signInSchema.safeParse({ email: "nope", password: "x" }).success).toBe(
      false,
    );
  });

  it("requires an 8+ character password on sign up", () => {
    expect(
      signUpSchema.safeParse({ email: "a@b.com", password: "short" }).success,
    ).toBe(false);
    expect(
      signUpSchema.safeParse({ email: "a@b.com", password: "longenough" })
        .success,
    ).toBe(true);
  });
});

describe("createClientSchema", () => {
  it("requires a valid redirect URI", () => {
    expect(
      createClientSchema.safeParse({ name: "App", redirectUri: "not-a-url" })
        .success,
    ).toBe(false);
    expect(
      createClientSchema.safeParse({
        name: "App",
        redirectUri: "https://app.example.com/cb",
      }).success,
    ).toBe(true);
  });
});

describe("contextFormSchema invariants", () => {
  const base = { ...EMPTY_CONTEXT_FORM, internalName: "ctx" };

  it("requires display name or username for SOCIAL", () => {
    const result = contextFormSchema.safeParse({ ...base, category: "SOCIAL" });
    expect(result.success).toBe(false);
    const ok = contextFormSchema.safeParse({
      ...base,
      category: "SOCIAL",
      username: "ada",
    });
    expect(ok.success).toBe(true);
  });

  it("requires a display name for PROFESSIONAL", () => {
    expect(
      contextFormSchema.safeParse({ ...base, category: "PROFESSIONAL" }).success,
    ).toBe(false);
  });

  it("requires a document ID for LEGAL", () => {
    expect(
      contextFormSchema.safeParse({ ...base, category: "LEGAL" }).success,
    ).toBe(false);
  });

  it("builds a payload with only category-relevant fields", () => {
    const values = contextFormSchema.parse({
      ...base,
      category: "SOCIAL",
      username: "ada",
      jobTitle: "ignored-for-social",
    });
    const payload = toContextPayload(values);
    expect(payload).toMatchObject({ category: "SOCIAL", username: "ada" });
    expect(payload).not.toHaveProperty("jobTitle");
    expect(payload).not.toHaveProperty("jobTitleI18n");
    expect(payload).not.toHaveProperty("shortBioI18n");
    expect(payload).toHaveProperty("pronounsI18n");
  });

  it("emits i18n maps for professional localisable fields", () => {
    const values = contextFormSchema.parse({
      ...base,
      category: "PROFESSIONAL",
      displayName: "Ada L.",
      pronouns: "she/her",
      pronounsEs: "ella",
      jobTitle: "Engineer",
      jobTitleEs: "Ingeniera",
      shortBio: "Founder",
      shortBioEs: "Fundadora",
    });
    const payload = toContextPayload(values);
    expect(payload.pronounsI18n).toEqual({ en: "she/her", es: "ella" });
    expect(payload.jobTitleI18n).toEqual({ en: "Engineer", es: "Ingeniera" });
    expect(payload.shortBio).toBe("Founder");
    expect(payload.shortBioI18n).toEqual({ en: "Founder", es: "Fundadora" });
  });

  it("sends null Spanish so a cleared translation can persist", () => {
    const values = contextFormSchema.parse({
      ...base,
      category: "PROFESSIONAL",
      displayName: "Ada L.",
      jobTitle: "Engineer",
      jobTitleEs: "",
    });
    expect(toContextPayload(values).jobTitleI18n).toEqual({
      en: "Engineer",
      es: null,
    });
  });
});
