import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/lib/query-keys";
import { routes } from "@/lib/routes";
import { useAuthStore } from "./auth-store";
import { useGoogleSignIn } from "./hooks";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }),
}));

/**
 * Covers the composition the other Sprint 4 suites each cover only half of:
 * `google-sign-in-button.test.tsx` stubs the hook away and `return-to.test.ts`
 * tests `resolveReturnTo` in isolation, so nothing asserted that a successful
 * Google response actually establishes the SecuriSelf session and lands the
 * browser back on the preserved returnTo. The real api-client runs here; only
 * `fetch` is stubbed, so the request line and body are asserted too.
 */
const CONSENT_RETURN_TO =
  "/oauth/authorize?client_id=scs_e2e_prymecab_client" +
  "&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fauth%2Fcallback" +
  "&response_type=code&scope=identity_context";

const SESSION = {
  status: "success",
  token: "securiself-session-jwt",
  user: { id: "user-1", email: "owner@example.com" },
};

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  useAuthStore.getState().clear();
  window.localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(SESSION), { status: 200 })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("useGoogleSignIn", () => {
  it("exchanges the credential for a SecuriSelf session and restores returnTo", async () => {
    const { result } = renderHook(
      () => useGoogleSignIn(CONSENT_RETURN_TO),
      { wrapper },
    );

    result.current.mutate("google-id-token");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The credential goes to the SecuriSelf backend, unauthenticated.
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/auth/google");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      credential: "google-id-token",
    });
    expect(init.headers).not.toHaveProperty("Authorization");

    // The standard SecuriSelf session is established, not a second mechanism.
    expect(useAuthStore.getState().token).toBe(SESSION.token);
    expect(useAuthStore.getState().user).toEqual(SESSION.user);
    expect(
      JSON.parse(window.localStorage.getItem("securiself.auth") ?? "null"),
    ).toEqual({ token: SESSION.token, user: SESSION.user });
    expect(queryClient.getQueryData(queryKeys.auth.me)).toEqual(SESSION.user);

    // The PrymeCab consent URL is restored verbatim, not replaced by /console.
    expect(replace).toHaveBeenCalledWith(CONSENT_RETURN_TO);
  });

  it("falls back to the console when Google auth started without returnTo", async () => {
    const { result } = renderHook(() => useGoogleSignIn(null), { wrapper });

    result.current.mutate("google-id-token");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(replace).toHaveBeenCalledWith(routes.console.root);
  });

  it("leaves no session behind when the backend rejects the credential", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ status: "error", message: "Invalid Google credential" }),
            { status: 401 },
          ),
      ),
    );

    const { result } = renderHook(() => useGoogleSignIn(null), { wrapper });
    result.current.mutate("tampered-credential");

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({
      status: 401,
      message: "Invalid Google credential",
    });
    expect(useAuthStore.getState().token).toBeNull();
    expect(window.localStorage.getItem("securiself.auth")).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });
});
