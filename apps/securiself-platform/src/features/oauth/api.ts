import { apiClient } from "@/lib/api-client";
import type {
  OAuthAuthorizeParams,
  OAuthAuthorizeRequest,
  OAuthDecisionInput,
  OAuthDecisionResponse,
} from "./types";

export function getAuthorizeRequest(
  params: OAuthAuthorizeParams,
): Promise<OAuthAuthorizeRequest> {
  // The OAuth endpoints live at /oauth, not under /api/v1, and return raw
  // objects (no { status, data } envelope). skipAuthRedirect lets the consent
  // page own its unauthenticated redirect behavior.
  return apiClient.get<OAuthAuthorizeRequest>("/oauth/authorize", {
    query: {
      client_id: params.client_id,
      redirect_uri: params.redirect_uri,
      response_type: params.response_type,
      scope: params.scope,
    },
    skipAuthRedirect: true,
  });
}

export function postDecision(
  input: OAuthDecisionInput,
): Promise<OAuthDecisionResponse> {
  return apiClient.post<OAuthDecisionResponse>(
    "/oauth/authorize/decision",
    input,
    { skipAuthRedirect: true },
  );
}
