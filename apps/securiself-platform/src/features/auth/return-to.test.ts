import { describe, expect, it } from "vitest";
import { routes } from "@/lib/routes";
import { resolveReturnTo } from "./hooks";

describe("resolveReturnTo (shared by password and Google auth)", () => {
  it("preserves the PrymeCab -> SecuriSelf consent URL", () => {
    const consent =
      "/oauth/authorize?client_id=scs_e2e_prymecab_client" +
      "&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fauth%2Fcallback" +
      "&response_type=code&scope=identity_context";

    expect(resolveReturnTo(consent)).toBe(consent);
  });

  it("falls back to the console when no returnTo is present", () => {
    expect(resolveReturnTo(null)).toBe(routes.console.root);
    expect(resolveReturnTo(undefined)).toBe(routes.console.root);
    expect(resolveReturnTo("")).toBe(routes.console.root);
  });

  it("rejects external and protocol-relative redirects", () => {
    expect(resolveReturnTo("https://evil.test/steal")).toBe(routes.console.root);
    expect(resolveReturnTo("//evil.test/steal")).toBe(routes.console.root);
    expect(resolveReturnTo("/\\evil.test/steal")).toBe(routes.console.root);
  });
});
