import { z } from "zod";
import {
  CATEGORY_FORM_FIELDS,
  CATEGORY_LOCALISABLE_FIELDS,
  type FieldKey,
} from "./context-rules";
import type { ContextCategory } from "./types";

export const contextCategoryEnum = z.enum([
  "PROFESSIONAL",
  "LEGAL",
  "SOCIAL",
  "PRIVATE",
]);

const optionalUrl = z
  .string()
  .trim()
  .url("Enter a valid URL")
  .or(z.literal(""));

/**
 * Form schema for creating/editing a context. Category-specific invariants
 * mirror the backend `validateContextRules`.
 */
export const contextFormSchema = z
  .object({
    category: contextCategoryEnum,
    internalName: z.string().trim().min(1, "Internal name is required"),
    displayName: z.string().trim(),
    username: z.string().trim(),
    pronouns: z.string().trim(),
    pronounsEs: z.string().trim(),
    avatarUrl: optionalUrl,
    jobTitle: z.string().trim(),
    jobTitleEs: z.string().trim(),
    company: z.string().trim(),
    shortBio: z.string().trim(),
    shortBioEs: z.string().trim(),
    documentId: z.string().trim(),
  })
  .superRefine((values, ctx) => {
    if (values.category === "SOCIAL" && !values.displayName && !values.username) {
      ctx.addIssue({
        code: "custom",
        path: ["username"],
        message: "A social context requires a display name or username",
      });
    }
    if (values.category === "PROFESSIONAL" && !values.displayName) {
      ctx.addIssue({
        code: "custom",
        path: ["displayName"],
        message: "A professional context requires a display name",
      });
    }
    if (values.category === "LEGAL" && !values.documentId) {
      ctx.addIssue({
        code: "custom",
        path: ["documentId"],
        message: "A legal context requires a document ID",
      });
    }
  });

export type ContextFormValues = z.infer<typeof contextFormSchema>;

export const EMPTY_CONTEXT_FORM: Omit<ContextFormValues, "category"> = {
  internalName: "",
  displayName: "",
  username: "",
  pronouns: "",
  pronounsEs: "",
  avatarUrl: "",
  jobTitle: "",
  jobTitleEs: "",
  company: "",
  shortBio: "",
  shortBioEs: "",
  documentId: "",
};

/**
 * Builds the strict backend payload, including only the fields relevant to the
 * selected category and converting empty strings to null.
 */
export type ContextPayload = Record<
  string,
  string | ContextCategory | { en?: string; es?: string | null } | null
>;

export function toContextPayload(values: ContextFormValues): ContextPayload {
  const fields = CATEGORY_FORM_FIELDS[values.category];
  const payload: ContextPayload = {
    category: values.category,
  };

  for (const field of fields) {
    const key = field as FieldKey;
    if (key === "internalName") {
      payload.internalName = values.internalName.trim();
      continue;
    }
    const raw = values[key]?.trim() ?? "";
    payload[key] = raw.length > 0 ? raw : null;
  }

  for (const field of CATEGORY_LOCALISABLE_FIELDS[values.category]) {
    const enKey = field as "pronouns" | "jobTitle" | "shortBio";
    const esKey = `${enKey}Es` as "pronounsEs" | "jobTitleEs" | "shortBioEs";
    const i18nKey = `${enKey}I18n`;
    const en = values[enKey].trim();
    const es = values[esKey].trim();
    payload[i18nKey] =
      en || es
        ? {
            ...(en ? { en } : {}),
            es: es ? es : null,
          }
        : null;
  }

  return payload;
}
