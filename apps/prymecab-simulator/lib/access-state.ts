export type ProfileResponse = {
  status: "success";
  context: "SOCIAL" | "PROFESSIONAL" | "LEGAL" | "PRIVATE";
  data: Record<string, string | null>;
};

export type AccessState =
  | { kind: "loading" }
  | { kind: "anonymous" }
  | { kind: "access_lost" }
  | { kind: "error"; message: string }
  | { kind: "profile"; profile: ProfileResponse };

export type UserErrorBody = {
  status?: string;
  reason?: "missing_token" | "access_rejected" | string;
};

/**
 * Map /api/user outcomes to UI state.
 * Only `access_rejected` becomes the confirmed lost-authorisation state.
 */
export function resolveAccessFromUserResponse(input: {
  ok: boolean;
  reason?: string;
  profile?: ProfileResponse | null;
  networkError?: boolean;
}): AccessState {
  if (input.networkError) {
    return {
      kind: "error",
      message:
        "PrymeCab could not reach SecuriSelf. Check your connection and try again.",
    };
  }

  if (!input.ok) {
    if (input.reason === "access_rejected") {
      return { kind: "access_lost" };
    }
    if (input.reason === "missing_token") {
      return { kind: "anonymous" };
    }
    return {
      kind: "error",
      message:
        "PrymeCab could not load your SecuriSelf profile. This may be a temporary service problem — try again shortly.",
    };
  }

  if (input.profile?.status === "success") {
    return { kind: "profile", profile: input.profile };
  }

  return { kind: "anonymous" };
}
