import { describe, expect, it } from "vitest";
import { profilesMeHeaders } from "./profiles-me-headers";

describe("profilesMeHeaders", () => {
  it("always sends the bearer token", () => {
    expect(profilesMeHeaders("tok_abc")).toEqual({
      Authorization: "Bearer tok_abc",
    });
  });

  it("forwards Accept-Language when the client requested one", () => {
    expect(profilesMeHeaders("tok_abc", "es")).toEqual({
      Authorization: "Bearer tok_abc",
      "Accept-Language": "es",
    });
  });

  it("omits Accept-Language when it is missing or blank", () => {
    expect(profilesMeHeaders("tok_abc", null)).not.toHaveProperty(
      "Accept-Language",
    );
    expect(profilesMeHeaders("tok_abc", "  ")).not.toHaveProperty(
      "Accept-Language",
    );
  });
});
