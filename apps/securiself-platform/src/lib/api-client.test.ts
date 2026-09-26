import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/auth-store";
import { routes } from "@/lib/routes";
import { ApiError, apiClient } from "./api-client";

interface MockResponseInit {
  status: number;
  body?: unknown;
}

function mockResponse({ status, body }: MockResponseInit) {
  const text = body === undefined ? "" : JSON.stringify(body);
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: "",
    text: () => Promise.resolve(text),
  } as Response;
}

describe("api client", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({ token: null, user: null, hydrated: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("attaches the bearer token to authenticated requests", async () => {
    useAuthStore.getState().setSession("secret-token", null);
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockResponse({ status: 200, body: { ok: true } }));

    await apiClient.get("/api/v1/vault");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]?.[1];
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer secret-token");
  });

  it("does not attach a token when auth is disabled", async () => {
    useAuthStore.getState().setSession("secret-token", null);
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(mockResponse({ status: 200, body: {} }));

    await apiClient.post("/api/v1/auth/login", { email: "a" }, { auth: false });

    const init = fetchMock.mock.calls[0]?.[1];
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("does not clear the session or redirect when an unauthenticated request is rejected", async () => {
    // Sprint 4 F-1: a 401 from /auth/google (or /auth/login) is a rejected
    // credential, not an expired session. The global handler must stay out of
    // the way so the caller's error toast survives on the Sign In page.
    const assign = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      pathname: routes.signIn,
      search: "",
      assign,
    } as unknown as Location);
    useAuthStore.getState().setSession("existing-token", null);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({
        status: 401,
        body: { status: "error", message: "Invalid Google credential" },
      }),
    );

    await expect(
      apiClient.post(
        "/api/v1/auth/google",
        { credential: "tampered" },
        { auth: false },
      ),
    ).rejects.toMatchObject({ status: 401, message: "Invalid Google credential" });

    expect(assign).not.toHaveBeenCalled();
    expect(useAuthStore.getState().token).toBe("existing-token");
  });

  it("still clears the session and redirects when an authenticated request expires", async () => {
    const assign = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      pathname: "/console/vault",
      search: "",
      assign,
    } as unknown as Location);
    useAuthStore.getState().setSession("expired-token", null);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({
        status: 401,
        body: { status: "error", message: "Unauthorized" },
      }),
    );

    await expect(apiClient.get("/api/v1/vault")).rejects.toMatchObject({
      status: 401,
    });

    expect(useAuthStore.getState().token).toBeNull();
    expect(assign).toHaveBeenCalledWith(
      `${routes.signIn}?returnTo=${encodeURIComponent("/console/vault")}`,
    );
  });

  it("returns undefined for 204 responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({ status: 204 }),
    );
    const result = await apiClient.delete("/api/v1/contexts/abc");
    expect(result).toBeUndefined();
  });

  it("throws a typed ApiError that preserves the backend message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({
        status: 400,
        body: { status: "error", message: "Validation failed" },
      }),
    );

    await expect(apiClient.post("/api/v1/contexts", {})).rejects.toMatchObject({
      status: 400,
      message: "Validation failed",
    });
    await expect(apiClient.post("/api/v1/contexts", {})).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});
