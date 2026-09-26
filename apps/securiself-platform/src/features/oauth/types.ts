import type { ContextCategory } from "@/features/contexts/types";

/** Query params accepted by the OAuth-like authorize endpoint. */
export interface OAuthAuthorizeParams {
  client_id: string;
  redirect_uri: string;
  response_type: string;
  scope: string;
}

/** A context as exposed on the consent screen (limited field set). */
export interface OAuthAvailableContext {
  id: string;
  category: ContextCategory;
  internalName: string;
  displayName: string | null;
  username: string | null;
  pronouns: string | null;
  avatarUrl: string | null;
}

/** Response from GET /oauth/authorize (raw, no envelope). */
export interface OAuthAuthorizeRequest {
  application: {
    clientId: string;
    name: string;
    redirectUri: string;
  };
  availableContexts: OAuthAvailableContext[];
}

/** Body for POST /oauth/authorize/decision. */
export interface OAuthDecisionInput {
  clientId: string;
  redirectUri: string;
  contextId: string;
  approved: boolean;
}

/** Response from an approved decision (raw, no envelope). */
export interface OAuthDecisionResponse {
  redirectTo: string;
}
