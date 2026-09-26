# Sprint 3 final summary

SecuriSelf — multilingual Context information  
Technical record of what was implemented and validated.  
Sources: current implementation, `docs/sprint3/multilanguage-automated-validation.md`, `docs/sprint3/multilanguage-e2e-evidence.md`, and `docs/sprint3/SecuriSelf_Sprint3_External_Test_Pack/`.

---

## 1. Sprint 3 objective

Earlier sprints established **contextual identity**: a user keeps a private root identity (the Vault) and creates purpose-bound **Contexts** (Professional, Legal, Social, Private). A third-party application may receive only the fields allowed by the Context the user authorised. That permission is recorded as a **Grant** and enforced by a context-bound access token.

Sprint 3 addressed a narrower gap: some of those already-permitted fields are language-dependent (for example a job title or a short biography), but the product previously stored a single text value. A Professional Context shared with a Spanish-speaking app still had to send English wording, or the owner would have needed a second Context — which would have been a second permission, not a translation.

The intended rule is:

**the same authorised Context can be presented in different supported languages without changing which identity information the third-party application is allowed to receive.**

Implemented languages: **English (`en`)** and **Spanish (`es`)**.  
Localisable fields in the final code: **pronouns**, **job title**, and **short biography**.  
The rest of the SecuriSelf and PrymeCab interface remains in English. This sprint did not translate chrome, navigation, or legal identity fields.

---

## 2. What was implemented

### Context configuration

On the existing Context create/edit screen, categories that have localisable fields show a single **English | Español** control. Switching that control changes the editable values for the localisable fields of *that* category. It does not create a second Context.

**Localisable fields** (language-specific text):

| Category | Localisable fields | Disclosed on `/profiles/me` |
| --- | --- | --- |
| PROFESSIONAL | pronouns, job title, short biography | all three |
| SOCIAL | pronouns | pronouns only |
| PRIVATE | pronouns, short biography | pronouns only (`shortBio` may be stored, not disclosed) |
| LEGAL | none | — |

**Language-independent fields** stay visible regardless of the tab: internal name, display name, username, company, document ID, and avatar URL, according to the category form.

### Third-party language selection

The identity owner still chooses **which Context** to authorise. The consuming application then asks for a preferred language when it reads the already-authorised profile.

It does this with the standard HTTP header **`Accept-Language`** on:

`GET /api/v1/profiles/me`

Language selection does not create a new Context or a new Grant. The token remains bound to the Context approved at consent.

### Fallback

If a requested translation is missing, SecuriSelf still returns a successful profile. Fallback is **per field**, so a missing Spanish job title does not wipe Spanish pronouns or biography.

Order used in the final code, for each field:

1. the requested language, if that value is non-empty;
2. otherwise the English/default scalar;
3. otherwise any remaining stored variant;
4. otherwise empty (`null`; empty pronouns become `"hidden"`).

Missing, empty, wildcard (`*`), or unsupported languages (for example `fr`) are treated as “no requested language” and follow the same English-then-remaining path.

### PrymeCab

PrymeCab is the existing third-party simulator. After the owner authorises a **PROFESSIONAL** Context, PrymeCab shows **EN** and **ES** on the profile card. Choosing one forwards `Accept-Language` through its server route to SecuriSelf. Localisable values change; language-independent values such as company stay the same; the badge remains PROFESSIONAL.

---

## 3. How the implementation works

```
Context stores language variants
  → third party sends Accept-Language
  → backend determines requested language
  → backend resolves each localisable value
  → existing Context privacy filter decides which fields may leave the API
  → third party receives the language-specific filtered profile
```

Each Context stores an English/default column plus an optional JSON map (`pronounsI18n`, `jobTitleI18n`, `shortBioI18n`) of the form `{ en?, es? }`.

When `/profiles/me` is called, the access token already identifies one user, one application, and one Context. The handler reads `Accept-Language`, picks `en` or `es` (or none), then fills only the fields that category already allows. Language substitution happens **inside** that allow-list.

> Changing the requested language may change the value of a permitted field, but it must never change which fields the authorised Context permits.

---

## 4. Important code

### Requested language

File: `apps/api-backend/src/lib/locale.ts`

```typescript
export function parseAcceptLanguage(
  header: string | string[] | undefined | null,
): SupportedLocale | null {
  // …split on commas, sort by quality (q) then original order…
  for (const part of parts) {
    if (part.tag === "*") continue;
    const primary = part.tag.split("-")[0] ?? "";
    if (isSupported(primary)) {
      return primary;
    }
  }
  return null;
}
```

This reads the `Accept-Language` header and returns the first supported primary tag (`en` or `es`). Regional tags collapse (`es-MX` → `es`). Missing, empty, `*`, or unsupported tags return no requested language.

File: `apps/api-backend/src/modules/profiles/profiles.routes.ts`

```typescript
parseAcceptLanguage(req.headers["accept-language"]),
```

The profile route passes that result into the existing read path. The token still supplies the Context; the header only supplies a language preference.

### Per-field resolution

File: `apps/api-backend/src/lib/locale.ts`

```typescript
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
```

This examines one field at a time: requested variant if present, then English/default, then the other stored variant. A missing Spanish job title therefore cannot remove Spanish pronouns or biography.

### Privacy filter still decides the field list

File: `apps/api-backend/src/modules/profiles/profiles.service.ts`

```typescript
case "PROFESSIONAL":
  return {
    status: "success",
    context: context.category,
    data: {
      display_name: context.displayName,
      pronouns,
      job_title: localized(context.jobTitle, context.jobTitleI18n, locale),
      company: context.company,
      short_bio: localized(context.shortBio, context.shortBioI18n, locale),
      avatar_url: context.avatarUrl,
    },
  };
```

`filterProfile` still switches on Context category. Only PROFESSIONAL includes `job_title` and `short_bio`. SOCIAL and PRIVATE localise pronouns but never add those extra fields. `display_name` and `company` are copied as stored, not localised.

### Clearing a Spanish value must persist as missing

File: `apps/securiself-platform/src/features/contexts/schemas.ts`

```typescript
payload[i18nKey] =
  en || es
    ? {
        ...(en ? { en } : {}),
        es: es ? es : null,
      }
    : null;
```

During E2E validation, clearing Español and saving still left the old Spanish text: empty Spanish was omitted from the payload, and the API treated a missing `es` key as “keep the previous value”. The form now sends `es: null` when Español is empty so a cleared translation is stored as absent and fallback can run.

### PrymeCab forwards the header

File: `apps/prymecab-simulator/lib/profiles-me-headers.ts`

```typescript
export function profilesMeHeaders(
  accessToken: string,
  acceptLanguage?: string | null,
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  const language = acceptLanguage?.trim();
  if (language) {
    headers["Accept-Language"] = language;
  }
  return headers;
}
```

PrymeCab’s backend-for-frontend still sends the bearer token. If the user selected EN or ES, it also forwards `Accept-Language`. A blank choice omits the header, which follows the default/fallback path on the API.

---

## 5. Privacy and Context behaviour

Sprint 3 did not change how consent, Grants, or tokens work.

A PROFESSIONAL token remains a PROFESSIONAL token whether PrymeCab requests English, Spanish, or an unsupported language. Automated tests reused one access token and asserted `body.context` stayed `"PROFESSIONAL"` for `en`, omitted header, `fr`, and `es-MX`.

Language substitution runs only on fields already on the category allow-list. SOCIAL and PRIVATE Spanish responses still omit `short_bio`. Privacy tests without a language header still lock SOCIAL, PROFESSIONAL, LEGAL, and PRIVATE allow-lists, including PRIVATE omitting `short_bio`. Root email and legal identity outside LEGAL were not added to those payloads.

The tests do not claim that every security property of Sprints 1–2 was re-proved; they show that adding language selection did not change the authorised Context or the recorded category field lists.

---

## 6. Evaluation

### 6.1 Automated code-level validation

Recorded in `docs/sprint3/multilanguage-automated-validation.md`. These are Vitest/Supertest and component tests, not browser E2E.

| Command | Result |
| --- | --- |
| `pnpm --filter api-backend test tests/locale.test.ts tests/localization.test.ts tests/privacy.test.ts` | 3 files, **26 passed**, 0 failed |
| `pnpm --filter securiself-platform test src/features/contexts/schemas.test.ts` | 1 file, **8 passed**, 0 failed |
| `pnpm --filter prymecab-simulator test lib/profiles-me-headers.test.ts` | 1 file, **3 passed**, 0 failed |

That recorded run covered:

- storing `en` / `es` maps on Context create/update;
- parsing `Accept-Language` (q-values, `es-MX`, missing/`*`/`fr`);
- English and Spanish selection on `GET /profiles/me`;
- per-field fallback and Spanish-only fallback;
- language-independent `display_name` and `company` unchanged;
- authorised context remaining `PROFESSIONAL` across `en` / omitted / `fr` / `es-MX`;
- SOCIAL and PRIVATE Spanish pronouns without disclosing `short_bio`;
- Platform form payloads emitting PROFESSIONAL `*I18n` maps and omitting SOCIAL job-title/bio i18n;
- PrymeCab forwarding or omitting `Accept-Language`.

The later `es: null` persist correction is in the form payload code and is exercised by the browser fallback scenario in §6.2. It is not counted inside the recorded **8** platform schema tests above.

### 6.2 Browser / E2E validation

Recorded in `docs/sprint3/multilanguage-e2e-evidence.md`.

```
pnpm test:e2e:prepare && pnpm exec playwright test tests/e2e/specs/localization.spec.ts
Running 3 tests using 1 worker
  3 passed (33.2s)
```

Failed: 0. File: `tests/e2e/specs/localization.spec.ts`.

The browser flow demonstrated entering English and Spanish values, switching **English | Español**, saving, reloading, persistence, PrymeCab English, the same authorised PROFESSIONAL Context in Spanish, and per-field fallback after the Spanish job title was cleared.

Screenshots under `docs/sprint3/images/multilanguage-e2e/`:

- `01-context-multilingual-input.png` — English tab, three localisable fields, company unchanged  
- `02-context-spanish-values.png` — Español after save and reload  
- `04-prymecab-english-profile.png` — PROFESSIONAL card, **EN**, `she/her` / `Software Engineer` / `SecuriSelf` / `Founder`  
- `05-prymecab-spanish-profile.png` — same card, **ES**, `ella` / `Ingeniera de software` / `Fundadora`  
- `06-language-fallback.png` — **ES**, English job title, Spanish pronouns and bio still visible  

### 6.3 External user evaluation

Recorded in `docs/sprint3/SecuriSelf_Sprint3_External_Test_Pack/` (P01–P03 instruction and observation sheets, plus the pack summary). Date: 17 August 2026. Three anonymised participants. Participant wording in the sheets is paraphrased.

Each person used an existing Professional Context and completed the same sequence: find the language controls, enter or review English and Spanish values, save and reload, view the authorised profile in PrymeCab in both languages, and interpret a missing Spanish translation.

Three post-task questions:

- **Q1 Comprehension** — what changes when switching English / Español  
- **Q2 Usability** — how easy it was to enter, switch, save, and revisit  
- **Q3 Accessibility and clarity** — whether controls and labels were clear without colour alone  

| Measure | P01 | P02 | P03 |
| --- | --- | --- | --- |
| Completed tasks without assistance | Yes | Yes | Yes |
| Understood EN/ES as variants of the same Context | Yes | Yes | Yes |
| Found the interaction easy to use | Very easy | Easy | Very easy |
| Reported a usability/accessibility blocker | No | No | No |

All three described language switching as changing language-specific text for one authorised Context, not a new profile or permission. No facilitator assistance was required.

This is a three-person review of perceived usability and clarity. It is **not** a WCAG conformance assessment and does not replace testing with assistive technology.

---

## 7. Evaluation summary

| Evaluation layer | What it checked | Final result | What it establishes |
| --- | --- | --- | --- |
| Automated backend/component tests | Storage, `Accept-Language`, fallback, context stability, category privacy, Platform `*I18n` payloads, PrymeCab header forwarding | 26 + 8 + 3 passed, 0 failed | Language selection works at the API and payload layer without changing allow-lists |
| Browser E2E | Editor EN/ES, persist, PrymeCab EN vs ES, missing Spanish job title | 3 passed (33.2s), 0 failed | The observable owner and third-party flow matches the implemented behaviour |
| External participant evaluation | Comprehension, usability, perceived accessibility of the same flow | 3/3 completed unassisted; no recorded blocker | The interaction was understood and judged easy or very easy by these three participants; not formal accessibility certification |

---

## 8. Sprint 3 outcome

Sprint 3 achieved its intended aim for the defined scope.

The combined evidence shows that SecuriSelf can store English and Spanish Context text, that owners can edit and persist those variants in the existing Context screen, that a third party can request a language on the already-authorised profile, and that English and Spanish values are delivered without changing the Grant or the field allow-list. Per-field fallback is both implemented and visible when a Spanish job title is absent. PrymeCab makes that path observable. Three external participants completed the flow without assistance and understood that language does not create a second permission.

---

## 9. Remaining gaps

No unresolved defect was identified within the defined Sprint 3 scope. The implemented English/Spanish Context variants, fallback behaviour, and third-party consumption path were covered by automated tests, browser E2E validation, and participant evaluation.

Scope boundaries (not Sprint 3 failures):

- only `en` and `es` are supported;
- SecuriSelf and PrymeCab chrome stay English;
- LEGAL has no localisable fields because its disclosed values are not language-dependent in the current model.

---

## 10. Next iteration

Sprint 3 closes the multilingual Context iteration. The next planned implementation iteration will focus on **Google Sign-In / federated authentication**.
