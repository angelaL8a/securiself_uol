/** Centralized, typed application route helpers. */
export const routes = {
  home: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  console: {
    root: "/console",
    vault: "/console/vault",
    contexts: "/console/contexts",
    newContext: "/console/contexts/new",
    context: (contextId: string) => `/console/contexts/${contextId}`,
    clients: "/console/clients",
    newClient: "/console/clients/new",
    client: (clientId: string) => `/console/clients/${clientId}`,
    clientCredentials: (clientId: string) =>
      `/console/clients/${clientId}/credentials`,
    docs: "/console/docs",
    activity: "/console/activity",
    grants: "/console/grants",
    settings: "/console/settings",
  },
  oauthAuthorize: "/oauth/authorize",
} as const;

/** Builds a sign-in URL that returns the user to `returnTo` after auth. */
export function signInWithReturn(returnTo: string): string {
  return `${routes.signIn}?returnTo=${encodeURIComponent(returnTo)}`;
}
