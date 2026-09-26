import { expect, type Page } from "@playwright/test";

export const SOCIAL_ALLOWED = [
  "display_name",
  "username",
  "pronouns",
  "avatar_url",
] as const;

export const SOCIAL_FORBIDDEN = [
  "email",
  "legal_first_name",
  "legal_last_name",
  "document_id",
  "gender",
  "job_title",
  "company",
  "short_bio",
] as const;

export const LEGAL_ALLOWED = [
  "legal_first_name",
  "legal_last_name",
  "document_id",
  "avatar_url",
] as const;

export const LEGAL_FORBIDDEN = [
  "email",
  "username",
  "job_title",
  "company",
  "short_bio",
  "gender",
] as const;

export const PROFESSIONAL_FORBIDDEN = [
  "email",
  "document_id",
  "legal_first_name",
  "legal_last_name",
  "gender",
] as const;

export const PRIVATE_FORBIDDEN = [
  "email",
  "legal_first_name",
  "legal_last_name",
  "document_id",
  "job_title",
  "company",
  "username",
] as const;

export function assertNoForbiddenFields(
  data: Record<string, unknown>,
  forbidden: readonly string[],
): void {
  for (const field of forbidden) {
    expect(data, `profile must not expose ${field}`).not.toHaveProperty(field);
  }
}

export function assertProfileObject(
  profile: {
    status: string;
    context: string;
    data: Record<string, string | null>;
  },
  expected: {
    context: string;
    allowed: Record<string, string | null | undefined>;
    forbidden: readonly string[];
    rootEmail?: string;
  },
): void {
  expect(profile.status).toBe("success");
  expect(profile.context).toBe(expected.context);
  for (const [key, value] of Object.entries(expected.allowed)) {
    if (value !== undefined) {
      expect(profile.data[key]).toBe(value);
    }
  }
  assertNoForbiddenFields(profile.data, expected.forbidden);
  if (expected.rootEmail) {
    expect(JSON.stringify(profile)).not.toContain(expected.rootEmail);
  }
}

/** Asserts forbidden values do not appear in the rendered PrymeCab UI. */
export async function assertUiHasNoForbiddenText(
  page: Page,
  values: string[],
): Promise<void> {
  const body = await page.locator("main").innerText();
  for (const value of values) {
    expect(body, `UI must not show ${value}`).not.toContain(value);
  }
}
