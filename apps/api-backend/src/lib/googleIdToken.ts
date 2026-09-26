import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env";
import { ApiError, unauthorized } from "./errors";

/** The only Google claims SecuriSelf persists or acts on. */
export interface GoogleIdentity {
  sub: string;
  email: string;
}

let client: OAuth2Client | null = null;

/**
 * Verifies a "Sign in with Google" credential (an OIDC ID token) against
 * Google's public certificates. `verifyIdToken` checks the signature, issuer,
 * audience and expiry, but NOT `email_verified`, so that claim is enforced here
 * before an email can be used to match an existing SecuriSelf account.
 */
export async function verifyGoogleIdToken(
  credential: string,
): Promise<GoogleIdentity> {
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new ApiError(503, "Google sign-in is not configured");
  }

  client ??= new OAuth2Client(clientId);

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    payload = ticket.getPayload();
  } catch {
    throw unauthorized("Invalid Google credential");
  }

  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw unauthorized("Google account has no verified email");
  }

  return { sub: payload.sub, email: payload.email };
}
