export const SUPPORTED_LOCALES = ["en", "es"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const SUPPORTED = new Set<string>(SUPPORTED_LOCALES);

function nonempty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isSupported(tag: string): tag is SupportedLocale {
  return SUPPORTED.has(tag);
}

/** First supported primary tag in Accept-Language q-order, or null. */
export function parseAcceptLanguage(
  header: string | string[] | undefined | null,
): SupportedLocale | null {
  const raw = Array.isArray(header) ? header.join(",") : header;
  if (!raw || !raw.trim()) {
    return null;
  }

  const parts = raw
    .split(",")
    .map((part, index) => {
      const [tagPart, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return { tag: tagPart.trim().toLowerCase(), q: Number.isFinite(q) ? q : 0, index };
    })
    .filter((part) => part.tag.length > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);

  for (const part of parts) {
    if (part.tag === "*") continue;
    const primary = part.tag.split("-")[0] ?? "";
    if (isSupported(primary)) {
      return primary;
    }
  }

  return null;
}

export interface LocalizedVariants {
  en?: string | null;
  es?: string | null;
}

export function parseLocalizedVariants(
  value: unknown,
): LocalizedVariants | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    en: typeof record.en === "string" ? record.en : null,
    es: typeof record.es === "string" ? record.es : null,
  };
}

/**
 * Resolve a localisable string: requested variant, then English/default,
 * then any remaining available variant. Never throws.
 */
export function resolveLocalizedText(
  variants: LocalizedVariants | null | undefined,
  fallback: string | null | undefined,
  requested: SupportedLocale | null,
): string | null {
  const en = nonempty(variants?.en) ?? nonempty(fallback);
  const es = nonempty(variants?.es);

  if (requested === "en" && en) return en;
  if (requested === "es" && es) return es;
  if (en) return en;
  if (es) return es;
  return nonempty(fallback);
}
