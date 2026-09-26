import { z } from "zod";

export const updateVaultSchema = z
  .object({
    legalFirstName: z.string().min(1).nullable().optional(),
    legalLastName: z.string().min(1).nullable().optional(),
    displayName: z.string().min(1).nullable().optional(),
    gender: z.string().min(1).nullable().optional(),
    avatarUrl: z.string().url().nullable().optional(),
  })
  .strict();

export type UpdateVaultInput = z.infer<typeof updateVaultSchema>;
