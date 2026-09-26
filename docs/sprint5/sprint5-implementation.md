# Sprint 5 — Integrated Developer Documentation

## 1. Sprint 5 objective

### The state before Sprint 5

By the end of Sprint 4 the SecuriSelf integration contract was complete and exercised end to end. The API backend implemented the OAuth-like authorization-code flow (`apps/api-backend/src/modules/oauth/oauth.service.ts`), context-bound access tokens (`apps/api-backend/src/middleware/requireBearerToken.ts`), the privacy filter that produces the third-party payload (`apps/api-backend/src/modules/profiles/profiles.service.ts`), `Accept-Language` resolution (`apps/api-backend/src/lib/locale.ts`), Grants with idempotent revocation (`apps/api-backend/src/modules/grants/grants.service.ts`) and Google sign-in. The Console already let an identity owner register applications, read credentials, inspect Contexts, review Grants and audit Activity, and the PrymeCab simulator (`apps/prymecab-simulator`) already consumed the flow as a real third party.

The gap was not behavioural but epistemic. Every fact a third-party developer needs — that the authorization request must go to the Platform and not the API, that `redirect_uri` is compared by exact string equality, that the token endpoint takes a JSON body, that an authorization code is single-use with a five-minute default TTL, that there is no refresh token, that `pronouns` resolves to the literal string `"hidden"` rather than `null`, that revocation surfaces as `401 Access token has been revoked` — existed only inside the source code, the Prisma schema, the Zod schemas, the test suite and the PrymeCab implementation. Reproducing the integration therefore required read access to the repository. That is an acceptable state for an internal reference application and an unacceptable one for a platform whose product claim is that third parties can consume identity data under user-selected constraints.

### Objective

Sprint 5's objective was to make the existing integration contract understandable from inside the product: an authenticated Developer Docs surface in the Console that carries a third-party developer from application registration to a successful context-bound profile read, including the failure and revocation paths, without requiring access to the SecuriSelf or PrymeCab source.

### Scope boundaries

Sprint 5 added no runtime behaviour to the integration. It did not implement or modify the OAuth flow, the privacy filter, Context categories, localization, Grants, revocation, Google authentication or the PrymeCab simulator; all of those were pre-existing and were treated as the specification the documentation had to match. Outside the new feature directory and route, the Sprint touched three files: a navigation entry in `console-sidebar.tsx`, a route constant in `routes.ts`, and one additive optional prop (`copyLabel`) on the shared `PayloadPreview` component. No backend file was modified.

## 2. Implemented improvement

The Sprint added an authenticated route at `/console/docs`, registered in `apps/securiself-platform/src/lib/routes.ts` as `routes.console.docs` and surfaced in the Console sidebar as a `Developer Docs` entry between `Clients` and `Grants` — that is, at the point in the navigation where a developer who has just registered an application would look next.

The page itself (`apps/securiself-platform/src/features/developer-docs/components/developer-docs.tsx`) presents twelve sections in the order in which an integrator encounters them, defined once in `DOCS_SECTIONS`:

1. **Overview** — the Context model, the Vault exclusion, and a six-step summary of the flow.
2. **Register an application** — what registration takes and returns, exact-string redirect-URI matching, and secret rotation semantics.
3. **Credentials and the security boundary** — a table classifying `client_id`, `redirect_uri`, authorization code, `client_secret`, `access_token` and the SecuriSelf session JWT by where each may legitimately appear.
4. **Authorization request** — the Platform (not API) authorization endpoint, its four query parameters, and what the identity owner sees, including denial.
5. **Authorization code callback** — the `?code=` return, single-use semantics, `AUTH_CODE_TTL_MINUTES`, and a callback handler example.
6. **Server-side token exchange** — the JSON body, a fetch and a cURL example, the response envelope, and the enumerated rejection conditions.
7. **Retrieve the context-bound profile** — the bearer request, the response envelope built from a real payload builder, and the `PROFILE_READ` audit consequence.
8. **Context payload reference** — one tab per Context category, each rendering the payload that category actually discloses plus its disclosure matrix.
9. **Localization and `Accept-Language`** — supported locales, header parsing rules, per-field fallback, and the per-category table of localisable response fields.
10. **Grants and revocation** — what a Grant is, how revocation behaves, and why re-authorization is the only recovery.
11. **Error reference** — three tables covering the authorization, token-exchange and profile-read stages.
12. **PrymeCab reference integration** — how the in-repository third party implements the same contract, its environment-variable boundary, and its access-lost handling.

The sequence is the point rather than the inventory: sections 2–3 establish which credentials exist and where each may live; 4–6 walk the credential from browser to server; 7–9 describe what the resulting token can read and in which language; 10–11 describe how that access ends or fails; 12 shows a working instance of the whole chain. A developer following the page in order performs registration, redirect, exchange and read without needing any other artefact.

## 3. Technical design and information architecture

**Why inside the authenticated Console.** The audience for these docs is a developer who is also registering an application, and registration is Console-only. Placing the documentation at `/console/docs` puts it under the same `AuthGuard` and `ConsoleShell` (`apps/securiself-platform/app/console/layout.tsx`) as `Clients`, so the page can link directly to the surfaces it describes — `routes.console.newClient`, `routes.console.clients`, `routes.console.grants`, `routes.console.activity` — instead of describing them in prose. The cost is that the docs are not publicly readable; the benefit is that every "do this in the Console" instruction is one click from its subject, and that no new authentication, layout or theming path was introduced.

**Route composition.** `apps/securiself-platform/app/console/docs/page.tsx` is four lines: it renders `<DeveloperDocs />`. All content lives in the feature directory `src/features/developer-docs/`, matching the existing feature-per-directory convention used by `features/grants`, `features/contexts` and `features/auth`. The Next.js production build reports `/console/docs` as `○ (Static)`, i.e. prerendered, because the page has no data dependencies.

**Section navigation.** `DOCS_SECTIONS` in `src/features/developer-docs/developer-docs.ts` is the single list of section ids and titles. `DocsNav` maps it to anchor links; the page maps it to `DocsSection` headings through a `SECTION` lookup. Navigation and headings therefore cannot drift, and the platform test suite asserts the correspondence rather than a hard-coded list.

**Responsive behaviour.** The desktop layout is a two-column CSS grid (`lg:grid-cols-[200px_minmax(0,1fr)]`) with a `lg:sticky` table of contents. Below the `lg` breakpoint the aside is hidden and the same `DocsNav` is rendered inside a native `<details>/<summary>` disclosure, which needs no JavaScript, no state and no additional component. `min-w-0` on the content column and per-block `overflow-x-auto` keep wide code and tables inside their own scroll containers rather than forcing horizontal page scroll.

**Why static TSX rather than a documentation framework.** Introducing MDX, Docusaurus or a schema-to-docs generator would have added a build pipeline, a second styling system and a second deployment target to document a contract with roughly a dozen sections. Static TSX inside the existing app reuses the Console shell, the shadcn/Radix primitives (`Table`, `Tabs`, `Alert`, `Separator`, `Button`), the theme tokens and the existing test and accessibility harnesses at zero infrastructure cost, and — more importantly — lets the documentation *import* live application code (`buildProfilePayload`, `CONTEXT_CATEGORIES`, `getPrivacyMatrix`, `routes`) so that some of its content is computed rather than transcribed.

**Modularity boundary.** Only four components were created: `DocsSection` (anchored `<section>` + `<h2>`), `DocsNav` (the list), `CodeBlock` (a labelled copyable code region) and the page itself, plus small in-file presentational helpers (`P`, `C`, `H3`, `Endpoint`, `Th`, `Td`, `BoundaryTag`, `ErrorTable`) that exist because they are used many times each. Prose that is used once stays inline in the page rather than being pushed into a content-model abstraction that would have to be invented, typed and maintained for a single consumer.

## 4. Key implementation methods and code

### 4.1 One section list driving navigation, headings and tests

`apps/securiself-platform/src/features/developer-docs/developer-docs.ts`:

```ts
export const DOCS_SECTIONS: DocsSectionMeta[] = [
  { id: "overview", title: "Overview" },
  { id: "register", title: "Register an application" },
  // … ten more
];
```

`components/developer-docs.tsx`:

```tsx
const SECTION = Object.fromEntries(
  DOCS_SECTIONS.map((section) => [section.id, section.title]),
) as Record<string, string>;
```

**Purpose.** Prevent the three representations of a section — the anchor in the table of contents, the `id` on the `<section>`, and the visible `<h2>` — from diverging.
**Input.** `DOCS_SECTIONS`, the only place a section's id and title are written.
**Mechanism.** `DocsNav` renders `href={'#' + section.id}` from the array; the page renders `<DocsSection id="overview" title={SECTION.overview}>`, and `DocsSection` derives both the anchor target and the `aria-labelledby` heading id from that same `id`.
**Output.** Every table-of-contents link resolves to an existing landmark, and every landmark carries the title shown in the navigation.
**Why it matters.** Broken in-page anchors are the characteristic failure mode of hand-written documentation pages, and they are invisible in a screenshot. Here the invariant is machine-checkable: `developer-docs.test.tsx` iterates `DOCS_SECTIONS` and asserts, for each entry, both an `<h2>` with that title and an element with that `id`. Adding a section to the array without rendering it fails the suite.

### 4.2 Context payload examples computed from the application's own payload builder

`components/developer-docs.tsx`, Context payload reference:

```tsx
{CONTEXT_CATEGORIES.map((category) => (
  <TabsContent key={category.value} value={category.value}>
    <PayloadPreview
      payload={{
        status: "success",
        context: category.value,
        data: buildProfilePayload(category.value, EXAMPLE_CONTEXT, EXAMPLE_VAULT),
      }}
    />
    {getPrivacyMatrix(category.value).map((rule) => (
      <PrivacyFieldRow key={rule.label} {...rule} />
    ))}
  </TabsContent>
))}
```

**Purpose.** Show the exact payload each Context category discloses without hand-writing four JSON documents that would silently rot.
**Input.** `CONTEXT_CATEGORIES`, `buildProfilePayload` and `getPrivacyMatrix` from `src/features/contexts/context-rules.ts` — the same functions the OAuth consent screen and the Context forms use — plus fictional `EXAMPLE_CONTEXT` / `EXAMPLE_VAULT` values defined in `developer-docs.ts`.
**Mechanism.** The tab set is generated by iterating the category metadata array; each tab builds its payload at render time by calling the shared builder, and renders the category's disclosure matrix through the existing `PrivacyFieldRow` component.
**Output.** Four payload examples and four disclosure matrices that are, by construction, the frontend's canonical view of the filter — not a transcription of it. Adding a fifth Context category to `CONTEXT_CATEGORIES` would add a fifth documentation tab with no edit to the docs.
**Why it matters.** The documented payload and the payload previewed to the user on the consent screen are produced by one function, so a change to disclosure rules cannot leave the docs showing the old shape. `buildProfilePayload` is itself covered by `src/features/contexts/context-rules.test.ts`, which asserts the per-category field sets.

### 4.3 A typed projection of the backend's localisable fields

`src/features/developer-docs/developer-docs.ts`:

```ts
/**
 * Fields the API backend resolves through the localization helper, per
 * category. Derived from `filterProfile` in
 * `apps/api-backend/src/modules/profiles/profiles.service.ts` — the disclosed
 * payload, not the set of fields a context can store.
 */
export const LOCALISABLE_RESPONSE_FIELDS: Record<ContextCategory, string[]> = {
  PROFESSIONAL: ["pronouns", "job_title", "short_bio"],
  SOCIAL: ["pronouns"],
  PRIVATE: ["pronouns"],
  LEGAL: [],
};
```

**Purpose.** State, per category, which response fields respond to `Accept-Language`.
**Input.** The `ContextCategory` union from `src/features/contexts/types.ts`, and the behaviour of `filterProfile`, which wraps exactly `pronouns`, `jobTitle` and `shortBio` in the `localized()` helper and only returns `job_title`/`short_bio` for `PROFESSIONAL`.
**Mechanism.** A `Record<ContextCategory, string[]>` consumed twice: in the payload tabs ("Localisable fields: …") and in the localization section's per-category table.
**Output.** A per-category statement of language-sensitive fields, and — deliberately — a distinction from `CATEGORY_LOCALISABLE_FIELDS` in `context-rules.ts`, which lists what a Context can *store*. `PRIVATE` can store a localisable `shortBio` but never discloses `short_bio`, so its documented response set is `["pronouns"]` alone.
**Why it matters.** This is the Sprint's clearest maintainability trade-off, and the `Record` type is what bounds it: a new `ContextCategory` produces a compile-time error until the mapping is extended, which `pnpm check-types` catches. Changing which fields an *existing* category discloses does not, because the values are strings. That residual manual link is documented in the source comment and restated in §12.

### 4.4 Copyable code regions with distinct accessible names

`src/features/developer-docs/components/code-block.tsx`:

```tsx
<CopyButton value={code} variant="ghost" size="icon"
  label={copyLabel ?? `Copy ${label}`} />
{/* tabIndex keeps the horizontal scroll region reachable by keyboard. */}
<pre tabIndex={0} className="overflow-x-auto p-4 … focus-visible:ring-2">
```

**Purpose.** Make each example copyable and each copy control identifiable, on a page carrying eight code blocks and six JSON payload previews.
**Input.** The `code` string and a human-readable `label` (e.g. `"Token exchange — cURL"`); the existing `CopyButton`, whose icon-size variant renders `aria-label` only.
**Mechanism.** The block derives the copy button's accessible name from its own label rather than using a generic string, and marks the `<pre>` focusable so a keyboard user can scroll a wide example. The same need on JSON payloads was met by adding one optional `copyLabel` prop to the shared `PayloadPreview`, defaulting to its previous `"Copy JSON"` so existing call sites are unaffected.
**Output.** Fourteen copy controls with fourteen distinct accessible names, and keyboard-reachable horizontal scrolling in every code region.
**Why it matters.** Multiple identically named buttons are a documented screen-reader failure mode, and it is exactly the failure a page of code samples invites. The property is asserted rather than assumed: one platform test collects all `Copy …` buttons and requires the set of names to be the same size as the list.

### 4.5 The browser/server boundary rendered as data, not colour

```tsx
/** Boundary marker: icon + text, so the distinction is never colour-only. */
function BoundaryTag({ kind }: { kind: "browser" | "server" | "securiself" }) {
  const config = {
    browser: { icon: Laptop, label: "Browser" },
    server: { icon: Server, label: "Your server" },
    securiself: { icon: Globe, label: "SecuriSelf" },
  }[kind];
  …
}
```

**Purpose.** Attach an unambiguous boundary classification to each credential and each PrymeCab environment variable.
**Input.** A three-value union; no free-form text at the call sites.
**Mechanism.** Each row of the credentials table and the environment-variable table renders `<BoundaryTag kind="browser" />` or `kind="server"`; the tag emits an `aria-hidden` icon *and* a text label.
**Output.** A consistent, greppable classification across two tables, with the semantics carried by text rather than colour.
**Why it matters.** The union makes an unclassified credential impossible to add by accident, and the icon-plus-text rendering keeps the distinction available to users who cannot perceive a colour cue — a WCAG 1.4.1 concern on precisely the content where misreading the cue means leaking a client secret.

## 5. Documentation accuracy and source-of-truth decisions

The documentation was written against the implementation, and each factual claim class was traced to the code that produces it:

| Documented claim | Verified against |
| --- | --- |
| Authorization parameters, `response_type=code`, `scope=identity_context` default, strict JSON token body | `apps/api-backend/src/modules/oauth/oauth.schemas.ts` (`authorizeQuerySchema`, `tokenSchema` with `.strict()`) |
| Rejection messages and their status codes | `apps/api-backend/src/modules/oauth/oauth.service.ts` — e.g. `unauthorized("Invalid client credentials")`, `badRequest("Authorization code has already been used")`, `forbidden("Authorization request was denied by the user")` |
| `TOKEN_EXCHANGE_FAILED` audit on post-lookup failures; `?code=` appended with `&` when the redirect URI already has a query | the `auditFailure` helper and the `separator` computation in the same file |
| Credential formats `scs_<32 hex>` and `scs_secret_<random>`, bcrypt-hashed secret, SHA-256-hashed access token | `apps/api-backend/src/modules/clients/clients.service.ts`, `apps/api-backend/src/lib/crypto.ts` |
| Response envelope, `snake_case` keys, per-category field sets, `pronouns` defaulting to `"hidden"` | `filterProfile` in `apps/api-backend/src/modules/profiles/profiles.service.ts` |
| `Accept-Language` q-ordering, region-tag collapsing, `*` ignored, per-field fallback | `parseAcceptLanguage` and `resolveLocalizedText` in `apps/api-backend/src/lib/locale.ts` |
| Grant creation/reactivation via upsert; revocation revoking tokens in the same transaction; idempotency | `oauth.service.ts` (`prisma.grant.upsert` with `update: { revokedAt: null }`) and `grants.service.ts` (`revokeGrant`) |
| `401` variants: missing / invalid / revoked / expired token | `apps/api-backend/src/middleware/requireBearerToken.ts` |
| PrymeCab callback, `httpOnly` cookie with `maxAge: expires_in`, `Accept-Language` forwarding, `access_rejected` | `apps/prymecab-simulator/app/api/auth/callback/route.ts`, `app/api/user/route.ts`, `lib/profiles-me-headers.ts`, `lib/access-state.ts` |

Two categories of content are stronger than transcription. The Context payload examples and disclosure matrices are *computed* by calling `buildProfilePayload` and `getPrivacyMatrix`, so they track the frontend's canonical model of the filter automatically. The route links (`routes.console.*`) are computed from the same constants the Console navigates with, so a route rename cannot leave a dead link in the docs.

The remainder is manually mirrored, and that boundary is stated rather than obscured. `LOCALISABLE_RESPONSE_FIELDS` is a maintained projection of `filterProfile`'s localization behaviour: its *keys* are compiler-enforced through `Record<ContextCategory, string[]>`, its *values* are not. Error strings, TTL environment-variable names and credential formats are likewise mirrored text. What limits the risk is that each mirrored behaviour is independently pinned by a backend test — the exact strings the docs quote appear as assertions in `apps/api-backend/tests/security.test.ts` (expired code, consumed code, wrong secret, wrong redirect URI, revoked token), `privacy.test.ts` (per-category field sets), `localization.test.ts` (Spanish resolution, per-field fallback, `SOCIAL`/`PRIVATE` not disclosing `short_bio`) and `grants-idempotent.test.ts` (single `ACCESS_REVOKED`) — so a behavioural change breaks a test before it can silently invalidate a page of prose.

## 6. The browser/server security boundary

The security section exists because the flow's single most damaging integrator error is placing `client_secret` on the browser side, and the flow's shape actively invites it: `client_id` and `redirect_uri` legitimately appear in a browser URL, so a developer generalising from step 4 to step 6 will reach for `NEXT_PUBLIC_CLIENT_SECRET`.

The documentation therefore does not describe the boundary in prose alone. It classifies every credential in a table via `BoundaryTag` — `client_id`, `redirect_uri` and the authorization code as browser-facing; `client_secret` and `access_token` as server-only; the SecuriSelf session JWT as never issued to a third party at all — states the consequence of a leak (an attacker completing the exchange for an intercepted code and reading the owner's context-bound profile under the application's identity), and repeats the classification concretely in the PrymeCab environment-variable table, where `CLIENT_SECRET` is shown deliberately *not* carrying the `NEXT_PUBLIC_` prefix. The code samples reinforce the same split at the point of use: the authorization sample is commented "Browser. No client secret is involved at this step.", the exchange sample "Your server. The client secret never reaches the browser."

This maps directly onto the backend architecture. `POST /oauth/token` verifies the secret with bcrypt against `application.clientSecretHash` and returns `401 Invalid client credentials` for both an unknown `client_id` and a wrong secret; the authorization code alone proves nothing. The access token is equally a bearer credential with no proof of possession — `requireBearerToken` looks up `sha256(raw)` and grants the context-bound read on a match — which is why the docs treat it, and PrymeCab stores it, as server-side state in an `httpOnly` cookie.

## 7. Context-bound disclosure

The privacy invariant the platform exists to enforce is a causal chain, and the documentation is organised to make each link visible at the step where it is created:

`user selects one Context at consent` → `the authorization code is bound to that Context` → `the exchanged access token inherits the binding` → `GET /api/v1/profiles/me` filters by the bound Context's category → `the third party receives only the permitted fields`.

Section 4 documents the selection as a single-choice radio group with a live payload preview; section 5 states that the code is bound to one owner, one application, one Context and one redirect URI; section 6 shows that the exchange takes no Context parameter; section 7 states that `/profiles/me` accepts no parameters at all because owner and Context are already fixed by the token; section 8 shows what each category yields.

Section 8's four tabs are generated from `CONTEXT_CATEGORIES` as described in §4.2. Each renders a full response envelope built by `buildProfilePayload` from shared fictional data, so the four payloads are directly comparable: `SOCIAL` yields `display_name`, `username`, `pronouns`, `avatar_url`; `PROFESSIONAL` adds `job_title`, `company`, `short_bio` and drops `username`; `PRIVATE` reduces to `display_name`, `pronouns`, `avatar_url`; `LEGAL` yields `legal_first_name`, `legal_last_name`, `document_id`, `avatar_url` and no display name at all. Beneath each payload, `getPrivacyMatrix` renders the corresponding Shared/Blocked matrix, which states the negative cases the payload alone cannot show — that root email and gender are blocked in every category, and legal identity outside `LEGAL`.

The documentation also names the mechanism, not only the outcome: the response `data` object is assembled field by field from the category's allow-list rather than serialised from the user record with fields removed, which is why a field added to the database later cannot appear in an existing category's payload.

Two accuracy constraints were observed. First, the frontend documentation does not enforce anything; `filterProfile` in the API backend is the enforcement point, and the payload section says so explicitly. Second, `buildProfilePayload` is the platform's mirror of that filter — it is the same function the consent preview uses, and `context-rules.test.ts` pins its per-category output, but it is a mirror, and the backend's `privacy.test.ts` is what pins the actual disclosure.

## 8. Localization

The localization section documents `Accept-Language` on `GET /api/v1/profiles/me` for the two supported locales (`en`, `es`), and is structured around one invariant that is stated in a dedicated callout titled "Language does not widen disclosure": language selection substitutes a value for an already-authorized localisable field; it does not change the authorized Context and does not expand the field allow-list. The concrete example given — requesting `es` on a `SOCIAL` Context still returns the same four `SOCIAL` fields — is the same property asserted by `apps/api-backend/tests/localization.test.ts` ("returns Spanish pronouns for SOCIAL without disclosing short_bio").

Header parsing is documented as four rules, each traceable to `parseAcceptLanguage`: q-value ordering with ties broken by position; region subtags collapsed to the primary tag (`es-MX`, `es-419`, `ES` → `es`); first supported tag wins (`fr,en;q=0.8` → `en`); `*` ignored, and an unsupported or absent header treated as "no preference". Per-field fallback is documented from `resolveLocalizedText`: requested variant if non-empty, else the English/default scalar, else any remaining variant, so a partially translated Context degrades per field rather than erroring — with the `pronouns` exception, which resolves to `"hidden"` rather than `null`.

The per-category field table is rendered from `LOCALISABLE_RESPONSE_FIELDS` (§4.3), paired with an explicit list of the language-independent fields (`display_name`, `username`, `company`, `avatar_url`, `document_id`, `legal_first_name`, `legal_last_name`). The mapping's maintenance status is stated in §12.

## 9. Revocation and error paths

Roughly a third of the page describes conditions in which the integration does not succeed, on the grounds that these are the states a third-party application must handle and the states its developer cannot discover from a happy-path example.

The error reference presents three tables, one per protocol stage, each generated from a `[condition, behaviour][]` array through the local `ErrorTable` helper with an `sr-only` `<caption>`:

- **Authorization (Platform):** unauthenticated owner (redirect to sign-in with `returnTo`, no callback); unregistered `client_id`; `redirect_uri` not matching the registration; malformed query; denial (`403 Authorization request was denied by the user`, with no code and no redirect); a Context not owned by the user (`403`, or `404` if absent).
- **Token exchange:** unknown `client_id` and incorrect secret both returning `401 Invalid client credentials`, with the docs noting the indistinguishability is deliberate; unknown code; code issued to another application; `redirect_uri` mismatch; expired code; replayed code; schema-validation failure with a `details` array.
- **Profile read:** missing or non-Bearer header; unrecognised token; revoked token; expired token — the four `401` messages produced by `requireBearerToken`.

The Grants section documents the lifecycle rather than the button: approving consent creates the Grant or reactivates a previously revoked one for the same user/application/Context triple; a second Context authorized for the same application produces a second, independent Grant; revocation marks the Grant, revokes every non-revoked token for that triple in the same transaction and writes one `ACCESS_REVOKED` entry, and is idempotent — a second revoke changes no timestamp and writes no second audit entry.

Two consequences are made explicit because they determine third-party design. The application is not notified of revocation; it learns of it as `401 Access token has been revoked` on the next read — the same status class as expiry, so one handler covers both — and re-authorization is the only recovery, since no refresh token exists. The PrymeCab section closes the loop by showing this handled in practice: its profile route maps any SecuriSelf `401` to an explicit `access_rejected` reason and its UI renders a distinct "access lost" state, separate from "signed out" and from a network failure.

## 10. Testing and validation

All commands below were executed against the current working tree from the repository root.

### 10.1 Platform unit/component suite — `pnpm test:platform`

`vitest run` in `apps/securiself-platform`. Result: **15 test files, 61 tests, all passed** (3.71 s). Six of these tests are the Sprint 5 suite `src/features/developer-docs/components/developer-docs.test.tsx`:

| Test | What it verifies |
| --- | --- |
| links the console sidebar to the docs route | The exported `NAV_ITEMS` contains a `Developer Docs` entry whose `href` is `routes.console.docs`, and that constant equals `/console/docs`. Navigation and route constant cannot diverge. |
| renders every documented section with a matching anchor | For every entry in `DOCS_SECTIONS`, an `<h2>` with that title and an element with that `id` exist; plus the `<h1>` "Developer Docs". |
| offers keyboard-reachable in-page navigation to each section | Within the `Documentation sections` navigation landmark, a link per section pointing at `#<id>` — i.e. no dead anchors. |
| covers every critical integration stage | The rendered text contains 14 required markers spanning the whole path: `client_secret`, `/oauth/authorize`, `response_type`, `identity_context`, `?code=`, `POST`, `/oauth/token`, `grant_type`, `authorization_code`, `/api/v1/profiles/me`, `Authorization: Bearer <ACCESS_TOKEN>`, `Accept-Language`, `Access token has been revoked`, `Authorization code has already been used`. |
| uses placeholders instead of real credentials | The page renders `scs_client_example` and `<SECURISELF_CLIENT_SECRET>` and contains no `scs_secret_scs` — the prefix a real generated secret would carry. |
| gives each copy button a distinct accessible name | All `Copy …` buttons are collected and the set of accessible names is required to be the same size as the list. |

The fourth test is the one that turns "the page rendered" into "the page documents the flow": it fails if any protocol stage is dropped from the content.

### 10.2 Backend suite — `pnpm test:backend`

`vitest run` in `apps/api-backend`, against the shared test database. Result: **11 test files, 67 tests, all passed** (172.97 s). No backend file was modified in Sprint 5; this run establishes that the behaviour the documentation describes is the behaviour currently implemented. The directly relevant files are `security.test.ts` (expired code, consumed code, wrong secret, wrong redirect URI, missing/manipulated/revoked bearer token, token bound to a single context), `privacy.test.ts` (per-category disclosure, no root email leakage), `localization.test.ts` and `locale.test.ts` (Accept-Language resolution, per-field fallback, `SOCIAL`/`PRIVATE` without `short_bio`), `grants-idempotent.test.ts` (single `ACCESS_REVOKED`), and `lifecycle.test.ts` (consent denial issues no code; secret rotation invalidates the old secret).

### 10.3 Type checking — `pnpm check-types`

`tsc --noEmit` across all three packages. Result: **3 of 3 tasks successful** (`api-backend`, `prymecab-simulator` and `securiself-platform`; the first two replayed from Turborepo cache, `securiself-platform` executed on a cache miss). This is the check that enforces the `Record<ContextCategory, …>` obligation described in §4.3.

### 10.4 Lint — `pnpm lint`

`eslint` in the two packages that define a `lint` script (`securiself-platform`, `prymecab-simulator`; `api-backend` has none). Result: **2 of 2 tasks successful, no warnings or errors**.

### 10.5 Production build — `pnpm build`

Result: **3 of 3 tasks successful**. `securiself-platform` compiled in 2.7 s, passed its build-time TypeScript pass, and prerendered 17 static pages; the route table lists `/console/docs` as `○ (Static)`, confirming the page has no server-side data dependency and no runtime cost beyond the static asset.

### 10.6 Accessibility — `pnpm test:a11y`

Playwright + `@axe-core/playwright` against `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, using the shared helper `tests/e2e/helpers/accessibility.ts`, which fails a scan on any **critical** or **serious** violation and appends a row per scanned surface to `writeup-evidence/reports/accessibility-summary.json`. Sprint 5's only change to the suite was adding `"/console/docs"` to the authenticated-console route list in `tests/e2e/specs/accessibility.spec.ts`.

Result: **2 of 3 tests passed, 1 failed** (32.7 s, Chromium, 1 worker). The run rewrote `accessibility-summary.json` with 16 scanned surfaces, of which 15 record `testResult: "pass"` with zero critical and zero serious violations.

- **`public pages have no critical or serious axe violations` — passed.**
- **`authenticated console and consent screens pass the a11y gate` — passed.** This is the test that covers Sprint 5. It signs in, visits eight console routes including `/console/docs`, and scans each. The recorded row for `/console/docs` is `critical: 0, serious: 0, moderate: 0, minor: 0, incomplete: 0, testResult: "pass"` — no violations at any impact level and no axe "incomplete" results requiring manual review. The scan covers the two-column layout, the twelve sections, the eight code blocks, the six payload previews, the seven data tables and the tab set.
- **`Grants page and revoke dialog pass the a11y gate` — failed.** The failure is on the `/console/grants-revoke-dialog` state, on the axe `color-contrast` rule (`wcag2aa`, `wcag143`), recorded as `serious: 1, incomplete: 2, testResult: "fail"`. This is a pre-existing Grants defect, not a Developer Docs one; see §12. The preceding `/console/grants-active` scan in the same test passed with zero violations.

### 10.7 Not executed

`pnpm test:e2e` (the functional Playwright suite) was not run for this write-up, and no claim is made about it here. It contains no Sprint 5-specific spec: the Developer Docs page has no interactive flow beyond in-page anchors and copy buttons, so it is covered by the component suite and the accessibility scan rather than by a browser flow test. The PrymeCab package's own `vitest` tests (`lib/access-state.test.ts`, `lib/profiles-me-headers.test.ts`) are not part of `pnpm test:platform`, which filters to `securiself-platform`, and were not run separately.

## 11. Results and interpretation

The evidence answers a coverage question, not a rendering question.

**Structural completeness.** All 12 entries of `DOCS_SECTIONS` were present as `<h2>` headings with matching anchor targets in the rendered route, and all 12 were reachable from the in-page navigation landmark by links resolving to those targets (§10.1, tests 2 and 3). No section is declared without being rendered, and no navigation entry points at a missing anchor.

**Path coverage.** Against the eleven stages a third-party integrator must traverse, the tested route contains a dedicated section for each: registration (§2 of the page), credentials (§3), authorization request (§4), Context selection (documented within §4 and §8), callback (§5), token exchange (§6), profile retrieval (§7), Context payloads (§8), localization (§9), revocation (§10) and errors (§11). Fourteen protocol-level markers spanning authorization, exchange, read, localization and two failure messages were asserted present in the rendered text (§10.1, test 4). This is a completeness result for the tested structure and content, expressed in terms the test can check.

**Correspondence with implementation.** The 67 passing backend tests cover the behaviours the documentation states, including the exact error strings it quotes, and the 61 passing platform tests include the four `buildProfilePayload` privacy-rule tests underlying the payload examples. Type checking and the production build pass with the new route prerendered statically.

**Accessibility.** The `/console/docs` scan recorded zero violations at every impact level and zero incomplete results under the four WCAG 2.0/2.1 A and AA axe tag sets (§10.6). That result covers the properties the implementation deliberately engineered — the `<details>` compact navigation, `aria-labelledby` on each section, the focusable `<pre>` scroll regions, distinct copy-button names, `sr-only` table captions and the icon-plus-text boundary tags — but an axe scan is an automated check on a rendered DOM: it detects a defined rule set, not every barrier, and it does not substitute for assistive-technology testing. The Platform-wide accessibility result remains a failure because of the unrelated revoke-dialog contrast violation described in §12.

**Safety of the content itself.** The page renders only placeholder credentials, asserted by a test that fails if any string carrying the real generated-secret prefix (`scs_secret_scs`) appears (§10.1, test 5). A documentation page inside an authenticated Console is a plausible place for a real value to be pasted during development; that path is now closed by a test rather than by review.

**What the evidence does not demonstrate.** It does not demonstrate that a third-party developer can successfully integrate using this page. No human developer was observed attempting the integration from the documentation alone, and no such claim is made. Automated coverage establishes that the defined sections, the required protocol markers and the anchor structure are present in the tested route, and that the described backend behaviours currently hold; it does not establish comprehensibility, correct ordering for a first-time reader, or sufficiency of the explanations. Demonstrating that would require a developer usability study, which is outside this Sprint. Nor do the tests verify the *semantic accuracy* of every prose sentence: they verify the presence of specific strings, while accuracy rests on the source-of-truth tracing in §5 and on the backend tests that pin the quoted behaviour.

## 12. Remaining boundaries

**Pre-existing revoke-dialog contrast violation.** The accessibility run in §10.6 reproduced it: the `/console/grants-revoke-dialog` scan reports one **serious** `color-contrast` violation (`wcag2aa`, `wcag143`) and `testResult: "fail"`, and it is recorded as such in `writeup-evidence/reports/accessibility-summary.json`. This is a genuine WCAG 1.4.3 accessibility defect on the Grants revoke confirmation dialog. It predates Sprint 5, was not introduced by the Developer Docs, and was deliberately left untouched because modifying the Grants revocation UI is outside this Sprint's scope. Its consequence for this report is a limit on claims: the Developer Docs route itself is clean under the applied axe gate, but the Platform as a whole cannot be described as WCAG 2.1 AA conformant while this violation stands.

**Static TSX rather than generated documentation.** The docs are hand-authored typed TSX. Only the parts that import live application code — the four Context payload examples and disclosure matrices (`buildProfilePayload`, `getPrivacyMatrix`, `CONTEXT_CATEGORIES`) and the Console links (`routes.console.*`) — update automatically. Endpoint paths, request/response shapes, error strings, TTL variable names and credential formats are transcribed from the backend, so a backend change requires a corresponding documentation edit that no build step enforces. What mitigates this is that each such behaviour is pinned by a backend test, so a behavioural change fails CI before the documentation can quietly become wrong; the mitigation is a signal, not an enforcement mechanism. Generating the reference from the Zod schemas and `filterProfile` would remove the class of drift entirely and remains available as future work.

**`LOCALISABLE_RESPONSE_FIELDS` maintenance boundary.** As described in §4.3, the mapping's keys are compiler-enforced through `Record<ContextCategory, string[]>` — adding a Context category creates a compile-time obligation that `pnpm check-types` will surface — but the field names are plain strings. Changing which fields an existing category discloses, or which of them pass through `resolveLocalizedText` in `filterProfile`, would require a manual update here and would not fail any current test. The same applies to the parallel distinction the mapping encodes: it lists *disclosed* localisable fields, which for `PRIVATE` is `["pronouns"]` even though a `PRIVATE` Context can store a localisable `shortBio` (`CATEGORY_LOCALISABLE_FIELDS` in `context-rules.ts`). That distinction is correct today and is recorded in a source comment, but nothing mechanically preserves it.

**No consent-screen screenshots.** The documentation describes the consent screen in text — application name, redirect URI, single-choice Context radio group, live payload preview, Approve and Deny outcomes — and links to the live Console surfaces (`Clients`, `Grants`, `Activity`) rather than embedding images. This was an implementation decision: screenshots inside the app bundle would need re-capture on every visual change, would not adapt to the light/dark theme the rest of the page follows, and would carry a risk of embedding real account data. The trade-off is that a developer cannot see the consent screen's appearance without triggering an authorization request. Because the docs live in the authenticated Console alongside the real surfaces, this is a smaller gap than it would be for public documentation, but it is a gap.

**Documentation is not publicly reachable.** `/console/docs` is behind the Console `AuthGuard`. A prospective integrator who has not created a SecuriSelf account cannot read the integration contract at all. This follows from the decision in §3 and is appropriate while registration is Console-only; it would need revisiting if a public developer portal became a requirement.

**Content-length coupling.** `developer-docs.tsx` is a single ~1,170-line component. This is a deliberate consequence of keeping single-use prose inline rather than inventing a content model, and it is tolerable at twelve sections, but it is the file that will need splitting first if the documentation set grows — most naturally by extracting one component per section, keeping `DOCS_SECTIONS` as the index.
