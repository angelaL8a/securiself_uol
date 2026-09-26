# Sprint 5 — Validation

Companion to [`sprint5-implementation.md`](./sprint5-implementation.md).
Visual evidence index: [`images/evidence.md`](./images/evidence.md).

All results in this document come from executions performed on the working tree
described in §9. Where a suite failed, the failure is reported with its exact
signature and its provenance is established, not summarised away.

---

## 1. Validation objective

Sprint 5 added one new surface: the **Developer Documentation** route
`/console/docs`, implemented as `apps/securiself-platform/src/features/developer-docs/`
and mounted inside the authenticated Console. Nothing else in the product was
added by this Sprint.

The validation question is therefore narrow and answerable:

> Is the new Developer Documentation reachable by an authenticated identity owner
> through the existing Console authentication boundary; does it render the
> integration stages a third-party developer needs; is it navigable; does it
> describe the contract the system already implements; and does its introduction
> leave the previously validated system behaviour intact?

Five sub-objectives follow from that:

1. **Protected integration.** The docs live behind the Console auth boundary,
   not as a separate application, and an unauthenticated visitor is subject to
   the same guard as every other Console route.
2. **Completeness.** Every stage of the integration lifecycle — registration
   through revocation — is represented, with zero critical omissions for the
   implemented scope.
3. **Usability of the surface.** The in-page navigation targets real anchors,
   the sections are semantically headed, and interactive controls (copy buttons,
   category tabs, scrollable code blocks) are operable and named.
4. **Fidelity.** The documented values match the implemented system where that
   can be checked mechanically (route constants, Context categories, supported
   locales, payload shapes).
5. **No regression.** The pre-existing backend, browser and accessibility
   evidence remains valid after the change.

### What this Sprint does not claim

Sprint 5 **did not implement** authentication, Google sign-in, the OAuth-like
authorization-code flow, the privacy filter, `Accept-Language` resolution, or
Grants and revocation. Those were delivered and validated in Sprints 1–4 and are
evidenced by the pre-existing backend and E2E suites. This document references
that evidence; it does not re-attribute it to Sprint 5.

Because the documentation *describes* those subsystems, a recurring distinction
runs through this document:

| Question | Evidence layer that can answer it |
| --- | --- |
| Does the page explain behaviour X? | Component tests, browser tests, screenshots |
| Does the system actually do X? | Backend Vitest/Supertest and the Sprint 1–4 E2E specs |

A frontend test that asserts the words “Access token has been revoked” appear on
a page is documentation-coverage evidence. It is not evidence that revocation
works.

---

## 2. Validation strategy

Five layers were used, each answering a question the others cannot.

### Static / type validation

`tsc --noEmit` across all three packages, plus ESLint.

Useful here because parts of the documentation are *derived* rather than
written. `LOCALISABLE_RESPONSE_FIELDS` is typed
`Record<ContextCategory, string[]>`, so the compiler rejects the file if a
category is added to `ContextCategory` and not given an entry — completeness of
that map is a compile-time property, not a runtime assertion. The same applies
to `routes.console.docs` being a typed constant consumed by the sidebar, the
page and the tests rather than a repeated string literal.

This layer proves structural consistency. It proves nothing about rendering.

### Platform component tests (Vitest + React Testing Library)

`apps/securiself-platform/src/features/developer-docs/components/developer-docs.test.tsx`.

Useful for exhaustive structural checks that are cheap in jsdom and expensive in
a browser: every section heading exists, every navigation link resolves to an
existing anchor id, every copy button has a distinct accessible name, all four
category tabs render, and the rendered text contains no live credential. Running
these against the component means a missing section fails in under a second
rather than after a two-minute browser suite.

This layer cannot prove that the route exists, that the Console shell wraps it,
or that the auth guard admits the user.

### Browser E2E tests (Playwright, Chromium)

`tests/e2e/specs/developer-docs.spec.ts`.

The only layer that can exercise the actual authentication boundary — a real
redirect to `/sign-in?returnTo=…`, a real credential submission against the
running API, a real session, a real Next.js route render inside the Console
shell — and the only layer that can produce genuine visual evidence.

### Backend tests (Vitest + Supertest against PostgreSQL)

`apps/api-backend/tests/*.test.ts`.

The correct and only evidence for whether the *contract described by the
documentation* is the contract the system enforces: token exchange rules, code
replay and expiry, privacy filtering per category, `Accept-Language` resolution
and fallback, and revocation semantics. Sprint 5 added nothing here and needed
to add nothing here.

### Accessibility checks (`@axe-core/playwright` + explicit keyboard checks)

`tests/e2e/specs/accessibility.spec.ts`.

Automated detection of the WCAG 2.0/2.1 A and AA rules axe implements, plus
targeted keyboard and semantic assertions for things axe cannot decide. This
layer detects specified violations on a scanned state. It does not establish
conformance.

---

## 3. Existing test coverage audit

The repository was audited before any test was written. The relevant finding is
that Sprint 5 arrived with a component test file already in place, and that
several Sprint 5 requirements were already satisfied by suites belonging to
earlier Sprints.

### Already present and sufficient

| Suite / file | Behaviour covered | Relevance to Sprint 5 | Additional coverage needed? |
| --- | --- | --- | --- |
| `apps/api-backend/tests/functional.test.ts` (8) | Register, login, vault, contexts, authorize→token→profile, health | The contract the docs describe | No |
| `apps/api-backend/tests/privacy.test.ts` (5), `lifecycle.test.ts` (5) | Per-category field filtering, consent denial, secret rotation, context lifecycle | Evidence for §C/§F claims *about the system* | No — frontend must not duplicate this |
| `apps/api-backend/tests/security.test.ts` (10) | Wrong secret, redirect mismatch, expired code, replayed code, revoked/manipulated token | Evidence behind the documented error reference | No |
| `apps/api-backend/tests/locale.test.ts` (12), `localization.test.ts` (9) | `Accept-Language` q-ordering, region collapse, per-field fallback | Evidence behind the documented localization rules | No |
| `apps/api-backend/tests/grants-idempotent.test.ts` (1), `audit.test.ts` (3), `ownership.test.ts` (3) | Idempotent revocation, `PROFILE_READ`/`ACCESS_REVOKED` audit, cross-user ownership | Evidence behind the documented Grants section | No |
| `apps/api-backend/tests/google-auth.test.ts` (9), `google-id-token.test.ts` (2) | Google sign-in exchange and ID-token verification | Not required for Sprint 5 — see §5 | No |
| `tests/e2e/specs/social-disclosure.spec.ts`, `legal-disclosure.spec.ts`, `privacy-boundary.spec.ts`, `consent-denial.spec.ts`, `grant-revocation.spec.ts`, `localization.spec.ts` | The full browser integration journey the docs describe | Referenced, not repeated | No |
| `apps/securiself-platform/src/features/contexts/context-rules.test.ts` (5) | `buildProfilePayload` for all four categories, `pronouns` → `"hidden"` | The docs render their payloads *through this helper*, so its tests also underwrite the rendered examples | No |
| `apps/securiself-platform/src/features/auth/auth-store.test.ts` (3), `return-to.test.ts` (3) | Session persistence and `returnTo` sanitisation | The mechanism that carries a user from `/sign-in` back to `/console/docs` | No |
| `tests/e2e/specs/accessibility.spec.ts` | Axe scan of `/console/docs` (the route was added to the scan list as part of the Sprint 5 change) | Sprint 5 a11y evidence | No |

### Already present but incomplete

`apps/securiself-platform/src/features/developer-docs/components/developer-docs.test.tsx`
shipped with the implementation and covered six behaviours: sidebar/route
linkage, every section heading and anchor, in-page navigation targets, the
presence of fourteen critical integration markers, placeholder-only credentials,
and distinct copy-button accessible names. This is strong structural coverage —
but it did not assert that the four Context categories are represented, which is
an explicit Sprint requirement (§F).

### Genuinely missing

| Gap | Why the existing suites did not close it |
| --- | --- |
| **Authenticated browser access to `/console/docs`** | The a11y spec navigates to `/console/docs` while signed in, but it is tagged `@a11y`, excluded from `pnpm test:e2e`, and its purpose is an axe scan — it asserts only that `<main>` is visible. Nothing exercised the protected-route boundary *into* the docs. |
| **The unauthenticated → sign-in → docs boundary** | No test navigated to `/console/docs` without a session. |
| **Console sidebar navigation in a browser** | The component test asserts `NAV_ITEMS` contains the right `href`; nothing clicked it. |
| **In-page anchor navigation actually working** | The component test asserts `href="#payloads"`; nothing verified the target is reached. |
| **Four Context categories represented** | Not asserted anywhere. |
| **Permanent visual evidence** | None existed for this Sprint. |

Three tests were added to close these six gaps. No test was added for anything
already covered above.

---

## 4. Additional Sprint 5 tests

### 4.1 Protected access and documentation integrity (browser)

**File:** `tests/e2e/specs/developer-docs.spec.ts:65` —
*“an authenticated owner reaches Developer Docs through the Console auth
boundary”*

**Gap.** Nothing exercised the Console authentication boundary into the new
route, nothing verified the route renders in a real browser, and nothing
produced visual evidence.

**Test.** A single journey: clear browser auth state → navigate to
`/console/docs` → assert the redirect to `/sign-in?returnTo=%2Fconsole%2Fdocs`
and that no docs heading is present → sign in with the seeded email/password
fixture → assert the landing path is `/console/docs` and the `<h1>` is
“Developer Docs” → assert the Console sidebar link carries `aria-current="page"`
→ assert all twelve required sections have a visible `<h2>` and exactly one
matching anchor → assert every in-page navigation link points at its anchor →
click the *Context payload reference* link and assert the URL hash and that the
target heading is in the viewport → assert all four category tabs are visible →
focus the token-exchange copy button by keyboard and assert it receives focus →
assert the documentation text contains `<SECURISELF_CLIENT_SECRET>` and
`scs_client_example` but not the seeded client secret or password → capture the
six permanent screenshots.

The twelve required sections are restated as a literal list inside the spec
rather than imported from `DOCS_SECTIONS`. This is deliberate: a derived list
would shrink silently if a section were deleted from the implementation, which
is exactly the failure mode the Sprint asks to detect.

**Expected result.** Redirect to sign-in, successful authentication, docs
rendered inside the Console shell, all assertions pass, six PNGs written to
`docs/sprint5/images/`.

**Observed result.** Passed (4.5 s in the recorded run). The redirect URL was
`http://localhost:3000/sign-in?returnTo=%2Fconsole%2Fdocs`; after sign-in the
path was `/console/docs`; all twelve sections, all twelve nav links, all four
tabs and the keyboard focus assertion succeeded; the anchor click produced a URL
ending `#payloads` with the target heading in the viewport; six screenshots were
written.

**Interpretation.** An authorised user can reach the Sprint 5 documentation
surface through the existing authentication boundary, and an unauthenticated one
is redirected by that same boundary with a `returnTo` that restores the intended
destination. The documentation surface renders with its full section set, its
navigation resolves, and it exposes no live credential. It does **not** support
any claim about backend behaviour, nor about whether a human finds the
documentation comprehensible.

**Cost of the redirect assertion.** This test does not constitute new coverage of
authentication itself. It reuses `signInAsE2EOwner` from
`tests/e2e/helpers/oauth-flow.ts` — the established fixture — and asserts only
the *boundary into the new route*.

### 4.2 Console sidebar navigation (browser)

**File:** `tests/e2e/specs/developer-docs.spec.ts:180` —
*“the Console sidebar navigates from the Overview page to Developer Docs”*

**Gap.** The sidebar entry's `href` was asserted in a component test; no test
clicked it.

**Test.** Sign in landing on `/console`, click the **Developer Docs** link inside
the navigation landmark labelled “Console”, assert the URL becomes
`/console/docs` and the docs `<h1>` renders.

**Expected result.** Client-side navigation to the docs route.

**Observed result.** Passed (3.5 s in the recorded run).

**Interpretation.** The Sprint 5 sidebar entry is a working navigation path from
elsewhere in the Console, not merely a correctly configured constant.

### 4.3 Context categories in the payload and locale references (component)

**File:** `apps/securiself-platform/src/features/developer-docs/components/developer-docs.test.tsx`
— *“represents all four context categories in the payload and locale
references”*

**Gap.** Requirement F — that `PROFESSIONAL`, `LEGAL`, `SOCIAL` and `PRIVATE` are
all represented — was unasserted.

**Test.** Render `<DeveloperDocs />`; assert a tab exists for each of
Professional, Legal, Social and Private; assert every `CONTEXT_CATEGORIES` value
appears in the rendered text (the locale table renders one row per category,
keyed off the `Record<ContextCategory, string[]>` map); assert the documented
locale statement reads “Supported locales are en and es”.

**Expected result.** All four tabs present, all four category values in the
document text, locale statement present.

**Observed result.** Passed. Platform suite went from 61 to 62 tests, all green.

**Interpretation.** The four implemented Context categories are represented in
the documentation. Note the boundary: the tab list is derived from
`CONTEXT_CATEGORIES`, so adding a fifth category would extend the tabs
automatically and would force a `LOCALISABLE_RESPONSE_FIELDS` entry at compile
time — but the *correctness* of each entry remains a manual mapping (see §13).

### 4.4 Supporting change to a shared helper

`tests/e2e/helpers/oauth-flow.ts` — `signInAsE2EOwner` gained an optional
`waitForUrl` parameter defaulting to the previous literal `/\/oauth\/authorize/`.
This lets a caller that arrived from a protected Console route wait for its own
`returnTo` destination instead of the consent screen, so Sprint 5 reuses the
existing sign-in fixture rather than creating a second authentication path for
tests. The default preserves the behaviour of the single pre-existing call site
(`reachConsentScreen`, through which every Sprint 1–4 browser spec signs in);
§9 records the control run that confirms this.

---

## 5. Authentication / login validation

`/console/docs` is a protected Console route. `app/console/layout.tsx` wraps
every Console page in `AuthGuard`, which waits for the Zustand auth store to
hydrate from `localStorage` and then, if no token is present, calls
`router.replace(signInWithReturn(currentPath))`. There is no separate guard for
the docs route — it inherits the Console boundary, which is the point.

**Mechanism exercised.** Email/password sign-in — the established E2E fixture
(`E2E_USER` in `tests/e2e/fixtures/test-data.ts`), submitted against the running
API backend, producing a real JWT session persisted under the
`securiself.auth` key.

**Reuse.** The existing helper `signInAsE2EOwner` was reused, extended only by an
optional destination parameter (§4.4). No second authentication mechanism was
created for testing, and no React state was faked.

**Was a new login-to-docs path necessary?** Yes, and only this. The existing
E2E suites sign in on the way to the OAuth consent screen, and the a11y suite
signs in and then visits `/console/docs` — but no test entered *through* the
guard at the docs route. The redirect behaviour, the `returnTo` round-trip and
the post-authentication render of `/console/docs` were unverified.

**What the browser test did, and what happened.**

| Step | Observed |
| --- | --- |
| Clear session, `GET /console/docs` | Redirected to `http://localhost:3000/sign-in?returnTo=%2Fconsole%2Fdocs` |
| Assert docs content absent pre-auth | `heading level 1 "Developer Docs"` had count 0 |
| Fill seeded credentials, submit | Navigation to `/console/docs` within the 30 s wait |
| Assert path | `new URL(page.url()).pathname === "/console/docs"` |
| Assert render | `<h1>Developer Docs</h1>` visible; Console sidebar entry `aria-current="page"` |

`/console/docs` rendered successfully after valid authentication.

**Google Sign-In.** Not exercised, and not required. Sprint 5 changed nothing in
authentication, and `useGoogleSignIn` shares the exact same success handler as
password login (`useAuthSuccessHandler` in `src/features/auth/hooks.ts`), so it
establishes the identical session and resolves `returnTo` through the same
`resolveReturnTo`. Google sign-in already has dedicated coverage —
`apps/api-backend/tests/google-auth.test.ts` (9), `google-id-token.test.ts` (2),
`google-sign-in-button.test.tsx` (5), `google-session.test.tsx` (3). Adding a
Google journey to Sprint 5 would duplicate that coverage without answering any
Sprint 5 question.

**Scope note.** `AuthGuard` is a client-side guard. It controls what the browser
renders, not what the API discloses; API-level authorization is enforced
separately and is covered by `ownership.test.ts` and `security.test.ts`. This
Sprint's evidence concerns the routing boundary only.

---

## 6. Developer Docs functional validation

| Aspect | Method | Observed result |
| --- | --- | --- |
| Route resolves | Production build + browser navigation | `next build` lists `○ /console/docs` (prerendered static); the browser renders it after auth |
| Page renders | Browser + component | `<h1>Developer Docs</h1>` visible in both layers |
| Sidebar entry | Component (`NAV_ITEMS` → `routes.console.docs`) + browser click | Entry present, `href="/console/docs"`, `aria-current="page"` when active, click navigates |
| Section set | Browser (literal list of 12) + component (derived from `DOCS_SECTIONS`) | All 12 `<h2>` headings visible, each with exactly one matching anchor id |
| In-page navigation | Component (12 `href` assertions) + browser (click → hash → in-viewport) | All 12 links target existing anchors; clicked link reached `#payloads` with the heading in the viewport |
| Navigation semantics | Component + browser role queries | Two labelled landmarks: `navigation` named “Documentation sections” (desktop, sticky aside) and “Documentation sections (compact)” (inside a `<details>` disclosure below `lg`); links are ordinary `<a href="#…">` |
| Code examples | Component (distinct accessible names) + browser (keyboard focus) | Every `Copy …` control has a unique accessible name; `Copy Token exchange — your server` received keyboard focus. `CodeBlock` renders `<pre tabIndex={0}>` so the horizontal scroll region is keyboard reachable |
| Critical integration markers | Component | All 14 asserted markers present, including `/oauth/authorize`, `?code=`, `POST` `/oauth/token`, `grant_type`, `authorization_code`, `/api/v1/profiles/me`, `Authorization: Bearer <ACCESS_TOKEN>`, `Accept-Language`, `Access token has been revoked`, `Authorization code has already been used` |
| Context reference | Component (4 tabs + 4 category values) + browser (4 tabs visible) | `PROFESSIONAL`, `LEGAL`, `SOCIAL`, `PRIVATE` all represented; payloads generated at render time by the shared `buildProfilePayload` |
| Localization reference | Component (locale statement) + source comparison | Documented locales `en`, `es` match `SUPPORTED_LOCALES` in `apps/api-backend/src/lib/locale.ts` |
| Error / revocation reference | Component markers + screenshot S5-VIS-06 | Three condition tables covering authorization, token exchange and profile read, including revoked-Grant and replayed-code outcomes |
| PrymeCab reference | Component (section heading) + browser | *PrymeCab reference integration* section present as section 12 |
| Credential hygiene | Component + browser | Placeholders only: `scs_client_example`, `<SECURISELF_CLIENT_SECRET>`, `<AUTHORIZATION_CODE>`, `<ACCESS_TOKEN>`. The browser test additionally asserts the rendered `<main>` does not contain the seeded `E2E_CLIENT.clientSecret` or `E2E_USER.password` |

**Critical integration omissions for the implemented scope: 0.** All twelve
stages named in the Sprint scope — registration, credentials, authorization
request, Context selection/consent, callback code, server-side token exchange,
`/api/v1/profiles/me`, Context-specific response behaviour, `Accept-Language`,
Grants/revocation, error behaviour and the PrymeCab reference — map to a
documented section, and each section's presence fails a test if removed.

---

## 7. Browser / Playwright validation

**Spec:** `tests/e2e/specs/developer-docs.spec.ts` (2 tests, tagged `@sprint5`,
included in the default `pnpm test:e2e` suite).

**Browser / project:** Chromium only, via the single configured Playwright
project `chromium` using `devices["Desktop Chrome"]`. **Firefox and WebKit were
not executed** — the repository configures no such projects, and this Sprint did
not add any. Viewport for this spec: 1440 × 900.

**Environment:** Three real servers started by `playwright.config.ts` —
`api-backend` on `:8080`, the Platform on `:3000` and the PrymeCab simulator on
`:3001`, the two Next apps as production builds (`next start`) — against the
isolated E2E PostgreSQL database, reseeded before every test by the `auto`
fixture in `tests/e2e/fixtures/test.ts`.

**Route sequence (test 1):**

```text
(no session) → /console/docs
            → /sign-in?returnTo=%2Fconsole%2Fdocs
            → [email + password submit]
            → /console/docs
            → /console/docs#payloads
```

**Route sequence (test 2):**

```text
(no session) → /console  → /sign-in?returnTo=%2Fconsole
            → [email + password submit]
            → /console  → [sidebar click] → /console/docs
```

**Important assertions:** redirect target and `returnTo` value; absence of docs
content before authentication; post-auth pathname; `<h1>`; sidebar
`aria-current="page"`; 12 section headings and 12 unique anchors; 12 nav-link
`href` values; hash navigation reaching an in-viewport heading; four category
tabs; keyboard focus on a copy control; placeholder-only credentials in `<main>`.

**Screenshot checkpoints:** one viewport capture taken immediately after the
Console-integration assertions, then five element captures taken after all
content assertions had passed.

**Result:** both tests passed. In the recorded full-suite run
(`--retries=2`) they completed in 4.5 s and 3.5 s with no retries.

---

## 8. Visual evidence

Full descriptions, capture conditions and per-image boundaries are in
[`images/evidence.md`](./images/evidence.md).

| Evidence ID | Screenshot | Validated aspect |
| --- | --- | --- |
| S5-VIS-01 | `01-authenticated-developer-docs.png` | Protected Console integration: shell, active sidebar entry, page header, 12-section index, integration overview |
| S5-VIS-02 | `02-browser-server-security-boundary.png` | Browser-vs-server credential boundary; `client_id` / `client_secret` / code / token classification |
| S5-VIS-03 | `03-profile-request-and-response.png` | `GET /api/v1/profiles/me` request and context-bound response example, placeholders only |
| S5-VIS-04 | `04-context-payload-reference.png` | Four Context categories; `PROFESSIONAL` payload, disclosure matrix and localisable fields |
| S5-VIS-05 | `05-localization-reference.png` | `Accept-Language`, supported locales, per-field fallback, "language does not widen disclosure" |
| S5-VIS-06 | `06-revocation-errors-reference.png` | Failure and lifecycle reference: invalid secret, redirect mismatch, expired/replayed code, revoked token |

All six were written by the passing execution of
`tests/e2e/specs/developer-docs.spec.ts:65`, which asserts the documented content
*before* capturing it. None was composed, edited or mocked. None contains a real
credential (§ *Credential safety* in `evidence.md`).

Screenshots complement the automated assertions; they do not replace them. A
frame proves that a surface rendered in one state at one moment. It cannot prove
that a section is still present tomorrow — that is the job of the assertions —
and it cannot prove that the described backend behaviour is real.

---

## 9. Regression validation

Executed after the Sprint 5 additions, on the working tree containing the
Developer Docs implementation, the new spec, the extended component test and the
`oauth-flow.ts` helper parameter.

| Validation | Command | Observed result | Interpretation |
| --- | --- | --- | --- |
| Platform tests | `pnpm test:platform` | **62 passed (62)** across **15 files** | Platform suite green; up from 61 before the added component test |
| Backend tests | `pnpm test:backend` | **67 passed (67)** across **11 files**, 249.9 s | The contract the docs describe is unchanged and still enforced |
| E2E (with retries) | `pnpm exec playwright test --grep-invert "@a11y\|@evidence\|@sprint2-evidence\|@sprint2-candidate-b-review" --retries=2` | **10 passed (10)**, 1.5 min, no retries consumed | All browser journeys including the 2 new Sprint 5 tests passed |
| E2E (run A, no retries) | `pnpm test:e2e` | **9 passed, 1 failed** — `grant-revocation.spec.ts`, `TimeoutError: page.waitForURL: Timeout 30000ms exceeded` | Pre-existing flake; see below |
| E2E (run B, no retries) | `pnpm test:e2e` | **8 passed, 2 failed** — `privacy-boundary.spec.ts`, `social-disclosure.spec.ts`, same signature | Pre-existing flake; see below |
| Accessibility | `pnpm test:a11y` | **2 passed, 1 failed** (3 tests) | See §10 |
| Lint + typecheck | `pnpm exec turbo run lint check-types --force` | **5 successful, 5 total**, 0 cached | No lint or type errors in any package |
| Production build | `pnpm exec turbo run build --force` | **3 successful, 3 total**, 0 cached; `/console/docs` listed as `○ (Static)` | Both Next apps and the API backend build; the docs route prerenders |

### The E2E flake, and why it is pre-existing

Runs A and B each failed with the same signature: `page.waitForURL` timing out at
`tests/e2e/helpers/oauth-flow.ts` line 46, inside `signInAsE2EOwner`, with the
browser still on `/sign-in?returnTo=%2Foauth%2Fauthorize…` and the credentials
visibly filled — the sign-in submit did not navigate. The affected test differed
between runs (`grant-revocation`, then `privacy-boundary` **and**
`social-disclosure`), which is characteristic of a race rather than a defect in a
specific spec.

Because the change in §4.4 touches that exact line, its provenance was
established rather than assumed. `tests/e2e/helpers/oauth-flow.ts` was stashed
back to `HEAD` and the two specs that failed in run B were executed three times
each on the unmodified helper:

```text
pnpm exec playwright test specs/social-disclosure.spec.ts specs/privacy-boundary.spec.ts --repeat-each=3
→ 4 passed, 2 failed   (privacy-boundary repeat 2; social-disclosure repeat 0)
   TimeoutError: page.waitForURL: Timeout 30000ms exceeded
   waiting for navigation until "load"
   navigated to "http://localhost:3000/sign-in?returnTo=%2Foauth%2Fauthorize…"
```

The flake reproduces at `HEAD` with the Sprint 5 helper change absent, at a
comparable rate and with an identical failure signature. It is a pre-existing
hydration race between Playwright's click and React attaching the submit
handler — the same class of instability the helper's own existing comment
(“Remounts during auth hydration can clear early fills”) already documents for
the field fills. The Sprint 5 helper change preserves the previous default
(`/\/oauth\/authorize/`) for the single pre-existing call site.

It was not fixed in this Sprint. Doing so would mean changing shared
authentication test infrastructure belonging to earlier Sprints on the strength
of a symptom observed while validating a documentation feature, and the honest
retry-enabled result (10/10) demonstrates that no *behaviour* regressed. It is
recorded as an open boundary in §13.

The two Sprint 5 tests passed in every execution, including the two runs where
other specs flaked.

---

## 10. Accessibility validation

**Command:** `pnpm test:a11y` — `tests/e2e/specs/accessibility.spec.ts`, axe with
tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, failing on critical/serious
violations and attaching moderate/minor findings as advisory.

**Sprint 5 surface.** `/console/docs` was added to the authenticated-console scan
list as part of the Sprint 5 change. The recorded scan
(`writeup-evidence/reports/accessibility-summary.json`, row `/console/docs`):

```json
{ "routeOrState": "/console/docs", "testResult": "pass",
  "critical": 0, "serious": 0, "moderate": 0, "minor": 0, "incomplete": 0,
  "blockingRuleIds": [], "advisoryRuleIds": [] }
```

Zero violations at every impact level, and zero incomplete results, for the
Developer Docs route as loaded. The test containing this scan —
*“authenticated console and consent screens pass the a11y gate”* — passed in
12.2 s along with the other seven Console routes it scans.

Beyond axe, the Sprint 5 surface has these explicit semantic and keyboard
checks: the section navigation is a labelled `navigation` landmark (queried by
accessible name in both the component and browser tests); each section is a
`<section aria-labelledby>` with an `<h2>`; every copy control has a unique
accessible name; a copy control was focused by keyboard and asserted focused; and
`CodeBlock` gives its horizontally scrollable `<pre>` a `tabIndex={0}` with a
visible focus ring so keyboard users can reach the scroll region.

**Pre-existing failure, unchanged.** The third a11y test, *“Grants page and
revoke dialog pass the a11y gate”*, **failed**:

```text
Error: Axe critical/serious violations on "/console/grants-revoke-dialog"
- [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds (4 node(s))
```

The failing surface is the **revoke confirmation dialog on `/console/grants`** — a
Sprint 2 surface. This violation predates Sprint 5 and is documented in
`docs/sprint2/SPRINT2-VALIDATION.md` (§ “The test failed on the open revoke
dialog. Axe reported **1 serious** `color-contrast` violation (4 nodes)”) with
the identical rule, impact and node count. The active Grants page scan in the
same test recorded 0 critical and 0 serious, as it did in Sprint 2. Sprint 5
touched neither the Grants feature nor the dialog.

In the first `pnpm test:a11y` run of this validation the third test aborted
earlier, at the same pre-existing sign-in race described in §9, before reaching
the axe scan; the test was re-run in isolation to obtain the result above.

**Bounded conclusion.** The Developer Docs route introduced **no new axe
critical, serious, moderate or minor violation** in the tested state, and the one
outstanding serious violation in the suite is a pre-existing Sprint 2 contrast
issue on an unrelated surface. This is not a claim of WCAG 2.1 AA conformance:
axe scans one rendered state per route, checks only the rules it implements,
cannot evaluate the tab panels or the mobile disclosure in their unopened states,
and no assistive-technology or user testing was performed.

---

## 11. Validation results summary

| Objective | Method | Observed result | Supported conclusion |
| --- | --- | --- | --- |
| Unauthenticated access is guarded | Playwright `developer-docs.spec.ts:65` | Redirect to `/sign-in?returnTo=%2Fconsole%2Fdocs`; docs heading count 0 | `/console/docs` inherits the existing Console auth boundary |
| Authenticated access succeeds | Playwright, seeded email/password fixture | Landed on `/console/docs`; `<h1>` visible | An authorised user reaches the Sprint 5 surface through the existing boundary |
| Console integration | Playwright + component | Sidebar entry present, `aria-current="page"`, click navigates | The docs are a Console route, not a separate application |
| Docs render | Playwright + component + `next build` | Route prerendered `○ (Static)`; renders in browser and jsdom | The route resolves and renders |
| Documentation completeness | 12 literal section assertions (browser) + 12 derived (component) + 14 content markers | All present | Zero critical integration omissions for the implemented scope |
| Navigation | 12 `href`→anchor assertions + one click-to-hash browser check | All resolve; target reached in viewport | No navigation item points at a missing section |
| Context categories | Component (4 tabs, 4 values) + browser (4 tabs visible) | All four present | `PROFESSIONAL`, `LEGAL`, `SOCIAL`, `PRIVATE` are represented |
| Localization reference | Component + source comparison with `SUPPORTED_LOCALES` | `en`, `es` documented and implemented | The documented locale set matches the backend constant |
| Failure/revocation reference | Component markers + S5-VIS-06 | Three error tables incl. revoked token and replayed code | Failure behaviour is documented, not only the happy path |
| Credential hygiene | Component + browser assertions on `<main>` | Placeholders only; seeded secret and password absent | The docs and their screenshots expose no live credential |
| Code-example interaction | Component (unique names) + browser (keyboard focus) | Unique accessible names; focus received | Copy controls are named and keyboard reachable |
| Regression — platform | `pnpm test:platform` | 62/62 across 15 files | Platform suite unaffected |
| Regression — backend | `pnpm test:backend` | 67/67 across 11 files | The described contract is unchanged and still enforced |
| Regression — browser | Playwright `--retries=2` | 10/10 | Existing integrated journeys remain valid |
| Regression — quality | lint + `tsc --noEmit` + build | 5/5 and 3/3 tasks, uncached | No type, lint or build regression |
| Accessibility | axe (`wcag2a/2aa/21a/21aa`) + keyboard checks | `/console/docs`: 0/0/0/0, pass | No new automated violation on the Sprint 5 surface |
| Visual evidence | Playwright captures during a passing test | 6 PNGs in `docs/sprint5/images/` | Documented sections were observed rendering in a real browser |

---

## 12. Results interpretation

Against the objective in §1:

**Integration into the existing Console — supported.** `/console/docs` is guarded
by the same `AuthGuard` as every other Console route, renders inside the same
`ConsoleShell`, and appears in the same `NAV_ITEMS` sidebar. Evidence: the
browser redirect assertion, the post-authentication render, the
`aria-current="page"` assertion, the sidebar click navigation, and S5-VIS-01,
which shows shell and content in one frame.

**Authenticated users can access it — supported.** Demonstrated end to end in a
real browser against a real API and database, using the project's established
email/password fixture rather than a fabricated session.

**The integration lifecycle is represented — supported.** All twelve stages have
a documented section whose absence fails a test in two independent layers, plus
fourteen content markers covering the specific endpoint paths, parameters,
headers and error messages a developer must know.

**Existing system behaviour remains validated by the appropriate pre-existing
suites — supported.** 67/67 backend tests and 10/10 browser journeys passed after
the change. Sprint 5 added no backend test and duplicated no OAuth, privacy,
localization or revocation coverage in the frontend.

**Critical documentation sections are not omitted — supported for the implemented
scope**, with the meaning of "omitted" bounded to *absent from the page*, which
is what the tests can detect.

### What these results do not establish

- **Not** that an external developer understands the documentation. Every
  assertion here is a machine checking for the presence and structure of text.
  Comprehension requires a task-based evaluation with unfamiliar developers,
  which this Sprint did not perform.
- **Not** that the documentation is *correct*. The tests verify that documented
  strings exist, and that a few values (route, categories, locales) match their
  source constants. They do not verify that every documented status code,
  message and rule matches backend behaviour; §13 records that boundary.
- **Not** that SecuriSelf is production-ready. It remains an academic
  OAuth-like subset — no discovery document, no refresh token, no PKCE — running
  a local evaluation workload.
- **Not** that the product is WCAG 2.1 AA conformant. One serious violation
  remains open in the suite, and automated scanning is not conformance.

---

## 13. Remaining validation boundaries

**Human developer comprehension.** The automated evidence shows the required
documentation exists, is reachable, is navigable and is internally consistent. It
cannot show that a developer unfamiliar with SecuriSelf can complete an
integration from it. A task-based evaluation — give an external developer the
Docs and the API, measure whether they reach a filtered profile without reading
the repository — would be required for that claim, and was not performed.

**Documentation-to-backend synchronisation.** Parts of the page are derived from
shared source (`routes.console.docs`, `CONTEXT_CATEGORIES`,
`buildProfilePayload`, `getPrivacyMatrix`), so those cannot silently drift from
the Console's own rules. Other parts are prose transcribed from backend
behaviour: the error tables' status codes and messages, the TTL environment
variable names, the header-parsing rules, and the `LOCALISABLE_RESPONSE_FIELDS`
map. `Record<ContextCategory, string[]>` guarantees only that every category has
an entry — the compiler cannot check that `SOCIAL → ["pronouns"]` is what the
backend actually localises. If a backend message changes, no test in this
repository fails; the documentation simply becomes wrong. Closing this would
require generating the error reference from the backend's own error constants,
or asserting the documented messages against live API responses.

**Accessibility.** The revoke-dialog `color-contrast` violation (1 serious, 4
nodes) on `/console/grants` remains open. It predates Sprint 5, is documented in
`docs/sprint2/SPRINT2-VALIDATION.md`, and was not addressed here. Separately, the
axe scan of `/console/docs` covers the page as first loaded: the three unselected
Context tab panels and the compact `<details>` navigation used below the `lg`
breakpoint were not scanned in their open states, and no assistive-technology or
user testing was performed on any surface.

**Browser coverage.** Chromium only. `playwright.config.ts` defines a single
project, and no Firefox or WebKit run was performed. The browser evidence in this
document does not constitute a multi-browser matrix, and no claim is made about
rendering or behaviour in other engines.

**Responsive behaviour.** The Developer Docs layout switches at the `lg`
breakpoint — a sticky aside above it, a `<details>` disclosure below it — and the
Console sidebar itself is hidden below `lg` in favour of a sheet. All browser
evidence in this Sprint was captured at 1440 × 900. The compact navigation
landmark's existence is asserted indirectly (both landmarks are rendered), but no
test exercised the sub-`lg` layout, and no mobile screenshot was captured.

**E2E sign-in flakiness.** The pre-existing hydration race described in §9 causes
intermittent failures in the Sprint 1–4 browser specs when the suite is run
without retries. It was reproduced at `HEAD` without the Sprint 5 helper change,
so it is not a Sprint 5 regression, but it does mean that a single no-retry run
of `pnpm test:e2e` is not a reliable regression signal on this machine. The
recorded 10/10 result used `--retries=2`.
