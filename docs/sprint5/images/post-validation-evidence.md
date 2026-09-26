# Sprint 5 — Post-Refinement Visual Evidence Index

Six permanent screenshots document the Developer Documentation surface **after**
the refinements derived from the external developer evaluation
([`sprint5-external-evaluation.md`](../sprint5-external-evaluation.md),
[`sprint5-post-evaluation-refinement.md`](../sprint5-post-evaluation-refinement.md)).

They are prefixed `post-` to keep them separate from the six pre-refinement
Sprint 5 screenshots (`01-…` – `06-…`) indexed in [`evidence.md`](./evidence.md),
which remain in place as the record of the structure the five participants
actually evaluated.

All six were produced by a single real Playwright execution of
`tests/e2e/specs/developer-docs.spec.ts`, test
**“the refined Developer Docs expose nine focused areas behind sticky
navigation”** (`@post-refinement`), which passed in the run that wrote these
files (`pnpm test:e2e` → `11 passed (1.5m)`, no retries). No screenshot was
composed, edited, mocked, or captured from a failing journey. Every capture sits
downstream of the assertions above it in the same test, so a failing assertion
means no image is written.

## Capture conditions

| Property | Value |
| --- | --- |
| Browser / project | Chromium (`devices["Desktop Chrome"]`), the only Playwright project configured |
| Viewport | 1440 × 900 (`DOCS_VIEWPORT` in the spec; wider than the shared 1280 × 720 evidence viewport because the docs tables need the width) |
| Theme | The application's default dark theme (no light theme exists — see the deferred secondary finding) |
| Session | Real email/password sign-in as the seeded E2E owner, through `/sign-in?returnTo=/console/docs` |
| Data | Deterministic E2E seed (`tests/e2e/fixtures/test-data.ts`) against the isolated E2E database |
| Animations | Disabled at capture (`animations: "disabled"`) |
| Cursor | Parked at (0, 0) before every viewport capture, so no tab keeps a hover background and reads as a second active area |

**POST-VIS-01, -02, -05 and -06** are viewport captures. **POST-VIS-03 and -04**
are element captures of a single `<section>`; before those two the spec injects
`header, nav[aria-label="Documentation areas"] { position: static !important; }`,
because both bars are sticky and would otherwise overlay the top of a section
capture. That injection happens *after* POST-VIS-02, so the real sticky behaviour
is recorded untouched.

## Credential safety

No screenshot contains a real credential. The documentation renders only
placeholders (`scs_client_example`, `<SECURISELF_CLIENT_SECRET>`,
`<AUTHORIZATION_CODE>`, `<ACCESS_TOKEN>`), and `expectAreaRendered()` asserts, on
**every one of the nine areas** as it is visited, that the rendered `<main>`
contains neither the seeded `E2E_CLIENT.clientSecret` nor `E2E_USER.password`.
POST-VIS-01, -05 and -06 show the Console topbar account chip with the truncated
seeded address `e2e.owner@securiself…`, which is fixture data and not a personal
or production identity. No session JWT, access token or authorization code is
visible in any frame; Playwright viewport captures exclude browser chrome, so no
URL-bar contents are recorded either.

---

## POST-VIS-01 — Final Developer Docs Overview

**File:** `post-01-docs-overview.png`

**Evaluation finding addressed:** Findings 2 and 4 — the documentation was one
long continuous page, and participants across both experience groups asked for it
to be divided into focused tabs or pages. This frame is also the control for the
original Sprint 5 claim (the docs are *inside* the authenticated Console), which
the restructure had to preserve.

**What the screenshot shows:** The full SecuriSelf Console shell at
`/console/docs` — the persistent left sidebar with **Developer Docs** marked as
the current page, the Console topbar, the `Developer Docs` page header with its
*Register an application* action, and directly beneath it the new **area
navigation** listing all nine focused areas (Overview, Application Setup,
Authorization, Token Exchange, Profile API, Contexts & Localization, Grants &
Revocation, Errors, Reference Integration) with **Overview** marked active by a
bottom border and a heavier font weight. Below that, the Overview area's own
“On this page” list (three entries, not twelve) and the start of the Overview
content, including the Terminology callout and the first steps of the nine-step
authorization sequence.

**Playwright source:** `tests/e2e/specs/developer-docs.spec.ts:260`, captured
immediately after the assertions that `/console/docs` resolves to the Overview
area, that the area navigation contains exactly nine links whose `href`s match
the nine expected routes, that Overview alone carries `aria-current="page"`, and
that the Overview renders exactly its own three `h2` headings.

**Supported conclusion:** The refined documentation is reachable at the same
route inside the authenticated Console, `/console/docs` opens on Overview, and
the nine focused areas exist as a visible, labelled navigation rather than as one
twelve-section scroll.

**Boundary:** The frame shows that the nine areas are *offered*; it does not by
itself show that each one resolves to its intended content. That is established
by the per-area assertions in the same test and by POST-VIS-02, -05 and -06.
It says nothing about whether developers find the new structure easier.

---

## POST-VIS-02 — Sticky navigation after scrolling

**File:** `post-02-focused-navigation.png`

**Evaluation finding addressed:** Finding 3 — sticky navigation was a recurring
request (P01, P03, P04), because the “On this page” list scrolled away and
stopped providing orientation once the reader was deep in the document.

**What the screenshot shows:** The Token Exchange area at a window scroll offset
of 1600 px. Both navigation levels are still on screen and pinned: the
**area navigation** sits immediately below the Console topbar with **Token
Exchange** marked active, and the **“On this page”** aside is still showing its
two section links. The content column has scrolled to the middle of the token
exchange code examples (the JavaScript body, the cURL example and the `200 OK`
response envelope). The left sidebar column is empty in this frame because the
Console sidebar is *not* itself sticky and has scrolled out of view — the two
Docs navigation levels are the parts that persist.

**Playwright source:** `tests/e2e/specs/developer-docs.spec.ts:331`, captured
after `window.scrollTo(0, 1600)`, after polling that `window.scrollY > 800`, and
after asserting that both navigation landmarks satisfy `toBeInViewport()` and
that the area bar's measured top edge is between 56 px and 80 px — i.e. pinned
under the 64 px topbar rather than scrolled with the page.

**Supported conclusion:** Both levels of the new documentation navigation remain
visible and correctly positioned under real browser scrolling, and the active
area stays identifiable while the reader is deep inside an area's content.

**Boundary:** This is a single scroll offset in one area at one viewport size. It
does not prove the behaviour across every area, every viewport or every browser
engine (only Chromium was executed). It does not measure whether the sticky
navigation reduces the scrolling participants described.

---

## POST-VIS-03 — Credential and authorization-artifact lifecycle

**File:** `post-03-credential-lifecycle.png`

**Evaluation finding addressed:** Finding 5 — several participants (P01, P04,
P05) reread material to separate the SecuriSelf session, `client_id`,
`client_secret`, the authorization code and the access token; P05 explicitly
asked for a credential comparison table or diagram. The rating “difference
between credentials and authorization artefacts was clear” was 3.8/5.

**What the screenshot shows:** The Overview area's “Credentials and authorization
artifacts” section: a five-row table with the columns **Value**, **Held by**,
**Browser exposure**, **Stage of the flow** and **Purpose**, one row for each of
the five values. Each “Held by” cell shows an icon **and** a text label
(SecuriSelf / Browser / Your server); the authorization code row carries two,
separated by the word “then”, because it is the one value that crosses the
boundary. The two server-only rows (`client_secret`, `access_token`) open their
exposure cell with a shield icon and the word **“Never.”**. The code's row states
it is single-use, expires per `AUTH_CODE_TTL_MINUTES`, and that
`/api/v1/profiles/me` rejects it; the session row states it is never sent to your
application and is not accepted by `/api/v1/profiles/me`.

**Playwright source:** `tests/e2e/specs/developer-docs.spec.ts:420`, captured
after asserting that the table is present by its accessible name, that its
rendered text contains all five values, that both “Never.” exposure statements
are present as words, and that both boundary labels (“Browser”, “Your server”)
render as text.

**Supported conclusion:** The refined interface contains the credential/artifact
reference implemented in response to the observed comprehension friction, it
distinguishes all five values along holder, browser exposure, stage and purpose,
and the server-only boundary is communicated in words and icon rather than by
colour alone.

**Boundary:** This demonstrates the existence, structure and accuracy of the new
explanation. It does not establish that external developers now distinguish the
concepts more quickly or with less rereading — the participants evaluated the
previous structure, and that claim requires a further participant evaluation.

---

## POST-VIS-04 — Authorization-code → access-token sequence

**File:** `post-04-authorization-flow.png`

**Evaluation finding addressed:** Finding 5's most frequent single confusion —
authorization code versus access token — together with the “overall integration
sequence was easy to follow” rating of 3.8/5.

**What the screenshot shows:** The Overview area's “End-to-end authorization
sequence”: a numbered nine-step ordered list running from *the identity owner
selects one Context and approves* to *the Context-filtered profile is returned*.
Every step carries an actor label (SecuriSelf / Browser / Your server) and, where
applicable, a monospaced `carries:` tag. The `carries: authorization code` tag
appears on steps 2, 3 and 4 and then stops; step 5 is the server-to-server
`POST /oauth/token`; `carries: access_token` appears only from step 7 onwards,
including step 8, `Your server calls GET /api/v1/profiles/me`. Below the list, the
callout “The authorization code and the access token are different values”
states that sending the code to the profile endpoint returns
`401 Invalid access token`.

**Playwright source:** `tests/e2e/specs/developer-docs.spec.ts:418`, captured
after asserting that `#flow` renders exactly nine list items and that nine ordered
text markers — approval, code creation, callback return, server receipt,
`client_secret`, validation, token return, the profile call and the filtered
response — appear in the rendered flow text in that order, and that the
“Sending the code to the profile endpoint returns” statement is visible.

**Supported conclusion:** The causal chain
`approval → code → server exchange → access token → profile` is explicitly
represented in the final implementation, in the correct order, with the code and
the token visibly distinct and the server-side responsibility named at the step
where it occurs.

**Boundary:** Order and presence are verified; comprehension is not. The frame
also does not re-verify the backend contract it describes — that is covered by
the backend suite (11 files, 67 tests) and the OAuth E2E specs.

---

## POST-VIS-05 — Profile API reference under the focused navigation

**File:** `post-05-token-profile-reference.png`

**Evaluation finding addressed:** Finding 7 and Change 5 — the request/code
examples rated 4.6/5 with all five participants at 4–5, so the restructure was
required to move them, not rewrite or lose them.

**What the screenshot shows:** `/console/docs/profile-api` with **Profile API**
marked active in the sticky area navigation. The area renders the
`GET <SECURISELF_API_URL>/api/v1/profiles/me` endpoint line, the
`Authorization: Bearer <ACCESS_TOKEN>` requirement, the unchanged “Profile
request — your server” code block (including the optional `Accept-Language`
header and the `401` handling comment) with its copy control, and the beginning
of the response-envelope section.

**Playwright source:** `tests/e2e/specs/developer-docs.spec.ts:438`, captured
after a hard `page.goto` to the route (proving the prerendered URL resolves
directly, not only through client-side navigation), after `expectAreaRendered`
confirmed the area's single expected `h2` and its `aria-current` tab, and after
asserting that the rendered text contains `/api/v1/profiles/me`,
`Authorization: Bearer <ACCESS_TOKEN>` and `Accept-Language`, and that the
labelled copy button is present.

**Supported conclusion:** The request examples participants rated highly survive
the restructure intact, are reachable at their own URL, and are presented with
the focused area navigation around them.

**Boundary:** One area of nine is shown. The equivalent examples for the
authorization URL and `POST /oauth/token` are asserted in the same test (and
`POST /oauth/token` is visible in POST-VIS-02) but are not each given a separate
frame.

---

## POST-VIS-06 — Context payload and localization reference

**File:** `post-06-context-revocation-reference.png`

**Evaluation finding addressed:** Finding 6 and Change 5 — the Context payload
reference rated 4.6/5 with all five participants at 4–5, and Finding 2 required
that reorganisation not reduce technical completeness. This frame is the check
that the highest-rated section was moved without being altered.

**What the screenshot shows:** `/console/docs/contexts` with **Contexts &
Localization** marked active in the sticky area navigation and a two-entry “On
this page” aside (Context payload reference, Localization and Accept-Language).
The content shows the unchanged four-category tab set —
**Professional / Legal / Social / Private** — with Professional selected, its
`PROFESSIONAL` payload preview (`display_name`, `pronouns`, `job_title`,
`company`, `short_bio`, `avatar_url`) and its copy control, and the start of the
Disclosure matrix below.

**Playwright source:** `tests/e2e/specs/developer-docs.spec.ts:452`, captured
after a hard `page.goto` to the route, after `expectAreaRendered` confirmed the
area's two expected `h2` headings, and after asserting that all four category
tabs are visible and that the rendered text contains `Accept-Language` and
“Supported locales are en and es”.

**Supported conclusion:** The Context payload reference and the localization
guidance remain present, unmodified in structure, and reachable at their own URL
after the split — the restructure relocated the highest-rated material rather
than reducing it.

**Boundary:** Grants/revocation and the error reference are not in this frame;
they live on `/console/docs/grants` and `/console/docs/errors` and are verified
by text assertions in the same test (`Access token has been revoked`,
`Invalid client credentials`) rather than by a dedicated screenshot, to stay
within the 5–6 meaningful-frame budget.

---

## What these screenshots do not do

They complement the automated assertions; they do not replace them. Every frame
is written only after the assertions that precede it in the same test, so an
image existing is evidence that those assertions held — but the image itself
proves presentation, not behaviour. Behaviour is established by
`developer-docs.spec.ts` (browser), `developer-docs.test.tsx` (component) and
the backend and E2E suites, as recorded in
[`../sprint5-post-validation.md`](../sprint5-post-validation.md).

None of these frames measures human comprehension. The revised implementation has
**not** been retested with the original five external developers or with any
other participant.

---

## Note on the pre-refinement screenshots

`01-authenticated-developer-docs.png` – `06-revocation-errors-reference.png` and
their index [`evidence.md`](./evidence.md) describe the single-page structure the
five participants evaluated. They are retained deliberately as the record of the
evaluated baseline. They are **no longer reproducible from the current
implementation**: the spec that produced them asserted twelve section headings on
one page and a twelve-entry navigation list, and it was rewritten for the nine
focused areas during this post-validation. Regenerating them would require
checking out the pre-refinement implementation.
