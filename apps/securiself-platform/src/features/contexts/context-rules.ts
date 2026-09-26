import {
  Briefcase,
  Lock,
  Scale,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ContextCategory } from "./types";

export interface CategoryMeta {
  value: ContextCategory;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
}

/** Display metadata for each context category. */
export const CONTEXT_CATEGORIES: CategoryMeta[] = [
  {
    value: "PROFESSIONAL",
    label: "Professional",
    shortLabel: "Professional",
    description:
      "A work-facing identity. Shares your professional presence without legal or government data.",
    icon: Briefcase,
  },
  {
    value: "LEGAL",
    label: "Legal / Administrative",
    shortLabel: "Legal",
    description:
      "A verified identity for legal or administrative disclosure. Exposes legal name and document ID.",
    icon: Scale,
  },
  {
    value: "SOCIAL",
    label: "Social / Pseudonymous",
    shortLabel: "Social",
    description:
      "A pseudonymous identity. Never exposes legal name, document ID, root email or gender.",
    icon: Users,
  },
  {
    value: "PRIVATE",
    label: "Private",
    shortLabel: "Private",
    description:
      "A conservative identity. Shares minimal data and never exposes your root email by default.",
    icon: Lock,
  },
];

export function getCategoryMeta(category: ContextCategory): CategoryMeta {
  const meta = CONTEXT_CATEGORIES.find((c) => c.value === category);
  if (!meta) throw new Error(`Unknown context category: ${category}`);
  return meta;
}

/** Context fields relevant to building a payload preview / form. */
export interface ContextFieldValues {
  internalName?: string | null;
  displayName?: string | null;
  username?: string | null;
  pronouns?: string | null;
  avatarUrl?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  shortBio?: string | null;
  documentId?: string | null;
}

/** Root identity data that some categories are allowed to disclose. */
export interface VaultIdentity {
  legalFirstName?: string | null;
  legalLastName?: string | null;
}

export type FieldKey =
  | "internalName"
  | "displayName"
  | "username"
  | "pronouns"
  | "avatarUrl"
  | "jobTitle"
  | "company"
  | "shortBio"
  | "documentId";

export const CATEGORY_STABLE_FIELDS: Record<ContextCategory, FieldKey[]> = {
  PROFESSIONAL: ["internalName", "displayName", "avatarUrl", "company"],
  SOCIAL: ["internalName", "username", "displayName", "avatarUrl"],
  LEGAL: ["internalName", "displayName", "documentId", "avatarUrl"],
  PRIVATE: ["internalName", "displayName", "avatarUrl"],
};

export const CATEGORY_LOCALISABLE_FIELDS: Record<ContextCategory, FieldKey[]> = {
  PROFESSIONAL: ["pronouns", "jobTitle", "shortBio"],
  SOCIAL: ["pronouns"],
  LEGAL: [],
  PRIVATE: ["pronouns", "shortBio"],
};

/** Which editable fields each category form should show, in order. */
export const CATEGORY_FORM_FIELDS: Record<ContextCategory, FieldKey[]> = {
  PROFESSIONAL: [
    ...CATEGORY_STABLE_FIELDS.PROFESSIONAL,
    ...CATEGORY_LOCALISABLE_FIELDS.PROFESSIONAL,
  ],
  SOCIAL: [
    ...CATEGORY_STABLE_FIELDS.SOCIAL,
    ...CATEGORY_LOCALISABLE_FIELDS.SOCIAL,
  ],
  LEGAL: CATEGORY_STABLE_FIELDS.LEGAL,
  PRIVATE: [
    ...CATEGORY_STABLE_FIELDS.PRIVATE,
    ...CATEGORY_LOCALISABLE_FIELDS.PRIVATE,
  ],
};

export const FIELD_LABELS: Record<FieldKey, string> = {
  internalName: "Internal name",
  displayName: "Display name",
  username: "Username",
  pronouns: "Pronouns",
  avatarUrl: "Avatar URL",
  jobTitle: "Job title",
  company: "Company",
  shortBio: "Short bio",
  documentId: "Document ID",
};

/**
 * Builds the `/api/v1/profiles/me` payload exactly as the backend privacy
 * filter (`profiles.service.ts`) would for the given category. Single source of
 * truth shared by the create form, context detail, OAuth consent and landing.
 */
export function buildProfilePayload(
  category: ContextCategory,
  context: ContextFieldValues,
  vault?: VaultIdentity,
): Record<string, string | null> {
  const pronouns = context.pronouns ?? "hidden";
  const avatar = context.avatarUrl ?? null;

  switch (category) {
    case "SOCIAL":
      return {
        display_name: context.displayName ?? context.username ?? null,
        username: context.username ?? null,
        pronouns,
        avatar_url: avatar,
      };
    case "PROFESSIONAL":
      return {
        display_name: context.displayName ?? null,
        pronouns,
        job_title: context.jobTitle ?? null,
        company: context.company ?? null,
        short_bio: context.shortBio ?? null,
        avatar_url: avatar,
      };
    case "LEGAL":
      return {
        legal_first_name: vault?.legalFirstName ?? null,
        legal_last_name: vault?.legalLastName ?? null,
        document_id: context.documentId ?? null,
        avatar_url: avatar,
      };
    case "PRIVATE":
      return {
        display_name: context.displayName ?? context.username ?? null,
        pronouns,
        avatar_url: avatar,
      };
    default: {
      const exhaustive: never = category;
      throw new Error(`Unsupported context category: ${String(exhaustive)}`);
    }
  }
}

export interface PrivacyRule {
  label: string;
  exposed: boolean;
  note: string;
}

/**
 * High-level privacy matrix per category describing which sensitive root/context
 * fields are exposed to third-party apps vs blocked. Used by PrivacyFieldRow.
 */
export function getPrivacyMatrix(category: ContextCategory): PrivacyRule[] {
  switch (category) {
    case "SOCIAL":
      return [
        { label: "Legal name", exposed: false, note: "Never shared with apps" },
        { label: "Document ID", exposed: false, note: "Blocked from API" },
        { label: "Root email", exposed: false, note: "Blocked from API" },
        { label: "Gender", exposed: false, note: "Blocked from API" },
        { label: "Display name / username", exposed: true, note: "Shared" },
        { label: "Pronouns", exposed: true, note: "Shared if set" },
        { label: "Avatar", exposed: true, note: "Shared if set" },
      ];
    case "PROFESSIONAL":
      return [
        { label: "Document ID", exposed: false, note: "Blocked from API" },
        { label: "Root email", exposed: false, note: "Blocked from API" },
        { label: "Gender", exposed: false, note: "Blocked from API" },
        { label: "Legal name", exposed: false, note: "Not shared" },
        { label: "Display name", exposed: true, note: "Shared" },
        { label: "Job title & company", exposed: true, note: "Shared if set" },
        { label: "Short bio", exposed: true, note: "Shared if set" },
        { label: "Avatar", exposed: true, note: "Shared if set" },
      ];
    case "LEGAL":
      return [
        {
          label: "Legal first & last name",
          exposed: true,
          note: "Required for legal disclosure",
        },
        {
          label: "Document ID",
          exposed: true,
          note: "Required for legal disclosure",
        },
        { label: "Root email", exposed: false, note: "Blocked from API" },
        { label: "Gender", exposed: false, note: "Blocked from API" },
        { label: "Avatar", exposed: true, note: "Shared if set" },
      ];
    case "PRIVATE":
      return [
        { label: "Root email", exposed: false, note: "Not exposed by default" },
        { label: "Legal name", exposed: false, note: "Blocked from API" },
        { label: "Document ID", exposed: false, note: "Blocked from API" },
        { label: "Gender", exposed: false, note: "Blocked from API" },
        { label: "Display name", exposed: true, note: "Shared" },
        { label: "Pronouns", exposed: true, note: "Shared if set" },
        { label: "Avatar", exposed: true, note: "Shared if set" },
      ];
    default: {
      const exhaustive: never = category;
      throw new Error(`Unsupported context category: ${String(exhaustive)}`);
    }
  }
}

/** Owner-facing wording on the consent screen for privacy-matrix labels. */
const CONSENT_LABELS: Record<string, string> = { "Root email": "Account email" };

/**
 * Notable information an application does NOT receive when this category of
 * Context is approved: the matrix's blocked fields plus every other Context.
 * Labels only, never values; not an exhaustive list of excluded data.
 */
export function getNotSharedLabels(category: ContextCategory): string[] {
  return [
    ...getPrivacyMatrix(category)
      .filter((rule) => !rule.exposed)
      .map((rule) => CONSENT_LABELS[rule.label] ?? rule.label),
    "Your other Contexts",
  ];
}
