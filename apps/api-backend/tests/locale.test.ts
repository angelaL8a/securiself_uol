import { describe, expect, it } from "vitest";
import { parseAcceptLanguage, resolveLocalizedText } from "../src/lib/locale";

describe("parseAcceptLanguage", () => {
  it("returns null when the header is missing or empty", () => {
    expect(parseAcceptLanguage(undefined)).toBeNull();
    expect(parseAcceptLanguage(null)).toBeNull();
    expect(parseAcceptLanguage("")).toBeNull();
    expect(parseAcceptLanguage("   ")).toBeNull();
  });

  it("returns null for wildcard or unsupported languages", () => {
    expect(parseAcceptLanguage("*")).toBeNull();
    expect(parseAcceptLanguage("fr")).toBeNull();
    expect(parseAcceptLanguage("de-DE,fr;q=0.8")).toBeNull();
  });

  it("selects a supported primary tag", () => {
    expect(parseAcceptLanguage("en")).toBe("en");
    expect(parseAcceptLanguage("es")).toBe("es");
    expect(parseAcceptLanguage("EN")).toBe("en");
  });

  it("collapses region tags to the primary subtag", () => {
    expect(parseAcceptLanguage("en-US")).toBe("en");
    expect(parseAcceptLanguage("es-MX")).toBe("es");
    expect(parseAcceptLanguage("es-419")).toBe("es");
  });

  it("walks quality values and picks the first supported tag", () => {
    expect(parseAcceptLanguage("es-MX,es;q=0.9,en;q=0.8")).toBe("es");
    expect(parseAcceptLanguage("en;q=0.4,es;q=0.9")).toBe("es");
    expect(parseAcceptLanguage("fr,en;q=0.8")).toBe("en");
    expect(parseAcceptLanguage("fr;q=1,es;q=0.2")).toBe("es");
  });

  it("joins array headers the same way Express may provide them", () => {
    expect(parseAcceptLanguage(["fr", "es;q=0.8"])).toBe("es");
  });
});

describe("resolveLocalizedText", () => {
  const both = { en: "Founder", es: "Fundadora" };

  it("returns the requested variant when it has text", () => {
    expect(resolveLocalizedText(both, "Founder", "es")).toBe("Fundadora");
    expect(resolveLocalizedText(both, "Founder", "en")).toBe("Founder");
  });

  it("falls back to default English when the requested variant is missing", () => {
    expect(resolveLocalizedText({ en: "Founder" }, "Founder", "es")).toBe(
      "Founder",
    );
    expect(resolveLocalizedText(null, "Founder", "es")).toBe("Founder");
  });

  it("falls back to default when the header is missing or unsupported", () => {
    expect(resolveLocalizedText(both, "Founder", null)).toBe("Founder");
  });

  it("uses the only available variant when English is empty", () => {
    expect(resolveLocalizedText({ es: "Fundadora" }, null, "en")).toBe(
      "Fundadora",
    );
    expect(resolveLocalizedText({ es: "Fundadora" }, null, null)).toBe(
      "Fundadora",
    );
  });

  it("treats whitespace-only values as missing", () => {
    expect(resolveLocalizedText({ en: "  ", es: "Fundadora" }, "  ", "en")).toBe(
      "Fundadora",
    );
  });

  it("returns null when nothing is available", () => {
    expect(resolveLocalizedText(null, null, "es")).toBeNull();
    expect(resolveLocalizedText({ en: "", es: "  " }, null, "es")).toBeNull();
  });
});
