# Sprint 5 — Post-Evaluation Validation

## 1. Post-Validation Objective

Sprint 5 delivered integrated Developer Documentation inside the SecuriSelf
Console, and that implementation was validated in
[`sprint5-validation.md`](./sprint5-validation.md). It was then evaluated in
person with five external developers
([`sprint5-external-evaluation.md`](./sprint5-external-evaluation.md)). The
evaluation found no critical integration omission — all five completed the eight
guided tasks and all closed comprehension answers aligned with the documented
behaviour — but it did record two recurring costs: navigating a single
twelve-section continuous page, and separating five similar-sounding credentials
and authorization artefacts.

Four refinements were implemented in response
([`sprint5-post-evaluation-refinement.md`](./sprint5-post-evaluation-refinement.md)):

1. the single page became nine focused, route-backed documentation areas;
2. two levels of local documentation navigation were made sticky;
3. a credential / authorization-artifact lifecycle reference was added;
4. the authorization-code → access-token causality was stated explicitly.

This document records whether those four changes **technically function** in the
running SecuriSelf Console, whether the documentation content the evaluation
rated highest survived the restructure, and whether the tested Platform and
backend behaviour remained valid afterwards.

It is **not** a second human evaluation. The five participants evaluated the
previous structure; they have not seen this one. Nothing here claims that
developers now find the documentation easier to use. The chain is:

> external evaluation identified friction → refinement changed the
> implementation → this post-validation verifies the changes work as intended →
> human improvement remains unmeasured.

It also does not repeat `sprint5-validation.md`. Protected access to
`/console/docs`, the Console shell integration and the backend contract were
established there and are reused rather than re-derived.

---

## 2. Validation Scope

**In scope**

1. **Focused documentation areas** — that the nine areas exist, that
   `/console/docs` opens on Overview, that switching areas shows the intended
   content and only that content, and that each area is a real resolvable URL.
2. **Sticky local navigation** — observed browser behaviour under real scrolling,
   not the presence of a CSS class.
3. **Credential lifecycle reference** — that all five values are represented and
   correctly distinguished.
4. **Authorization-code → access-token sequence** — that the causal chain is
   present, ordered and explicit about server-side responsibility.
5. **Preservation** — Context payload reference, HTTP/code examples,
   `Accept-Language` guidance, Grants/revocation, errors, reference integration.
6. **Regression** — platform component tests, TypeScript, ESLint, production
   build, the full Playwright E2E suite, and the backend suite.
7. **Accessibility of the revised surfaces** — automated axe scans of all nine
   documentation routes, plus explicit keyboard checks on the new area
   navigation.

**Out of scope**

- Any claim about human comprehension, task time, rereading or facilitator
  assistance. That requires another participant evaluation.
- Re-testing the SecuriSelf integration contract itself. No endpoint, token
  semantic, Context disclosure rule, Grant behaviour or localization rule was
  changed by the refinement; those are covered by the backend suite and the
  OAuth E2E specs and are only re-run here as a regression gate.
- Non-Chromium browsers. The project configures a single Playwright project.
- The deferred light theme (a secondary, single-participant recommendation).
- Full WCAG AA conformance. Automated axe scans plus targeted keyboard checks are
  not a conformance audit.

---

## 3. Existing Test Coverage Audit

Coverage was audited before anything was added, so that new tests exist only
where a refinement behaviour would otherwise be unverified.

| Suite / file | Behaviour already covered | Relevance to the four refinements | Additional testing needed? |
| --- | --- | --- | --- |
| `apps/securiself-platform/src/features/developer-docs/components/developer-docs.test.tsx` (rewritten during the refinement) | `resolves content for every documentation area`; `renders only its own sections in each area, each with a matching anchor`; `points the sticky section navigation at sections present in the same area`; `marks the current area in the sticky area navigation`; `distinguishes every credential and authorization artifact`; `states the authorization-code to access-token sequence in order`; `covers every critical integration stage across the areas`; `represents all four context categories…`; `uses placeholders instead of real credentials`; `gives each copy button a distinct accessible name within an area`; `links the console sidebar to the docs route` | Covers Change 1's data/content wiring, Change 3 and Change 4 in full at component level, and the preservation constraint | **No.** Changes 3 and 4 are static rendered content; a component test is the appropriate instrument and it already asserts presence, wording and order. Duplicating it in a browser would add nothing. |
| `pnpm check-types` (turbo → `tsc --noEmit`, 3 packages) | Type integrity of the new route, area registry and components | Catches a missing area component only if it is a type error — it is not, `DOCS_AREA_CONTENT` is a `Record<string, …>` | No, but the component test closes exactly that gap. |
| `pnpm build` (turbo → `next build`) | That the optional catch-all route prerenders; the build output lists `● /console/docs/[[...area]]` with nine paths | Direct evidence for Change 1's routing mechanism | No. |
| `tests/e2e/specs/developer-docs.spec.ts` (pre-refinement) | Protected-route boundary into `/console/docs`, Console shell integration, sidebar navigation, credential-placeholder safety | The auth boundary and shell integration are still valid and reusable | **The auth-boundary and sidebar tests: reuse.** The rest of the spec asserted twelve section headings and a twelve-entry navigation list on one page and screenshotted five sections from it — it described the pre-refinement implementation and failed against the current one. |
| `tests/e2e/specs/accessibility.spec.ts` | axe sweep over eight Console routes including `/console/docs`; focus-visibility and keyboard checks on sign-in, consent and the revoke dialog | Covers the Overview area only | **Yes** — the refinement created eight further routes that no scan covered. |
| Backend suite (`apps/api-backend`, 11 files / 67 tests) and the OAuth E2E specs | The documented contract: token exchange, Context filtering, localization, revocation, error envelopes | The refinement changed no backend code | No new tests. Run as a regression gate only. |

**Conclusion of the audit.** No new component test was justified. One new
browser test was, and one existing browser spec had to be corrected rather than
extended. The accessibility sweep needed eight routes added, not a new suite.

---

## 4. Tests Added After Refinement

### 4.1 No new component/unit test was added

Stated explicitly, because the temptation was there. The refinement's own
rewritten Vitest suite already asserts every claim Changes 3 and 4 make about
rendered content — all five credential values, both “Never.” exposure statements
as words, the nine flow steps in causal order, and the
“the profile endpoint rejects the code” statement — and asserts Change 1's
area/section/anchor wiring for all nine areas. Adding a second assertion of the
same static text in a different runner would raise the test count without raising
the evidence.

### 4.2 New browser test — `the refined Developer Docs expose nine focused areas behind sticky navigation` (`@post-refinement`)

**File:** `tests/e2e/specs/developer-docs.spec.ts:231`

**Validation gap.** Three things were unverifiable outside a browser:

- whether the nine prerendered routes actually resolve and render their own
  area when requested directly (jsdom has no router);
- whether `position: sticky` produces sticky *behaviour* — the component suite
  can only see the class string, and Tailwind classes are not evaluated in jsdom;
- whether an unknown slug reaches `notFound()` rather than rendering an empty
  documentation shell.

**Test mechanism.** Signs in as the seeded E2E owner through the ordinary
`/sign-in?returnTo=/console/docs` boundary, then:

1. asserts `/console/docs` resolves to Overview, that the area navigation holds
   exactly nine links with the nine expected `href`s, and that Overview carries
   `aria-current="page"`;
2. clicks each of the other eight tabs in turn and, for each, asserts the URL
   pathname, that the rendered `h2` list equals exactly that area's sections in
   order, that each section's anchor id exists, that the correct tab is marked
   current, and that the area's `<main>` contains no live credential;
3. loads `/console/docs/token-exchange` by hard navigation to prove the
   prerendered URL resolves independently of client-side routing;
4. loads `/console/docs/not-an-area` and asserts the not-found page renders with
   no documentation shell;
5. measures the geometry of the Console sidebar, the area navigation and the
   section navigation to confirm three distinct, non-overlapping regions;
6. scrolls the window to 1600 px, polls that `scrollY > 800`, then asserts both
   navigation landmarks satisfy `toBeInViewport()` and that the area bar's top
   edge measures between 56 px and 80 px — pinned below the 64 px topbar;
7. clicks a section link in the sticky aside and asserts the target `h2` is in
   the viewport **and** that its top edge is at or below the bottom of the sticky
   area bar, i.e. not obscured;
8. focuses the first tab, presses `Tab`, asserts focus lands on the next tab,
   presses `Enter`, and asserts the new area renders;
9. re-asserts the Change 3 and Change 4 content as rendered by the real browser;
10. visits Profile API, Contexts & Localization, Token Exchange, Authorization,
    Grants and Errors and asserts the preserved reference material is present;
11. writes the six `post-` screenshots at checkpoints downstream of the
    assertions above.

**Expected behaviour.** Nine resolvable areas, each rendering only its own
sections; both navigation levels remaining visible and correctly positioned under
scroll; keyboard traversal working through ordinary link semantics; all preserved
material still present.

**Observed result.** After one implementation fix (§6.1), **passed**. Final run:
`pnpm test:e2e` → `11 passed (1.5m)`, no retries, this test at 6.1 s.

**Interpretation.** Supports Change 1 (focused areas exist, resolve and switch
correctly), Change 2 (sticky behaviour is real, not merely declared), and the
preservation constraint. It re-confirms Changes 3 and 4 in the browser, which the
component suite already established.

### 4.3 Corrected browser test — the pre-refinement docs spec

The two remaining tests in `developer-docs.spec.ts` were retained. The first,
`an authenticated owner reaches Developer Docs through the Console auth boundary`
(`:171`), keeps the protected-route boundary, the Console shell integration and
the credential-safety check; its stale assertions (twelve section headings, a
twelve-entry navigation list, five section screenshots from one page) were
removed, and its placeholder assertion was moved to the area that now carries
those placeholders. The second, `the console sidebar navigates from the Overview
page to Developer Docs` (`:205`), is unchanged. The pre-refinement login flow is
therefore **not** duplicated by the new test's own sign-in, which exists only to
establish the authenticated session the refinement must be observed in.

### 4.4 Extended accessibility sweep

`tests/e2e/specs/accessibility.spec.ts` previously scanned `/console/docs` alone.
The eight remaining documentation routes were added to the existing route loop —
eight entries in an existing array, not a new suite. See §13.

---

## 5. Focused Documentation Navigation Validation

**Test method.** Two layers.

*Component* (`developer-docs.test.tsx`, Vitest + React Testing Library):
`resolves content for every documentation area` asserts that every slug in
`DOCS_AREAS` has a component in `DOCS_AREA_CONTENT`, that the two collections are
the same size, and that `docsAreaHref` maps the empty slug to `/console/docs` and
a named slug to `/console/docs/<slug>`. `renders only its own sections in each
area, each with a matching anchor` renders each of the nine areas in isolation
and asserts its rendered `h2` list equals exactly that area's section titles, in
order, each with the anchor id its navigation targets.

*Browser* (`developer-docs.spec.ts:231`): as described in §4.2, steps 1–4. The
expected areas and sections are restated in the spec independently of
`DOCS_AREAS`, so deleting an area or a section from the implementation fails the
test rather than silently shrinking the expectation.

**Observed result.** All nine areas resolve, in both directions:

| Area | Route | Sections rendered |
| --- | --- | --- |
| Overview | `/console/docs` | Overview; End-to-end authorization sequence; Credentials and authorization artifacts |
| Application Setup | `/console/docs/setup` | Register an application; Credentials and the security boundary |
| Authorization | `/console/docs/authorization` | Authorization request; Authorization code callback |
| Token Exchange | `/console/docs/token-exchange` | From authorization code to access token; Server-side token exchange |
| Profile API | `/console/docs/profile-api` | Retrieve the context-bound profile |
| Contexts & Localization | `/console/docs/contexts` | Context payload reference; Localization and Accept-Language |
| Grants & Revocation | `/console/docs/grants` | Grants and revocation |
| Errors | `/console/docs/errors` | Error reference |
| Reference Integration | `/console/docs/reference-integration` | PrymeCab reference integration |

`/console/docs` opens on Overview. Each area renders exactly its own headings and
no others. The production build reports `● /console/docs/[[...area]]` prerendered
with nine paths, and a hard navigation to `/console/docs/token-exchange` renders
the Token Exchange area without client-side routing.

**Exact test results.** Vitest: `15 passed (15) / 66 passed (66)`. Playwright:
this behaviour is exercised inside the `@post-refinement` test — **passed**.

**One observation, not a failure.** `/console/docs/not-an-area` renders Next's
not-found page (no documentation shell, no `#token` anchor, no area navigation)
but the response carries **HTTP 200** rather than 404. The Console layout wraps
its children in `<Suspense>`, so Next streams the shell before the page component
calls `notFound()`, and the status line has already been sent. The rendered
result is correct; the status code is a soft 404. This is a property of the
pre-existing Console layout, not of the documentation refinement, and it was not
changed here — the browser test asserts the rendered outcome and documents the
status-code nuance in a comment.

---

## 6. Sticky Navigation Validation

This is the change where the distinction between *CSS implementation* and
*browser-observed behaviour* mattered most, and where the implementation as
delivered did not work.

### 6.1 Defect found and fixed during validation

The refinement declared the area bar `sticky top-16` and the section aside
`lg:sticky lg:top-32`. The classes were present, the component test confirmed the
navigation's structure, and the CSS was correct. **In the browser, neither stuck.**

The first execution of the sticky assertion failed:

```text
Error: expect(locator).toBeInViewport() failed
Locator:  getByRole('navigation', { name: 'Documentation areas' })
Expected: in viewport
Received: viewport ratio 0
  33 × locator resolved to <nav aria-label="Documentation areas"
       class="sticky top-16 z-20 …">…</nav>
     - unexpected value "viewport ratio 0"
```

Root cause: `apps/securiself-platform/src/components/layout/console-shell.tsx`
rendered `<main className="flex-1 overflow-y-auto">`. `overflow-y-auto` makes
`main` a scroll container, so `position: sticky` inside it resolves against
`main`'s scrollport — and `main` never actually scrolls (it is `flex-1` inside a
`min-h-dvh` column, so it grows and the *window* scrolls). Every sticky
descendant of `main` therefore scrolled away with the page. The Console topbar was
unaffected because it is a sibling of `main`, not a descendant.

The fix is the removal of `overflow-y-auto`, with a comment recording why:

```tsx
{/* No `overflow-y-auto`: it makes `main` a scroll container that never
    actually scrolls (the window does), which silently disables
    `position: sticky` for everything inside it — including the
    Developer Docs area and section navigation. */}
<main className="flex-1">
```

`main` never produced its own scrollbar, so nothing else changes. The full E2E
suite (11 tests, every Console route) and the axe sweep (24 scans) were re-run
after the change; both are green.

This is the reason the phase was worth running. A validation that had checked for
`position: sticky` in the class list would have passed and been wrong.

### 6.2 Behaviour verified after the fix

| Check | Method | Observed |
| --- | --- | --- |
| Local docs navigation exists | Two navigation landmarks with distinct accessible names, `Documentation areas` and `Documentation sections` | Both present |
| It contains valid targets | Nine area links with the nine expected `href`s; section links whose `#id` targets exist on the same area | Verified in the browser and, per area, in the component suite |
| It remains available after scrolling | `window.scrollTo(0, 1600)`, poll `scrollY > 800`, then `toBeInViewport()` on both landmarks | Both still in viewport |
| It stays pinned rather than merely tall | Measured top edge of the area bar after scrolling | Between 56 px and 80 px, i.e. immediately under the 64 px topbar |
| Active area remains understandable | `aria-current="page"` asserted on the correct tab after every switch; active state also carries a bottom border and heavier font weight | Exactly one current tab at all times, never colour-only |
| Sticky behaviour does not obscure content | Click a sticky section link, then assert the target `h2` is in the viewport **and** its top edge ≥ the bottom edge of the sticky area bar | Heading fully clear of both bars (`scroll-mt-32`) |
| Keyboard operable | Focus the first tab, `Tab` → next tab focused, `Enter` → that area renders | Passed; ordinary link semantics, no custom key handling |
| Console sidebar and Docs navigation visually distinct | Bounding-box comparison: sidebar right edge ≤ both docs navs' left edges; area bar bottom ≤ section list top | Three distinct, non-overlapping regions |

**Note on the Console sidebar.** It is not itself sticky and scrolls out of view
on a long page — visible in POST-VIS-02, where the left column is empty. That is
pre-existing Console behaviour, unchanged by this refinement, and it does not
affect the Docs navigation, which is what the evaluation asked to keep on screen.

---

## 7. Credential Lifecycle Validation

**Method.** Component assertion plus browser confirmation; no backend test was
duplicated, because this is a static explanatory table, not behaviour.

*Component* — `distinguishes every credential and authorization artifact`
renders the Overview area, locates the table by its accessible name
(“Each credential and authorization artifact in the SecuriSelf integration
flow…”), asserts all five values are present, asserts that exactly two rows are
`serverOnly`, and asserts that both of their exposure strings begin with the
literal word `Never.` — the non-colour signal.

*Browser* — `developer-docs.spec.ts:231` locates the same table by role and
accessible name and asserts its rendered text contains all five values, both
“Never.” statements, and both boundary labels as text.

**Presence and technical distinction confirmed.**

| Value | Held by | Browser exposure | Stage | Role as documented |
| --- | --- | --- | --- | --- |
| SecuriSelf session credential | SecuriSelf | Held by the Platform in the identity owner's own browser session; never sent to your application | Sign-in and consent, on SecuriSelf | Authenticates the identity owner to SecuriSelf; explicitly stated to be **not** an API credential for your application and **not accepted by** `/api/v1/profiles/me` |
| `client_id` | Browser | Public — a query parameter on the authorization URL, browser-readable by design | Authorization request | Identifies the registered application to SecuriSelf and on the consent screen |
| `client_secret` | Your server | **Never.** Not in bundles, not in `NEXT_PUBLIC_*`, not in inline scripts | Token exchange only | Authenticates the application at `POST /oauth/token`; stored by SecuriSelf as a bcrypt hash |
| Authorization code | Browser **then** Your server | Appears transiently in the callback URL, then is handed to your server | Callback, then immediately the token exchange | Single-use, `AUTH_CODE_TTL_MINUTES` (5 min default), exchanged exactly once; explicitly **rejected by** `/api/v1/profiles/me` |
| `access_token` | Your server | **Never.** Treat as a bearer credential | Every profile read, until expiry or revocation | Authorises `GET /api/v1/profiles/me` for the one Context chosen at consent; `ACCESS_TOKEN_TTL_HOURS` (1 h default); no refresh token |

The authorization code is the only row rendering two holder tags, separated by
the word “then”, which is how the boundary crossing is expressed without a
diagram. Server-only rows carry a shield icon **and** the word “Never”, so the
boundary is never signalled by colour alone.

**Result.** Component test passed; browser assertions passed; visual evidence in
POST-VIS-03.

**Bounded conclusion.** The reference exists, is reachable in the running Console,
and states each value's holder, exposure, stage and purpose accurately against the
implementation. **No claim is made about improved human comprehension.** The
participants who reported the confusion evaluated the previous structure.

---

## 8. Authorization Flow Validation

**Method.** Ordering is the property that can silently break, because
`AuthorizationFlow` renders a bare `<ol>` with no other ordering signal — so both
layers assert order, not just presence.

*Component* — `states the authorization-code to access-token sequence in order`
renders the Overview area, takes nine text markers spanning the chain, records
`indexOf` for each, asserts none is `-1`, asserts the index array is already
sorted ascending, asserts `AUTHORIZATION_FLOW` has nine steps, and asserts the
“Sending the code to the profile endpoint returns” statement is present.

*Browser* — the same nine-marker ordering assertion against the rendered `#flow`
list, plus `toHaveCount(9)` on its list items and a visibility assertion on the
`401 Invalid access token` callout.

**Sequence confirmed as rendered:**

```text
1  identity owner selects one Context and approves        SecuriSelf
2  SecuriSelf creates a single-use authorization code     SecuriSelf   carries: authorization code
3  browser returns to your registered callback            Browser      carries: authorization code
4  your server receives the code                          Your server  carries: authorization code
5  server sends code + client_id + client_secret
   + redirect_uri  →  POST /oauth/token                   Your server
6  SecuriSelf validates the exchange (credentials, code
   ownership, redirect URI equality, TTL, single use)     SecuriSelf
7  Context-bound access token returned; code now spent    SecuriSelf   carries: access_token
8  server calls GET /api/v1/profiles/me (Bearer)          Your server  carries: access_token
9  Context-filtered profile returned                      SecuriSelf
```

Against the required checks:

- **Code and token visually/conceptually distinct** — the `carries:` label stops
  at step 4 and the token label begins at step 7; the Token Exchange area adds a
  two-column contrast of the two values; the Overview callout states that sending
  the code to the profile endpoint returns `401 Invalid access token`. ✔
- **Server-side responsibility explicit** — steps 4, 5 and 8 carry the
  “Your server” actor label, and step 5's detail names the client secret as what
  proves the request is yours. ✔
- **`/oauth/token` at the correct stage** — step 5, after the server receives the
  code and before any token exists. ✔
- **`/api/v1/profiles/me` after token exchange** — step 8, two steps after the
  token is issued. ✔
- **Context binding correctly described** — step 2 binds the code to the chosen
  Context; step 7 returns a “Context-bound” token; step 9 returns only the fields
  that Context's category allows. ✔

**Result.** Component test passed; browser assertions passed; visual evidence in
POST-VIS-04. No decorative implementation detail (icon, colour, spacing) is
asserted.

---

## 9. Preservation of Existing Documentation

The evaluation's positive findings constrained the refinement as much as the
negative ones. Two mechanisms verify that nothing was lost.

**Contract markers, asserted across all areas together.** The component test
`covers every critical integration stage across the areas` renders all nine areas
and asserts fourteen markers are present somewhere: `client_secret`,
`/oauth/authorize`, `response_type`, `identity_context`, `?code=`, `POST`,
`/oauth/token`, `grant_type`, `authorization_code`, `/api/v1/profiles/me`,
`Authorization: Bearer <ACCESS_TOKEN>`, `Accept-Language`,
`Access token has been revoked`, `Authorization code has already been used`.
Moving content between areas is allowed; losing it is not.

**Per-area browser assertions** in the `@post-refinement` test:

| Preserved material | Where it now lives | Evidence |
| --- | --- | --- |
| Context payload reference — `PROFESSIONAL`, `LEGAL`, `SOCIAL`, `PRIVATE` | `/console/docs/contexts` | All four Radix tabs asserted visible in the browser; component test asserts all four tabs and every category row in the localization table; POST-VIS-06 |
| Authorization URL example | `/console/docs/authorization` | Rendered text contains `/oauth/authorize`, `response_type`, `identity_context` |
| `POST /oauth/token` example (JS + cURL) | `/console/docs/token-exchange` | Rendered text contains `/oauth/token`, `grant_type`, `authorization_code`; visible in POST-VIS-02 |
| `GET /api/v1/profiles/me` example | `/console/docs/profile-api` | Rendered text contains `/api/v1/profiles/me`, `Authorization: Bearer <ACCESS_TOKEN>`, `Accept-Language`; labelled copy control present; POST-VIS-05 |
| Localization / `Accept-Language` | `/console/docs/contexts` | Rendered text contains `Accept-Language` and “Supported locales are en and es”; POST-VIS-06 |
| Grants and revocation | `/console/docs/grants` | Rendered text contains `Access token has been revoked` |
| Error reference | `/console/docs/errors` | Rendered text contains `Invalid client credentials`; component test also asserts `Authorization code has already been used` |
| Reference integration | `/console/docs/reference-integration` | Area resolves and renders the PrymeCab section |
| Credential placeholders, not live values | All nine areas | `expectAreaRendered` asserts, on every area visited, that `<main>` contains neither `E2E_CLIENT.clientSecret` nor `E2E_USER.password`; the Token Exchange area is additionally asserted to contain `<SECURISELF_CLIENT_SECRET>` and `scs_client_example` |

**Result.** All preserved material is present and reachable. The restructure
relocated it; the copy-button accessible names, the Radix tab semantics of the
payload reference and the code blocks themselves are unchanged.

---

## 10. Playwright Browser Validation

| Property | Value |
| --- | --- |
| Spec | `tests/e2e/specs/developer-docs.spec.ts` |
| Tests in the spec | 3 — the reused auth-boundary test (`:171`), the reused sidebar test (`:205`), the new `@post-refinement` test (`:231`) |
| Browser / project | Chromium (`devices["Desktop Chrome"]`) — **the only project configured**; no Firefox or WebKit execution was performed |
| Viewport | 1440 × 900 |
| Authentication | The project's established fixture: `clearBrowserAuthState` then `signInAsE2EOwner` with the seeded email/password against the isolated E2E database. No fabricated React auth state. |
| Database | Reseeded before every test by the auto `reseedDatabase` fixture |

**Route sequence exercised by the `@post-refinement` test**

```text
/console/docs                        (redirected to /sign-in?returnTo=/console/docs, signed in)
→ Overview                           default area, nine tabs asserted
→ /console/docs/setup                (tab click)
→ /console/docs/authorization        (tab click)
→ /console/docs/token-exchange       (tab click)
→ /console/docs/profile-api          (tab click)
→ /console/docs/contexts             (tab click)
→ /console/docs/grants               (tab click)
→ /console/docs/errors               (tab click)
→ /console/docs/reference-integration(tab click)
→ /console/docs/token-exchange       (hard navigation — prerendered route resolves)
→ /console/docs/not-an-area          (not-found page, no docs shell)
→ /console/docs/token-exchange       scroll 1600px → sticky checks → #token jump
→ /console/docs/setup                (keyboard: Tab then Enter on the tab bar)
→ /console/docs                      credential lifecycle + flow assertions
→ /console/docs/profile-api          preserved profile example
→ /console/docs/contexts             preserved payload + localization reference
→ /console/docs/token-exchange       preserved token exchange material
→ /console/docs/authorization        preserved authorization URL material
→ /console/docs/grants               preserved revocation material
→ /console/docs/errors               preserved error material
```

**Meaningful interactions:** nine tab activations by click; one activation by
keyboard (`Tab` then `Enter`); one in-page section jump from the sticky aside;
one programmatic scroll to 1600 px; four bounding-box measurements; one
deliberate unknown-slug request.

**Screenshot checkpoints:** `:260` (POST-VIS-01), `:331` (POST-VIS-02), `:418`
(POST-VIS-04), `:420` (POST-VIS-03), `:438` (POST-VIS-05), `:452` (POST-VIS-06) —
each downstream of the assertions it evidences.

**Final result.**

```text
$ pnpm test:e2e
  ✓ 1 consent-denial.spec.ts …                                              (7.2s)
  ✓ 2 developer-docs.spec.ts:171 … Console auth boundary                    (3.9s)
  ✓ 3 developer-docs.spec.ts:205 … console sidebar navigates …              (3.6s)
  ✓ 4 developer-docs.spec.ts:231 … nine focused areas behind sticky nav     (6.1s)
  ✓ 5 grant-revocation.spec.ts …                                           (11.5s)
  ✓ 6 legal-disclosure.spec.ts …                                            (8.7s)
  ✓ 7 localization.spec.ts:62 …                                             (5.3s)
  ✓ 8 localization.spec.ts:98 …                                             (9.8s)
  ✓ 9 localization.spec.ts:147 …                                            (9.4s)
  ✓ 10 privacy-boundary.spec.ts …                                          (10.9s)
  ✓ 11 social-disclosure.spec.ts …                                          (7.7s)
  11 passed (1.5m)
```

Zero retries were used in that run. Earlier runs in the same session are reported
honestly in §12.

---

## 11. Visual Evidence

Full per-screenshot analysis: [`images/post-validation-evidence.md`](./images/post-validation-evidence.md).

| Evidence ID | File | Refinement demonstrated |
| --- | --- | --- |
| POST-VIS-01 | `post-01-docs-overview.png` | Change 1 — nine focused areas inside the authenticated Console, Overview as the default |
| POST-VIS-02 | `post-02-focused-navigation.png` | Change 2 — both navigation levels still pinned after a 1600 px scroll |
| POST-VIS-03 | `post-03-credential-lifecycle.png` | Change 3 — the five-value credential/artifact reference |
| POST-VIS-04 | `post-04-authorization-flow.png` | Change 4 — the nine-step approval → code → exchange → token → profile chain |
| POST-VIS-05 | `post-05-token-profile-reference.png` | Preservation — the `GET /api/v1/profiles/me` example under the focused navigation |
| POST-VIS-06 | `post-06-context-revocation-reference.png` | Preservation — the four-category Context payload reference and localization |

All six come from the single passing `@post-refinement` execution described in
§10, at a consistent 1440 × 900 viewport, with controlled seed data and no real
credentials.

**These screenshots complement the automated assertions; they do not replace
them.** Each is written only after the assertions it illustrates have passed in
the same test, so its existence is a consequence of those assertions holding —
but the image itself evidences presentation, not behaviour. Every behavioural
claim in this document rests on an assertion, not on a frame.

The six pre-refinement screenshots (`01-…`–`06-…`) and their index
`images/evidence.md` are retained unmodified as the record of the structure the
five participants evaluated. They are no longer reproducible from the current
implementation, because the spec that produced them described the single-page
structure and was rewritten here.

---

## 12. Regression Results

All commands were run from the repository root on Chromium/macOS, against the
isolated E2E database.

| Validation layer | Command | Observed result | Interpretation |
| --- | --- | --- | --- |
| Platform component tests | `pnpm --filter securiself-platform test` | **PASS** — `Test Files 15 passed (15)`, `Tests 66 passed (66)`, 3.06 s | The refinement's rewritten docs suite and every other platform suite hold after the `console-shell` fix |
| TypeScript | `pnpm check-types` | **PASS** — `3 successful, 3 total` | No type regression across the three packages |
| ESLint | `pnpm lint` | **PASS** — `2 successful, 2 total`, no warnings | Clean. Note: the lint task covers the two app packages; `tests/e2e/**` is outside its scope |
| Production build | `pnpm build` | **PASS** — `3 successful, 3 total`; `● /console/docs/[[...area]]` prerendered with nine paths | The nine areas are real static routes, not client state |
| Playwright E2E | `pnpm test:e2e` | **11 passed (1.5m)**, 0 retries | Final run; no regression in any Console or OAuth journey after the `console-shell` change |
| Playwright E2E (earlier, same session) | `pnpm test:e2e` | 8 passed, 3 failed | All three failures identical: `page.waitForURL` timeout in `signInAsE2EOwner`, browser still on `/sign-in?returnTo=/oauth/authorize…` with credentials filled |
| Playwright E2E (earlier, same session) | `npx playwright test --grep-invert "@a11y\|@evidence\|@sprint2-evidence\|@sprint2-candidate-b-review" --retries=2` | 10 passed, 1 failed (`social-disclosure`, 3/3 attempts) | Same signature |
| Flake provenance check | `npx playwright test tests/e2e/specs/social-disclosure.spec.ts --repeat-each=3` | **3 passed (45.1s)** | The spec is not broken; the failure is order/timing dependent |
| Accessibility | `npx playwright test --grep "@a11y"` (after adding the eight docs routes) | **3 passed (34.7s)**; 24 axe scans recorded | See §13 |
| Accessibility (earlier, same session) | `npx playwright test --grep "@a11y"` | 2 passed, 1 failed — `/console/grants-revoke-dialog`, 1 serious `color-contrast` | Pre-existing Sprint 2 issue; see §13 |
| Backend tests | `pnpm test:backend` | **PASS** — `Test Files 11 passed (11)`, `Tests 67 passed (67)`, 181 s | Run as a gate although the refinement touched no backend code. No backend behaviour was modified to make any documentation test pass |

### The E2E flake

The three failures in the first full run, and the one in the retried run, share
one signature: `signInAsE2EOwner`'s `page.waitForURL` times out with the browser
still on `/sign-in?returnTo=%2Foauth%2Fauthorize…` and both fields visibly
filled — the sign-in submit did not navigate. This is the **same pre-existing
hydration race documented in `sprint5-validation.md` §9**, which reproduced there
at `HEAD` with none of the Sprint 5 changes applied, and which affected the same
specs (`privacy-boundary`, `social-disclosure`).

It cannot be attributed to the `console-shell.tsx` fix: the failure occurs on
`/sign-in`, which does not render `ConsoleShell` at all; `social-disclosure`
passes 3/3 in isolation with the fix in place; and the full suite subsequently
passed 11/11 with the fix in place and no retries. It was not fixed here, for the
same reason given in the original validation — it would mean changing shared
authentication test infrastructure from an earlier Sprint on the strength of a
symptom observed while validating documentation.

**All three Developer Docs tests passed in every execution of this session,
including the two runs where other specs flaked.**

---

## 13. Accessibility Results

### What was tested

The refinement introduced a sticky area navigation, a sticky section aside, a
five-column semantic table and a nine-item ordered list, across eight new routes.
`tests/e2e/specs/accessibility.spec.ts` previously scanned `/console/docs` only;
the eight remaining documentation routes were added to its existing route loop.

Axe configuration is unchanged: `@axe-core/playwright` with tags
`wcag2a, wcag2aa, wcag21a, wcag21aa`, failing the test on any critical or serious
violation, with moderate/minor findings attached rather than hidden.

### Automated results — all nine documentation routes

| Route | critical | serious | moderate | minor | incomplete | Result |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `/console/docs` | 0 | 0 | 0 | 0 | 1 | pass |
| `/console/docs/setup` | 0 | 0 | 0 | 0 | 1 | pass |
| `/console/docs/authorization` | 0 | 0 | 0 | 0 | 1 | pass |
| `/console/docs/token-exchange` | 0 | 0 | 0 | 0 | 1 | pass |
| `/console/docs/profile-api` | 0 | 0 | 0 | 0 | 1 | pass |
| `/console/docs/contexts` | 0 | 0 | 0 | 0 | 1 | pass |
| `/console/docs/grants` | 0 | 0 | 0 | 0 | 1 | pass |
| `/console/docs/errors` | 0 | 0 | 0 | 0 | 1 | pass |
| `/console/docs/reference-integration` | 0 | 0 | 0 | 0 | 1 | pass |

Recorded in `writeup-evidence/reports/accessibility-summary.json`.

**The one `incomplete` per route was identified rather than left unexplained.**
It is `color-contrast` on a single node — the ninth tab, *Reference Integration* —
with the axe message *“Element's background color could not be determined because
it's partially obscured by another element.”* At the accessibility suite's
1280 × 720 viewport the nine tabs exceed the bar's width and the last one is
clipped by the `overflow-x-auto` container edge. Axe reports this as *undetermined*,
not as a violation: the tab remains present in the DOM, reachable by keyboard tab
order and by horizontal scrolling, and its label is not truncated in the
accessibility tree. It is a new, minor consequence of nine tabs on a narrow
viewport and is recorded here rather than dismissed.

### Non-automated checks on the revised surfaces

| Property | How it was checked | Result |
| --- | --- | --- |
| Keyboard operation of the area navigation | Focus first tab → `Tab` → assert next tab focused → `Enter` → assert the area renders (`developer-docs.spec.ts`) | Passes. The bar is nine `next/link` elements, not an ARIA tablist, so traversal and activation are native browser behaviour with no roving-tabindex logic to get wrong |
| Semantic labels / navigation landmarks | Every navigation located by role + accessible name in both suites: `Documentation areas`, `Documentation sections`, `Documentation sections (compact)`, `Documentation sequence`, plus the Console's `Console` | All present and distinctly named |
| Current-location signalling | `aria-current="page"` asserted on exactly one tab after each of nine switches | Exactly one, always the correct one |
| No colour-only state distinction | Active tab carries `aria-current` + bottom border + font weight; server-only credentials carry a shield icon **and** the word “Never”; flow ordering carries a visible number, an `sr-only` “Step N:” prefix and text actor labels | Verified by assertion in both suites |
| Heading hierarchy | Each area asserted to render exactly its own `h2` headings under the layout's single `h1`; `H3` used for subsections | Verified per area for all nine |
| Table headers | The lifecycle table renders a `<caption>`, `<thead>` and real `<th>` cells; located in tests by its accessible name, which only a caption provides | Verified |
| Focus visibility | `focus-visible:ring-2` on tabs, section links and code-block scroll regions; focus assertions pass in the keyboard checks | Present; not measured against a contrast threshold |
| Sticky bars not obscuring focused content | After a sticky section-link activation, the target `h2`'s top edge asserted ≥ the sticky bar's bottom edge | Passes (`scroll-mt-32`) |

### Pre-existing revoke-dialog contrast issue

The first accessibility run of this session failed on
`/console/grants-revoke-dialog` with **1 serious `color-contrast` violation**:

```text
Error: Axe critical/serious violations on "/console/grants-revoke-dialog"
- [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds
```

The second run (after the docs routes were added) **passed** that scan, recording
0 violations and 2 `incomplete` — axe classified the same elements as
undetermined rather than failing, which is characteristic of a scan taken while
the dialog's backdrop/transition is still settling. Both outcomes were observed in
this session and both are reported.

This is the **known pre-existing Sprint 2 issue** described in
`sprint5-validation.md` §10. It is in the Grants revoke dialog, a surface the
documentation refinement does not touch, and it is **not attributable to the Docs
refinement**. It was not fixed here.

### Bounded conclusion

The revised Developer Docs surfaces introduce **no critical or serious axe
violation on any of their nine routes**, keyboard operation of the new navigation
works through native link semantics, and no new state is signalled by colour
alone. This is **not** a claim of full WCAG AA compliance: automated scanning
plus targeted keyboard and geometry checks cannot establish conformance, and one
`color-contrast` result per docs route remains *undetermined* rather than passing.

---

## 14. Results Summary

| Refinement objective | Validation method | Observed result | Supported conclusion |
| --- | --- | --- | --- |
| **1. Focused documentation areas** | Component: area→content resolution and per-area heading/anchor equality for all nine. Browser: nine tab activations, one hard navigation, one unknown slug. Build: prerender output | Nine areas resolve; `/console/docs` opens on Overview; each renders exactly its own sections; nine paths prerendered; unknown slug reaches the not-found page | The single continuous page has been replaced by nine independently addressable areas that switch correctly and lose no listed section |
| **2. Sticky local navigation** | Browser only, by geometry: scroll to 1600 px, `toBeInViewport()` on both landmarks, measured top edge, non-obscuring section jump, keyboard traversal, bounding-box separation from the Console sidebar | Failed on first execution (sticky was inert under `main.overflow-y-auto`); after the one-line fix, both levels stay pinned at 56–80 px, jumps clear both bars, `Tab`/`Enter` operate the bar | Sticky navigation is now genuinely sticky in the browser, keyboard-operable, and visually distinct from the Console sidebar. The CSS alone had been insufficient |
| **3. Credential lifecycle reference** | Component: five values present, exactly two `serverOnly`, both opening with “Never.”. Browser: same table located by role and asserted on rendered text | All five values present and distinguished by holder, browser exposure, stage and purpose; both server-only boundaries stated in words and icon | The reference exists in the running Console and is accurate against the implementation. **No comprehension claim** |
| **4. Authorization-code → access-token sequence** | Component and browser: nine ordered markers asserted present and in ascending order; nine list items; the `401 Invalid access token` statement | Sequence renders in the correct causal order; the code's `carries:` label stops at step 4 and the token's begins at step 7; `/oauth/token` at step 5, `/api/v1/profiles/me` at step 8 | The transition is explicitly represented, correctly ordered, and names the server-side responsibility. **No comprehension claim** |
| **Preservation of existing material** | Component: fourteen contract markers across all areas, four Context tabs, placeholders only. Browser: per-area text assertions on six areas | Context payload reference, all three request examples, `Accept-Language`, revocation and errors all present and reachable | Reorganisation improved structure without reducing technical completeness |
| **Regression** | Vitest (platform + backend), tsc, ESLint, `next build`, full Playwright E2E, axe sweep | 66/66, 67/67, 3/3, 2/2, 3/3, 11/11, 24 scans with 0 critical/serious on all docs routes | No regression introduced by the refinement or by the `console-shell` fix |

---

## 15. Interpretation

Returning to the post-validation question:

> Do the Developer Docs refinements derived from the external evaluation function
> correctly in the actual SecuriSelf Console, preserve the documented integration
> content, and avoid detected regressions in the tested Platform behaviour?

On the evidence above:

- **The focused navigation is implemented and operational.** Nine areas exist as
  prerendered routes, `/console/docs` opens on Overview, every tab switches to its
  own content, each area renders exactly its own sections, and an unknown slug
  reaches the not-found page rather than an empty documentation shell.
- **Sticky navigation remains usable during browser scrolling — after a defect was
  found and fixed.** As delivered, the sticky classes were inert, because the
  Console shell's `main` was an `overflow-y-auto` container that never scrolled.
  With that removed, both navigation levels stay pinned under real scrolling,
  section jumps clear both bars, and the bar is keyboard-operable. This is the
  single most important result of the exercise: a validation that had checked for
  `position: sticky` in the class list would have passed and been wrong.
- **The credential lifecycle reference is present** and distinguishes the
  SecuriSelf session credential, `client_id`, `client_secret`, the authorization
  code and the access token by holder, browser exposure, stage and purpose, with
  the server-only boundary stated in words as well as by icon.
- **The authorization-code → access-token transition is explicitly represented**
  as a nine-step ordered sequence in which the code is carried to step 4, the
  exchange happens at step 5, and the token appears from step 7 — with the
  “sending the code to the profile endpoint returns `401`” statement alongside it.
- **Previously documented integration areas remain accessible.** The four Context
  categories, all three request examples, `Accept-Language`, revocation and the
  error reference are present and reachable at their new URLs.
- **The tested regression suites remain valid.** 66/66 platform tests, 67/67
  backend tests, 3/3 typecheck, 2/2 lint, 3/3 build, 11/11 E2E, and 0
  critical/serious axe violations across all nine documentation routes.

The supported statement is therefore:

> **The four changes derived from the external evaluation were technically
> implemented and behaved as expected in the tested browser and component
> scenarios — after one defect in the sticky-navigation implementation was found
> by this validation and corrected.**

What is **not** concluded, and cannot be from this evidence:

> ~~The documentation is now easier for developers to use.~~

That requires another external evaluation. The five participants assessed the
previous structure; no one has yet used this one under observation.

---

## 16. Remaining Validation Boundaries

### No second external participant evaluation

The revised Developer Docs have **not** been retested with the original five
external developers, or with any other participant. This post-validation
establishes implementation correctness, not measured improvement in human
comprehension, task time, rereading or facilitator assistance. Every rating in
the external evaluation — including the 3.8/5 for “difference between credentials
and authorization artefacts was clear” and the 3.8/5 for “overall integration
sequence was easy to follow” — describes the structure that has now been
replaced, and none of them has been re-measured.

### Browser scope

Only **Chromium** was executed. The Playwright configuration defines a single
project (`devices["Desktop Chrome"]`). The sticky-navigation result in particular
is an engine-observable behaviour; it has not been confirmed in Firefox or WebKit.

### Viewport scope

Sticky behaviour was verified at 1440 × 900 and the axe sweep ran at 1280 × 720.
The mobile fallbacks — the `<details>` “On this page” disclosure below `lg`, and
the horizontally scrollable tab bar — were not exercised at a narrow viewport.
The one undetermined axe contrast result per docs route (§13) is a consequence of
nine tabs at 1280 px and would be worth revisiting alongside a narrow-viewport
pass.

### Soft 404 on unknown documentation slugs

`/console/docs/<unknown>` renders the not-found page but responds with HTTP 200,
because the Console layout's `<Suspense>` boundary streams the shell before the
page calls `notFound()`. The rendered outcome is correct; the status code is not.
This is pre-existing Console layout behaviour, was not introduced by the
refinement, and was deliberately not changed here.

### Pre-existing accessibility issue

The Grants **revoke-dialog `color-contrast`** finding is a pre-existing Sprint 2
issue, unrelated to the Docs refinement, and it remains open. It was observed as a
serious violation in one run of this session and as `incomplete` in another; both
observations are reported in §13. No claim of full WCAG AA compliance is made for
any surface.

### Pre-existing E2E flake

The sign-in hydration race described in §12 remains unfixed. It affects
`signInAsE2EOwner` on `/sign-in`, reproduces at `HEAD` without any Sprint 5
change, and was not addressed here.

### Secondary external feedback: light theme

The optional light theme requested by one participant (P01) has **not** been
implemented. Finding 9 of the external evaluation classifies it as an individual
preference rather than a group-level finding, and the refinement deferred it
explicitly. It remains an optional, lower-priority usability enhancement — not a
failed requirement of this refinement, and not something this validation
attempted to test.

### Scope of the `console-shell` fix

The `overflow-y-auto` removal is a Console-wide change, not a documentation-only
one. Its blast radius was checked by re-running the full E2E suite (11 tests
across every Console route and both OAuth journeys) and the complete axe sweep
(24 scans), both green. It has not been reviewed against any Console layout
requirement outside those suites.

---

**Evidence sources:**
[`sprint5-external-evaluation.md`](./sprint5-external-evaluation.md) ·
[`sprint5-post-evaluation-refinement.md`](./sprint5-post-evaluation-refinement.md) ·
[`images/post-validation-evidence.md`](./images/post-validation-evidence.md) ·
`writeup-evidence/reports/accessibility-summary.json`
