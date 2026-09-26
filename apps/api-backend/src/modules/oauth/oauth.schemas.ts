import { z } from "zod";

export const authorizeQuerySchema = z.object({
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  response_type: z.literal("code"),
  scope: z.literal("identity_context").optional().default("identity_context"),
});

export const authorizeDecisionSchema = z
  .object({
    clientId: z.string().min(1),
    redirectUri: z.string().url(),
    contextId: z.string().min(1),
    approved: z.boolean(),
  })
  .strict();

export const tokenSchema = z
  .object({
    grant_type: z.literal("authorization_code"),
    code: z.string().min(1),
    client_id: z.string().min(1),
    client_secret: z.string().min(1),
    redirect_uri: z.string().url(),
  })
  .strict();

export type AuthorizeQuery = z.infer<typeof authorizeQuerySchema>;
export type AuthorizeDecisionInput = z.infer<typeof authorizeDecisionSchema>;
export type TokenInput = z.infer<typeof tokenSchema>;
