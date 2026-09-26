"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getAuthorizeRequest, postDecision } from "./api";
import type { OAuthAuthorizeParams, OAuthDecisionInput } from "./types";

export function useOAuthAuthorizeRequest(
  params: OAuthAuthorizeParams | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: params
      ? queryKeys.oauth.authorize(params)
      : ["oauth", "authorize", "disabled"],
    queryFn: () => getAuthorizeRequest(params as OAuthAuthorizeParams),
    enabled: Boolean(params) && (options?.enabled ?? true),
    retry: false,
  });
}

export function useOAuthDecision() {
  return useMutation({
    mutationFn: (input: OAuthDecisionInput) => postDecision(input),
  });
}
