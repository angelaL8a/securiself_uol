import { z } from "zod";

export const createClientSchema = z
  .object({
    name: z.string().min(1),
    redirectUri: z.string().url(),
  })
  .strict();

export type CreateClientInput = z.infer<typeof createClientSchema>;
