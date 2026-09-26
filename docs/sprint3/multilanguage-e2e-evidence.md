# Sprint 3 multilingual E2E evidence

## Purpose

This document records browser evidence for the Sprint 3 multilingual flow: entering `en`/`es` values on a PROFESSIONAL Context, persisting them, consuming the same authorised Context from PrymeCab in each language, and applying per-field fallback when a Spanish translation is missing.

## E2E coverage reviewed

Existing: [`tests/e2e/specs/localization.spec.ts`](../../tests/e2e/specs/localization.spec.ts) already authorised PROFESSIONAL in PrymeCab and showed English vs Spanish `pronouns`, `job_title`, and `short_bio` with stable `company`. It did not open the Context editor, persist after reload, or exercise a missing translation.

Added in that same spec:

- `enters English and Spanish values and keeps them after reload` — English | Español tabs, all three localisable fields, company unchanged, save and reload.
- `falls back per field when Spanish job title is missing` — clear Spanish job title, same PROFESSIONAL grant, `es` still returns Spanish pronouns/bio and English job title.

The original PrymeCab English/Spanish test was kept and now captures screenshots.

A bounded form-payload fix was required for the fallback case: empty Español values now persist as `es: null` instead of being omitted (which previously left the old Spanish text in place). See [`toContextPayload`](../../apps/securiself-platform/src/features/contexts/schemas.ts).

## Final E2E result

Command:

```
pnpm test:e2e:prepare && pnpm exec playwright test tests/e2e/specs/localization.spec.ts
```

File: `tests/e2e/specs/localization.spec.ts`

Runner:

```
Running 3 tests using 1 worker
  ✓  enters English and Spanish values and keeps them after reload
  ✓  returns the same authorised profile in English and Spanish
  ✓  falls back per field when Spanish job title is missing
  3 passed (33.2s)
```

Failed: 0.

## Visual evidence

Images: `docs/sprint3/images/multilanguage-e2e/`.

**Filename:** `01-context-multilingual-input.png`

**Action:** Signed in to the console, opened E2E Professional, filled English pronouns, job title, and short bio.

**Observed state:** English tab selected. Pronouns `she/her`, job title `Software Engineer`, short bio `Founder`. Company `SecuriSelf` is above the language tabs. Payload preview is PROFESSIONAL.

**Demonstrates:** Multilingual input for the three PROFESSIONAL localisable fields, with language-independent company beside them.

**Filename:** `02-context-spanish-values.png`

**Action:** Filled Spanish variants, saved, reloaded the same Context, selected Español.

**Observed state:** Español tab selected. Pronouns `ella`, job title `Ingeniera de software`. Internal name, display name, and company remain `E2E Professional` / `Angela Lozano` / `SecuriSelf`.

**Demonstrates:** Language switching in the editor and persistence of Spanish values after save and reload.

**Filename:** `04-prymecab-english-profile.png`

**Action:** Approved the seeded PROFESSIONAL Context in the PrymeCab consent flow. Default locale is English.

**Observed state:** Full PrymeCab profile card for Angela Lozano, badge PROFESSIONAL, **EN** selected. Pronouns `she/her`, job title `Software Engineer`, company `SecuriSelf`, bio `Founder`. Log out is visible at the bottom of the card.

**Demonstrates:** Third-party consumption of the authorised Context in English, including all disclosed localisable fields.

**Filename:** `05-prymecab-spanish-profile.png`

**Action:** On the same authorised session, clicked **ES**.

**Observed state:** Same card, **ES** selected. Pronouns `ella`, job title `Ingeniera de software`, company `SecuriSelf`, bio `Fundadora`. Badge remains PROFESSIONAL.

**Demonstrates:** Same authorised Context, Spanish requested, Spanish localised values; company unchanged.

**Filename:** `06-language-fallback.png`

**Action:** Cleared Spanish job title on the Context, saved, authorised PROFESSIONAL again, selected **ES**.

**Observed state:** **ES** selected. Pronouns `ella`, job title `Software Engineer` (English), company `SecuriSelf`, bio `Fundadora`. Badge remains PROFESSIONAL.

**Demonstrates:** Request still succeeds; missing Spanish job title falls back to English; other Spanish fields remain visible.

## Demonstrated flow

`Context multilingual input → save/persistence → language-specific third-party consumption → fallback`

## Conclusion

The Playwright run passed **3** tests with **0** failures. The screenshots show PROFESSIONAL English and Spanish editor values surviving reload, PrymeCab serving those values for the same grant, and per-field fallback when Spanish job title is absent.
