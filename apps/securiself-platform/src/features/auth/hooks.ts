"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { queryKeys } from "@/lib/query-keys";
import { routes } from "@/lib/routes";
import {
  fetchCurrentUser,
  login,
  register,
  signInWithGoogle,
  type LoginPayload,
  type RegisterPayload,
} from "./api";
import { useAuthStore } from "./auth-store";
import type { AuthResponse } from "./types";

/** Fetches the authenticated user, enabled only when a token is present. */
export function useCurrentUser() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => {
      const user = await fetchCurrentUser();
      setUser(user);
      return user;
    },
    enabled: hydrated && Boolean(token),
  });
}

/**
 * Resolves the post-authentication destination. Only internal absolute paths
 * are honored, which is what keeps the PrymeCab -> SecuriSelf consent URL
 * intact while blocking open redirects. Shared by password and Google auth.
 */
export function resolveReturnTo(returnTo?: string | null): string {
  if (!returnTo) return routes.console.root;
  // Reject "//host" and "/\host", which browsers treat as protocol-relative.
  if (!returnTo.startsWith("/") || /^\/[/\\]/.test(returnTo)) {
    return routes.console.root;
  }
  return returnTo;
}

function useAuthSuccessHandler() {
  const setSession = useAuthStore((s) => s.setSession);
  const queryClient = useQueryClient();
  const router = useRouter();

  return useCallback(
    (result: AuthResponse, returnTo?: string | null) => {
      setSession(result.token, result.user);
      queryClient.setQueryData(queryKeys.auth.me, result.user);
      router.replace(resolveReturnTo(returnTo));
    },
    [setSession, queryClient, router],
  );
}

export function useLogin(returnTo?: string | null) {
  const onSuccess = useAuthSuccessHandler();
  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: (result) => onSuccess(result, returnTo),
  });
}

export function useRegister(returnTo?: string | null) {
  const onSuccess = useAuthSuccessHandler();
  return useMutation({
    mutationFn: (payload: RegisterPayload) => register(payload),
    onSuccess: (result) => onSuccess(result, returnTo),
  });
}

/**
 * Google sign-in / sign-up. Deliberately reuses the exact same success handler
 * as password auth, so the session, query cache and returnTo behave identically.
 */
export function useGoogleSignIn(returnTo?: string | null) {
  const onSuccess = useAuthSuccessHandler();
  return useMutation({
    mutationFn: (credential: string) => signInWithGoogle(credential),
    onSuccess: (result) => onSuccess(result, returnTo),
  });
}

/** Clears the session, query cache and redirects to sign-in. */
export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const queryClient = useQueryClient();
  const router = useRouter();

  return useCallback(() => {
    clear();
    queryClient.clear();
    router.replace(routes.signIn);
  }, [clear, queryClient, router]);
}
