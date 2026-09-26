import { describe, expect, it } from "vitest";
import {
  activityContextPrimary,
  activityContextSecondary,
} from "./context-label";

describe("activity Context labels", () => {
  const byId = new Map([
    [
      "ctx-1",
      { displayName: "AngelaTech", internalName: "E2E Social" },
    ],
  ]);

  it("uses displayName as the primary label", () => {
    expect(activityContextPrimary("ctx-1", byId)).toBe("AngelaTech");
    expect(activityContextSecondary("ctx-1", byId)).toBe("E2E Social");
  });

  it("falls back to internalName when displayName is absent", () => {
    const map = new Map([
      ["ctx-2", { displayName: null, internalName: "E2E Legal" }],
    ]);
    expect(activityContextPrimary("ctx-2", map)).toBe("E2E Legal");
    expect(activityContextSecondary("ctx-2", map)).toBeNull();
  });

  it("renders a safe fallback for unresolved historical Context ids", () => {
    expect(activityContextPrimary("missing", byId)).toBe("Context unavailable");
    expect(activityContextSecondary("missing", byId)).toBeNull();
    expect(activityContextPrimary(null, byId)).toBe("—");
  });
});
