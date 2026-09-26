import { z } from "zod";

export const contextCategorySchema = z.enum([
  "PROFESSIONAL",
  "LEGAL",
  "SOCIAL",
  "PRIVATE",
]);

export const localizedVariantsSchema = z
  .object({
    en: z.string().nullable().optional(),
    es: z.string().nullable().optional(),
  })
  .strict();

export const createContextSchema = z
  .object({
    category: contextCategorySchema,
    internalName: z.string().min(1),
    displayName: z.string().min(1).nullable().optional(),
    username: z.string().min(1).nullable().optional(),
    pronouns: z.string().min(1).nullable().optional(),
    pronounsI18n: localizedVariantsSchema.nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
    jobTitle: z.string().min(1).nullable().optional(),
    jobTitleI18n: localizedVariantsSchema.nullable().optional(),
    company: z.string().min(1).nullable().optional(),
    shortBio: z.string().nullable().optional(),
    shortBioI18n: localizedVariantsSchema.nullable().optional(),
    documentId: z.string().min(1).nullable().optional(),
    isStrictRead: z.boolean().optional(),
  })
  .strict();

export const updateContextSchema = createContextSchema.partial().strict();

export type CreateContextInput = z.infer<typeof createContextSchema>;
export type UpdateContextInput = z.infer<typeof updateContextSchema>;
