import { z } from "zod";

/** Validates the authorize query params read from the URL. */
export const oauthParamsSchema = z.object({
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  response_type: z.string().min(1),
  scope: z.string().min(1),
});
