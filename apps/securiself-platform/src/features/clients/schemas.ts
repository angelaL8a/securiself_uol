import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  redirectUri: z
    .string()
    .trim()
    .min(1, "Redirect URI is required")
    .url("Enter a valid redirect URI"),
});

export type CreateClientValues = z.infer<typeof createClientSchema>;
