import { describe, expect, it } from "vitest";
import { resolveAccessFromUserResponse } from "./access-state";

describe("resolveAccessFromUserResponse", () => {
  it("maps access_rejected to access_lost", () => {
    expect(
      resolveAccessFromUserResponse({
        ok: false,
        reason: "access_rejected",
      }),
    ).toEqual({ kind: "access_lost" });
  });

  it("maps missing_token to anonymous", () => {
    expect(
      resolveAccessFromUserResponse({
        ok: false,
        reason: "missing_token",
      }),
    ).toEqual({ kind: "anonymous" });
  });

  it("does not label generic server failure as revocation", () => {
    const state = resolveAccessFromUserResponse({
      ok: false,
      reason: undefined,
    });
    expect(state.kind).toBe("error");
    if (state.kind === "error") {
      expect(state.message).toMatch(/temporary service problem/i);
      expect(state.message).not.toMatch(/revok/i);
    }
  });

  it("keeps network failure distinct from revocation", () => {
    const state = resolveAccessFromUserResponse({
      ok: false,
      networkError: true,
    });
    expect(state.kind).toBe("error");
    if (state.kind === "error") {
      expect(state.message).toMatch(/could not reach/i);
      expect(state.message).not.toMatch(/revok/i);
    }
  });

  it("maps successful profiles", () => {
    const profile = {
      status: "success" as const,
      context: "SOCIAL" as const,
      data: { display_name: "AngelaTech" },
    };
    expect(
      resolveAccessFromUserResponse({
        ok: true,
        profile,
      }),
    ).toEqual({ kind: "profile", profile });
  });
});
