import { describe, expect, it } from "vitest";
import {
  grantContextInternalSecondary,
  grantContextLabel,
  grantStatusLabel,
  isGrantActive,
  revokeActionLabel,
} from "./grant-labels";
import type { GrantContextSummary } from "./types";

const social: GrantContextSummary = {
  id: "ctx-1",
  category: "SOCIAL",
  internalName: "E2E Social",
  displayName: "AngelaTech",
};

describe("grant labels", () => {
  it("prefers displayName for Context recognition", () => {
    expect(grantContextLabel(social)).toBe("AngelaTech");
  });

  it("falls back to internalName when displayName is empty", () => {
    expect(
      grantContextLabel({
        ...social,
        displayName: null,
      }),
    ).toBe("E2E Social");
    expect(
      grantContextLabel({
        ...social,
        displayName: "   ",
      }),
    ).toBe("E2E Social");
  });

  it("exposes internal name as secondary only when display name differs", () => {
    expect(grantContextInternalSecondary(social)).toBe("E2E Social");
    expect(
      grantContextInternalSecondary({
        ...social,
        displayName: null,
      }),
    ).toBeNull();
    expect(
      grantContextInternalSecondary({
        ...social,
        displayName: "E2E Social",
      }),
    ).toBeNull();
  });

  it("treats null revokedAt as Active and a timestamp as Revoked", () => {
    expect(isGrantActive({ revokedAt: null })).toBe(true);
    expect(isGrantActive({ revokedAt: "2026-07-31T12:00:00.000Z" })).toBe(false);
    expect(grantStatusLabel({ revokedAt: null })).toBe("Active");
    expect(grantStatusLabel({ revokedAt: "2026-07-31T12:00:00.000Z" })).toBe(
      "Revoked",
    );
  });

  it("builds an accessible revoke action name with application and Context", () => {
    expect(revokeActionLabel("PrymeCab", "AngelaTech")).toBe(
      "Revoke PrymeCab access to AngelaTech",
    );
  });
});
