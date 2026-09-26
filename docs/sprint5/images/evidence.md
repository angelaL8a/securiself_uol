# Sprint 5 — Visual evidence index

Six permanent screenshots document the Sprint 5 Developer Documentation surface.
All of them were produced by a single real Playwright execution of
`tests/e2e/specs/developer-docs.spec.ts`, test
**“an authenticated owner reaches Developer Docs through the Console auth
boundary”**, which passed in the run that wrote these files
(`pnpm exec playwright test --grep-invert "@a11y|@evidence|@sprint2-evidence|@sprint2-candidate-b-review" --retries=2` → `10 passed`).
No screenshot was composed, edited, mocked or captured from a failing journey.

## Capture conditions

| Property | Value |
| --- | --- |
| Browser / project | Chromium (`devices["Desktop Chrome"]`), the only Playwright project configured |
| Viewport | 1440 × 900 (`DOCS_VIEWPORT` in the spec; wider than the shared 1280 × 720 evidence viewport because the docs tables need the width) |
| Theme | The application's default dark theme |
| Session | Real email/password sign-in as the seeded E2E owner, through `/sign-in?returnTo=/console/docs` |
| Data | Deterministic E2E seed (`tests/e2e/fixtures/test-data.ts`) against the isolated E2E database |
| Animations | Disabled at capture (`animations: "disabled"`) |

**Screenshot 01** is a viewport capture. **Screenshots 02–06** are element
captures of a single `<section>`, so each frame contains exactly one
documentation topic. Before the element captures the spec injects
`header { position: static !important; }`; the Console topbar is
`position: sticky` and would otherwise overlay the first ~64 px of any section
capture. This affects only the detail shots — the real sticky shell is recorded
untouched in screenshot 01.

## Credential safety

No screenshot contains a real credential. The documentation renders only
placeholders (`scs_client_example`, `<SECURISELF_CLIENT_SECRET>`,
`<AUTHORIZATION_CODE>`, `<ACCESS_TOKEN>`), and the capturing test asserts, before
taking the section shots, that the page contains `<SECURISELF_CLIENT_SECRET>` and
does **not** contain the seeded `E2E_CLIENT.clientSecret` or `E2E_USER.password`.
Screenshot 01 shows the Console topbar account chip with the truncated seeded
test address `e2e.owner@securiself…`, which is fixture data from
`tests/e2e/fixtures/test-data.ts` and not a personal or production identity. No
session JWT, access token or authorization code is visible in any frame;
Playwright viewport captures exclude browser chrome, so no URL bar contents are
recorded either.

---

## S5-VIS-01 — Authenticated Developer Docs inside the Console

**File:** `01-authenticated-developer-docs.png`

**Evidence source:** `tests/e2e/specs/developer-docs.spec.ts:65` — captured
immediately after the assertions that the Console sidebar link carries
`aria-current="page"` and that the `<h1>` reads “Developer Docs”.

**What the screenshot shows:** The full SecuriSelf Console shell at
`/console/docs` — the persistent left sidebar with **Developer Docs**
highlighted as the current page between *Clients* and *Grants*, the Console
topbar with the “Local environment” badge and the signed-in account chip, the
`Developer Docs` page header with its *Register an application* action, the
“On this page” navigation listing all twelve numbered sections, and the
**Overview** section including the six-step *Integration at a glance* sequence
and the OAuth-like terminology disclaimer.

**Why this evidence matters:** This is the primary claim of Sprint 5 — that the
documentation is a route inside the authenticated Console rather than a separate
documentation application. The frame shows the Console chrome, the sidebar entry
and the documentation content simultaneously, which no component test can show.

**What can be concluded:** A browser session authenticated through the ordinary
SecuriSelf email/password sign-in reaches `/console/docs`, and the route renders
inside the Console shell with the navigation entry marked active and the full
section index present.

**What it does not prove:** It does not prove that the documented contract is
technically accurate, nor that the twelve listed sections contain correct
content — the section index is a list of links in this frame. Section content is
evidenced by screenshots 02–06 and by the automated assertions in
`developer-docs.spec.ts` and `developer-docs.test.tsx`.

---

## S5-VIS-02 — Browser / server credential boundary

**File:** `02-browser-server-security-boundary.png`

**Evidence source:** `tests/e2e/specs/developer-docs.spec.ts:65` — element
capture of `#credentials`.

**What the screenshot shows:** The *Credentials and the security boundary*
section: a six-row table classifying `client_id`, `redirect_uri`, the
authorization code, `client_secret`, `access_token` and the SecuriSelf session
JWT as **Browser**, **Your server** or **SecuriSelf**-only, each with a one-line
description; followed by the prose explaining that `client_secret` must never
reach browser JavaScript (naming `NEXT_PUBLIC_*` variables and bundles as
exposure paths), the consequence of a leaked secret, and that the access token is
equally server-side and is held in an `httpOnly` cookie by the reference
integration.

**Why this evidence matters:** This is the most security-relevant documentation
outcome of the Sprint. The single most common integration mistake against an
authorization-code flow is shipping the client secret to the browser; this
section is the artefact that prevents it, and the screenshot shows it exists in
a form a developer can act on.

**What can be concluded:** The Developer Docs explicitly document which of the
six credentials may cross into the browser and which may not, and state the
consequence of violating that boundary.

**What it does not prove:** It does not prove that the SecuriSelf backend
enforces the boundary. That the token endpoint actually rejects a request with a
wrong or missing client secret is proven by `apps/api-backend/tests/security.test.ts`,
not by this image.

---

## S5-VIS-03 — Profile request and context-bound response

**File:** `03-profile-request-and-response.png`

**Evidence source:** `tests/e2e/specs/developer-docs.spec.ts:65` — element
capture of `#profile`.

**What the screenshot shows:** The *Retrieve the context-bound profile* section:
the `GET <SECURISELF_API_URL>/api/v1/profiles/me` endpoint line, the statement
that the scheme `Authorization: Bearer <ACCESS_TOKEN>` is matched
case-sensitively, a server-side JavaScript example carrying the `<ACCESS_TOKEN>`
placeholder, an optional `Accept-Language: "es"` header and a `401` handling
comment noting there is no refresh token; then the `200 OK` response envelope for
a `PROFESSIONAL` Context showing `status`, `context` and a `data` object of
`display_name`, `pronouns`, `job_title`, `company`, `short_bio` and `avatar_url`;
then the prose stating that `data` is assembled field by field from the
category's allow-list rather than by removing fields from a user record, that
keys are `snake_case`, that an unset `pronouns` resolves to the literal string
`"hidden"`, and that every read is written to Activity as `PROFILE_READ`.

**Why this evidence matters:** It is the request/response example a third-party
developer copies, and it demonstrates that the example uses placeholders in place
of live credentials.

**What can be concluded:** The documentation renders a complete,
placeholder-only example of the profile endpoint together with a
context-filtered response shape.

**What it does not prove:** It does not prove that the backend actually returns
that payload, that the privacy filter withholds vault fields, or that a
`PROFILE_READ` entry is written. Those are proven by
`apps/api-backend/tests/privacy.test.ts`, `audit.test.ts` and the browser
disclosure specs (`social-disclosure.spec.ts`, `legal-disclosure.spec.ts`,
`privacy-boundary.spec.ts`). Note also that the rendered payload in this frame is
generated at render time by the shared `buildProfilePayload` helper, so it is
consistent with the Console's own privacy rules — but that is a same-repository
consistency property, not backend evidence.

---

## S5-VIS-04 — Context payload reference

**File:** `04-context-payload-reference.png`

**Evidence source:** `tests/e2e/specs/developer-docs.spec.ts:65` — element
capture of `#payloads`, with the default **Professional** tab selected.

**What the screenshot shows:** The *Context payload reference* section: the four
category tabs **Professional / Legal / Social / Private**; the selected
`PROFESSIONAL` description; the generated `PROFESSIONAL` payload; the
**Disclosure** matrix marking Document ID, Root email, Gender and Legal name as
**Blocked** and Display name, Job title & company, Short bio and Avatar as
**Shared**, each with a text label as well as an icon; the note that *Shared* rows
can appear in `data` and *Blocked* rows are never returned; the line
`Localisable fields: pronouns, job_title, short_bio`; and the alert stating that
account email, gender and the Google account identifier are excluded from every
category while legal name and document ID are disclosed only under a `LEGAL`
Context.

**Why this evidence matters:** Requirement F of the Sprint asks that the four
supported Context categories be represented. The frame shows all four as
selectable tabs and one of them fully expanded.

**What can be concluded:** All four `ContextCategory` values are present in the
documentation as selectable payload references, and the `PROFESSIONAL` reference
renders its payload, its disclosure matrix and its localisable fields.

**What it does not prove:** It shows one tab open; the other three panels are
evidenced by the automated assertions rather than by this image
(`developer-docs.test.tsx` asserts all four tabs exist and that every
`ContextCategory` appears in the locale table; `developer-docs.spec.ts` asserts
the four tabs are visible in the browser). It proves nothing about backend
privacy enforcement — `apps/api-backend/tests/privacy.test.ts` and
`lifecycle.test.ts` remain the evidence that the API withholds those fields.

---

## S5-VIS-05 — Localization and `Accept-Language` reference

**File:** `05-localization-reference.png`

**Evidence source:** `tests/e2e/specs/developer-docs.spec.ts:65` — element
capture of `#localization`.

**What the screenshot shows:** The *Localization and Accept-Language* section:
the statement that `Accept-Language` on `GET /api/v1/profiles/me` selects the
language of localisable fields and that the supported locales are `en` and `es`;
the alert **“Language does not widen disclosure”** explaining that language
selection changes the value of an already-authorized field and does not expand
the allow-list; the header-parsing rules (`q`-ordering, region subtags collapsing
to the primary tag, first supported tag wins, `*` ignored); the per-field
fallback rule including `pronouns` resolving to `"hidden"`; and the table listing
all four categories against their localisable response fields
(`PROFESSIONAL` → `pronouns, job_title, short_bio`; `LEGAL` → None;
`SOCIAL` → `pronouns`; `PRIVATE` → `pronouns`).

**Why this evidence matters:** Requirement G asks that localization documentation
not imply that language selection widens privacy permissions. The alert in this
frame states the opposite explicitly, and the table bounds localization to a
named per-category field set.

**What can be concluded:** The documented supported locales (`en`, `es`) match
`SUPPORTED_LOCALES` in `apps/api-backend/src/lib/locale.ts`, and the
documentation states in the surface itself that localization does not expand
disclosure.

**What it does not prove:** It does not prove that the backend parses
`Accept-Language` as described or falls back per field as described. That is
proven by `apps/api-backend/tests/locale.test.ts` (12 tests) and
`localization.test.ts` (9 tests), plus the browser evidence in
`tests/e2e/specs/localization.spec.ts`. The correspondence between the rendered
table and the backend's actual localisable fields is a manually maintained
mapping (`LOCALISABLE_RESPONSE_FIELDS`); the type system guarantees only that
every category has an entry, not that each entry is correct.

---

## S5-VIS-06 — Failure, revocation and error reference

**File:** `06-revocation-errors-reference.png`

**Evidence source:** `tests/e2e/specs/developer-docs.spec.ts:65` — element
capture of `#errors`.

**What the screenshot shows:** The *Error reference* section: the standard error
envelope and the validation-error envelope side by side, then three
condition → expected-behaviour tables. **Authorization** covers an unsigned-in
owner, unregistered `client_id`, `redirect_uri` mismatch, malformed query,
consent denial (`403 Authorization request was denied by the user`) and a Context
that does not belong to the owner. **Token exchange** covers unknown client,
incorrect client secret (`401 Invalid client credentials`), unknown code, a code
issued to another application, `redirect_uri` mismatch, an expired code and a
replayed code (`400 Authorization code has already been used`). **Profile read**
covers a missing/non-Bearer header, an unrecognised token, a revoked Grant
(`401 Access token has been revoked`) and an expired token, closing with the note
that a `401` is never recoverable by retrying.

**Why this evidence matters:** Requirement H asks that the documentation
represent failure and lifecycle states, not only the happy path. This frame shows
invalid secret, redirect mismatch, expired and consumed codes, invalid tokens and
Grant revocation all documented with their exact status codes and messages.

**What can be concluded:** The Developer Docs document the failure surface of all
three integration endpoints, including the revocation outcome a third-party
application will observe.

**What it does not prove:** It does not prove that the backend actually produces
those responses. `apps/api-backend/tests/security.test.ts` (10 tests) covers
expired/replayed codes, wrong secret and redirect URI, and manipulated or revoked
tokens; `grants-idempotent.test.ts` covers idempotent revocation; and
`tests/e2e/specs/grant-revocation.spec.ts` and `consent-denial.spec.ts` cover the
browser-level outcomes. This screenshot documents the reference, not the
enforcement. The narrative Grants/revocation section (`#grants`) is not captured
as a separate image because its normative outcome — `401 Access token has been
revoked` — appears in the Profile-read table in this frame; its presence is
asserted automatically in both the component and browser tests.
