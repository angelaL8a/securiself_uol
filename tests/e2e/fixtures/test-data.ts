/** Deterministic E2E seed values. Secrets here are test-only placeholders, not production credentials. */

export const E2E_ORIGINS = {
  api: "http://localhost:8080",
  platform: "http://localhost:3000",
  prymecab: "http://localhost:3001",
} as const;

export const E2E_REDIRECT_URI = "http://localhost:3001/api/auth/callback";

/** Served from PrymeCab `public/fixtures/` so tests have no external network dependency. */
export const E2E_AVATAR_URL =
  "http://localhost:3001/fixtures/e2e-avatar.png" as const;

export const E2E_USER = {
  email: "e2e.owner@securiself.test",
  password: "E2eOwnerPass123!",
  legalFirstName: "Angela Paola",
  legalLastName: "Lozano Ochoa",
  displayName: "Angela Owner",
  gender: "female",
  avatarUrl: E2E_AVATAR_URL,
} as const;

export const E2E_CLIENT = {
  name: "PrymeCab",
  clientId: "scs_e2e_prymecab_client",
  /** Test-only secret used by PrymeCab server-side exchange. Never ship to browser bundles as a product secret. */
  clientSecret: "scs_secret_e2e_prymecab_test_only",
  redirectUri: E2E_REDIRECT_URI,
} as const;

export const E2E_CONTEXTS = {
  SOCIAL: {
    category: "SOCIAL" as const,
    internalName: "E2E Social",
    displayName: "AngelaTech",
    username: "AngelaTech",
    pronouns: "she/her",
    avatarUrl: E2E_AVATAR_URL,
  },
  LEGAL: {
    category: "LEGAL" as const,
    internalName: "E2E Legal",
    documentId: "PER-E2E-74829104",
    avatarUrl: E2E_AVATAR_URL,
  },
  PROFESSIONAL: {
    category: "PROFESSIONAL" as const,
    internalName: "E2E Professional",
    displayName: "Angela Lozano",
    pronouns: "she/her",
    pronounsI18n: { en: "she/her", es: "ella" },
    jobTitle: "Software Engineer",
    jobTitleI18n: { en: "Software Engineer", es: "Ingeniera de software" },
    company: "SecuriSelf",
    shortBio: "Founder",
    shortBioI18n: { en: "Founder", es: "Fundadora" },
    avatarUrl: E2E_AVATAR_URL,
  },
  PRIVATE: {
    category: "PRIVATE" as const,
    internalName: "E2E Private",
    displayName: "Angela",
    pronouns: "she/her",
    avatarUrl: E2E_AVATAR_URL,
  },
} as const;

export const AUTH_STORAGE_KEY = "securiself.auth";
