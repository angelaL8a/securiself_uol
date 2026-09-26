import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/auth-store";
import { fetchGrants, revokeGrant } from "./api";

function mockResponse(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: "",
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

describe("grants api", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({
      token: "session-token",
      user: null,
      hydrated: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("unwraps the Grant list envelope", async () => {
    const grant = {
      id: "g1",
      scope: "identity_context",
      expiresAt: null,
      revokedAt: null,
      createdAt: "2026-07-01T10:00:00.000Z",
      application: {
        id: "a1",
        userId: "u1",
        name: "PrymeCab",
        clientId: "scs_x",
        redirectUri: "http://localhost:3001/callback",
        createdAt: "2026-07-01T09:00:00.000Z",
        updatedAt: "2026-07-01T09:00:00.000Z",
      },
      context: {
        id: "c1",
        category: "SOCIAL",
        internalName: "Social",
        displayName: "AngelaTech",
      },
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse(200, { status: "success", data: [grant] }),
    );

    await expect(fetchGrants()).resolves.toEqual([grant]);
  });

  it("posts revoke without returning a Grant body", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        mockResponse(200, { status: "success", message: "Grant revoked" }),
      );

    await expect(revokeGrant("grant-1")).resolves.toBeUndefined();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "/api/v1/grants/grant-1/revoke",
    );
  });
});
