import { apiClient } from "@/lib/api-client";
import type { AuthResponse, User } from "./types";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  legalFirstName?: string;
  legalLastName?: string;
}

export function login(payload: LoginPayload): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>("/api/v1/auth/login", payload, {
    auth: false,
  });
}

export function register(payload: RegisterPayload): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>("/api/v1/auth/register", payload, {
    auth: false,
  });
}

/**
 * Exchanges a Google Identity Services credential (an OIDC ID token) for a
 * regular SecuriSelf session. Same response shape as login/register.
 */
export function signInWithGoogle(credential: string): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>(
    "/api/v1/auth/google",
    { credential },
    { auth: false },
  );
}

export async function fetchCurrentUser(): Promise<User> {
  const result = await apiClient.get<{ status: "success"; user: User }>(
    "/api/v1/auth/me",
  );
  return result.user;
}
