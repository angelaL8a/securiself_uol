# Sprint 3 multilingual automated validation

## Purpose

This document records automated evidence for the current Sprint 3 multilingual Context implementation: storing `en`/`es` variants on localisable fields, resolving them on `GET /api/v1/profiles/me` from `Accept-Language`, and keeping category privacy and token-bound context unchanged.

## Implemented multilingual scope

Source: `apps/api-backend/src/lib/locale.ts`, `apps/api-backend/src/modules/profiles/profiles.service.ts`, `apps/securiself-platform/src/features/contexts/context-rules.ts`.

- **Categories with localisable fields:** PROFESSIONAL (`pronouns`, `jobTitle`, `shortBio` — all disclosed), SOCIAL (`pronouns` disclosed), PRIVATE (`pronouns` disclosed; `shortBio` may be stored, not disclosed). LEGAL has no localisable fields.
- **Localisable fields:** `pronouns`, `jobTitle`, `shortBio`.
- **Language-independent fields:** `internalName`, `displayName`, `username`, `company`, `documentId`, `avatarUrl`.
- **Supported languages:** `en` and `es`. Storage is the English/default scalar plus `*I18n` JSON `{ en?, es? }`.
- **`Accept-Language`:** `parseAcceptLanguage` takes the first supported primary tag in q-order; region tags collapse (`es-MX` → `es`). Missing, empty, `*`, or unsupported tags yield no requested locale.
- **Fallback (`resolveLocalizedText`, per field):** requested variant if non-empty → English/default scalar → remaining available variant → `null`. Empty resolved pronouns become `"hidden"`. Language substitution runs only on fields already allowed by the category filter.

## Existing automated coverage reviewed

| File | Sprint 3 behaviour already covered |
| --- | --- |
| `apps/api-backend/tests/locale.test.ts` | Header parse: missing/`*`/unsupported → null; `en`/`es` selection; region collapse; q-value order. Per-value fallback including Spanish-only and whitespace-as-missing. |
| `apps/api-backend/tests/localization.test.ts` | Persist PROFESSIONAL `pronounsI18n`/`jobTitleI18n`/`shortBioI18n`. `/profiles/me` with `es`/`en`/omitted/`fr`/`es-MX`. Per-field fallback when Spanish is missing or is the only variant. SOCIAL `es` pronouns without `short_bio`. |
| `apps/api-backend/tests/privacy.test.ts` | Category allow-lists without a language header (SOCIAL, PROFESSIONAL, LEGAL, PRIVATE), including PRIVATE omitting `short_bio`. |
| `apps/securiself-platform/src/features/contexts/schemas.test.ts` | Form payload emits PROFESSIONAL `pronounsI18n`/`jobTitleI18n`/`shortBioI18n`; SOCIAL has `pronounsI18n` and no `jobTitleI18n`/`shortBioI18n`. |
| `apps/prymecab-simulator/lib/profiles-me-headers.test.ts` | BFF forwards `Accept-Language` when present and omits it when blank. |
| `tests/e2e/specs/localization.spec.ts` | Same PROFESSIONAL grant: `en` vs `es` via PrymeCab; Spanish `pronouns`/`job_title`/`short_bio`; stable `company`. **Not executed in this run** (see Final automated results). |

## Coverage assessment

Existing coverage was sufficient for locale parsing, PROFESSIONAL persistence and profile language, SOCIAL language + privacy, per-field fallback, platform payload maps, and PrymeCab header forwarding.

Two meaningful gaps remained:

1. PRIVATE has localisable `pronouns` (and stored, undisclosed `shortBio`) but had no language-header profile test.
2. The same-token PROFESSIONAL case did not assert that `body.context` stays `PROFESSIONAL` across `en`/`es`/`fr`/omitted.

No LEGAL language test was added: LEGAL has no localisable fields, and `privacy.test.ts` already locks its allow-list.

**Tests added** (in the existing localization file only):

- `returns Spanish pronouns for PRIVATE without disclosing short_bio` — `Accept-Language: es` returns Spanish pronouns, omits `short_bio`, and keeps `PRIVATE_FORBIDDEN_FIELDS`.
- Assertions on the existing same-token case that `body.context` is `"PROFESSIONAL"` for `en`, omitted, `fr`, and `es-MX`.

## Final automated results

Commands and counts are taken from the Vitest runner. No counts were estimated.

### `api-backend`

```
pnpm --filter api-backend test tests/locale.test.ts tests/localization.test.ts tests/privacy.test.ts
```

Files: `tests/locale.test.ts`, `tests/localization.test.ts`, `tests/privacy.test.ts`.

```
Test Files  3 passed (3)
     Tests  26 passed (26)
```

Failed: 0.

Sprint 3-specific: localization suite includes PROFESSIONAL/SOCIAL/PRIVATE `Accept-Language` cases and the same-token context-stability asserts.

### `securiself-platform`

```
pnpm --filter securiself-platform test src/features/contexts/schemas.test.ts
```

File: `src/features/contexts/schemas.test.ts`.

```
Test Files  1 passed (1)
     Tests  8 passed (8)
```

Failed: 0.

Sprint 3-specific cases in that file: SOCIAL payload omits `jobTitleI18n`/`shortBioI18n`; PROFESSIONAL payload emits all three `*I18n` maps.

### `prymecab-simulator`

```
pnpm --filter prymecab-simulator test lib/profiles-me-headers.test.ts
```

File: `lib/profiles-me-headers.test.ts`.

```
Test Files  1 passed (1)
     Tests  3 passed (3)
```

Failed: 0.

Sprint 3-specific: forwards `Accept-Language` when the client requested one; omits it when missing or blank.

### E2E

`tests/e2e/specs/localization.spec.ts` was **not run**. Ports 8080, 3000, and 3001 were already listening (`node` PIDs 36074, 39149, 22333). No E2E pass or fail is claimed.

## Validated behaviours

| Behaviour | Automated evidence |
| --- | --- |
| Variants stored and returned on Context CRUD | `localization.test.ts` — stores language variants; plain `shortBio` still accepted; Spanish update syncs English from `shortBioI18n.en` |
| `en` / `es` handling | `locale.test.ts` (primary tags); `localization.test.ts` (`en` vs `es` vs `es-MX`) |
| Categories that disclose localisable fields | PROFESSIONAL, SOCIAL, and PRIVATE cases in `localization.test.ts` |
| All localisable fields, not only `shortBio` | PROFESSIONAL `es` asserts `pronouns`, `job_title`, and `short_bio`; SOCIAL/PRIVATE `es` assert `pronouns` |
| `GET /profiles/me` interprets `Accept-Language` | `localization.test.ts` (`GET /profiles/me Accept-Language`) |
| Requested `en` returns English when available | Same-token case, `Accept-Language: en` |
| Requested `es` returns Spanish when available | PROFESSIONAL/SOCIAL/PRIVATE `es` cases; `es-MX` collapses to Spanish |
| Several localisable fields in one response | PROFESSIONAL `es`: pronouns, job title, and short bio together |
| Language-independent fields unchanged | PROFESSIONAL `es` keeps `display_name` and `company` |
| Unsupported language uses fallback | Same-token `fr`; `locale.test.ts` (`*` / `fr`) |
| Missing translation on one field does not rewrite others | `falls back per field when only some Spanish variants exist` |
| Spanish-only variant still returned | `falls back to Spanish when that is the only available variant`; `locale.test.ts` |
| Missing `Accept-Language` uses default | Same-token omitted header; `locale.test.ts` missing/empty → null |
| Language does not change authorised context | Same-token asserts `body.context === "PROFESSIONAL"` for `en` / omitted / `fr` / `es-MX` |
| Language does not disclose forbidden fields | SOCIAL and PRIVATE `es` + `expectNoForbiddenFields`; `privacy.test.ts` allow-lists without a language header |
| Context-bound access unchanged | `privacy.test.ts` category payloads; same-token context remains PROFESSIONAL |
| Platform form emits `*I18n` maps | `schemas.test.ts` PROFESSIONAL maps; SOCIAL has no job-title/bio i18n |
| PrymeCab forwards `Accept-Language` | `profiles-me-headers.test.ts` |

Browser E2E through PrymeCab is **not** in this evidence set (ports occupied).

## Conclusion

The listed unit/integration suites passed: **26** api-backend tests, **8** platform schema tests, and **3** PrymeCab header tests, with **0** failures. Together they exercise storage of `en`/`es` variants, `Accept-Language` resolution and fallback on `GET /api/v1/profiles/me`, localisable fields on PROFESSIONAL, SOCIAL, and PRIVATE, and the rule that language does not change the authorised context or the category allow-list.

Limitation: Playwright `tests/e2e/specs/localization.spec.ts` was not executed in this run because ports 8080, 3000, and 3001 were already in use.
