import type { OAuthAuthorizeParams } from "@/features/oauth/types";

/** Central registry of TanStack Query keys for cache management. */
export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  vault: {
    detail: ["vault"] as const,
  },
  contexts: {
    all: ["contexts"] as const,
    list: () => ["contexts", "list"] as const,
    detail: (contextId: string) => ["contexts", "detail", contextId] as const,
  },
  clients: {
    all: ["clients"] as const,
    list: () => ["clients", "list"] as const,
    detail: (clientId: string) => ["clients", "detail", clientId] as const,
  },
  audit: {
    list: ["audit-logs"] as const,
  },
  grants: {
    all: ["grants"] as const,
    list: () => ["grants", "list"] as const,
  },
  oauth: {
    authorize: (params: OAuthAuthorizeParams) =>
      ["oauth", "authorize", params] as const,
  },
} as const;
