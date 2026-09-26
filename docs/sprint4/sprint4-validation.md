# Sprint 4 — Validation and Evidence Package

**Subject:** Google Sign-In / Sign-Up in SecuriSelf
**Executed:** 2026-08-23
**Implementation under validation:** `docs/sprint4/sprint4-implementation.md`
**Visual evidence:** 8 manual screenshots in `docs/sprint4/images/`
(capture rules in `docs/sprint4/images/README.md`)

---

## 1. Validation Objective

Sprint 4 added a second front door to an identity platform. The value of
SecuriSelf begins *after* authentication — Vault → Contexts → consent →
filtered disclosure — so the question this validation has to settle is not
"does Google sign-in work" in isolation. It is:

> **Can Google authenticate a SecuriSelf identity owner without changing
> anything about who that owner is or what the world can see of them?**

Concretely, five properties had to survive the change:

| # | Property | Why it is load-bearing |
| --- | --- | --- |
| P1 | The **existing SecuriSelf account** is preserved | A person who already has an account must not acquire a second, empty one. Every `Context`, `Application`, `Grant`, `AccessToken` and `AuditLog` row is keyed on `User.id`; a duplicate account silently orphans all of it. |
| P2 | The **existing session model** is preserved | Google must issue the same `JWT_SECRET`-signed bearer token that `authUser` already validates, not a parallel session mechanism. |
| P3 | **Vault and Context ownership** is preserved | The owner's Vault data and Contexts must remain attached to the same `User` row and readable through a Google-issued session. |
| P4 | **`returnTo` behaviour** is preserved | The PrymeCab → SecuriSelf consent journey parks the full `/oauth/authorize?...` URL in `returnTo`. If Google auth drops it, the third-party integration silently breaks. |
| P5 | The **contextual disclosure and privacy rules** are unchanged | Google profile claims must not become third-party-visible data, and `/api/v1/profiles/me` filtering must behave identically. |

A sixth, negative property is equally part of the objective: **an invalid or
unverified Google credential must authenticate nobody and create nothing.**

---

## 2. Validation Strategy

Four layers were used. They are not interchangeable — each proves something the
others structurally cannot, and each has a boundary it cannot cross.

### 2.1 Backend integration tests (Vitest + supertest + real PostgreSQL)

*What they can prove.* Everything that happens **after** a Google identity has
been established: account resolution and linking, row counts, session issuance,
what the API does and does not serialise, and the full consent → token →
`/api/v1/profiles/me` disclosure chain. These run the real Express app, real
Prisma against a real Neon PostgreSQL database, real bcrypt and real JWTs.

*What they cannot prove.* They cannot verify a real Google-signed token.
`verifyGoogleIdToken` is stubbed in `google-auth.test.ts` — deliberately, at the
single narrow boundary that requires live Google infrastructure.

*Why this layer is necessary.* P1, P3 and P5 are database-shaped claims.
"No duplicate account" is only meaningful as an assertion on `user.count()`
against a real database with a real unique index; a mocked repository would
prove nothing.

### 2.2 Frontend unit and component tests (Vitest + Testing Library + jsdom)

*What they can prove.* That the browser code assembles the flow correctly: that
the Google credential is posted to the right endpoint with the right body, that
the resulting session is written to the same store and the same `localStorage`
key as password auth, that `returnTo` is resolved by the same function, and that
the open-redirect branch behaves.

*What they cannot prove.* Nothing about real network behaviour, real Google
Identity Services, or real rendering. `fetch` and `next/navigation` are stubbed.

*Why this layer is necessary.* P4 is a *client-side* property. The `returnTo`
value never reaches the backend — it lives entirely in the browser — so no
backend test can cover it.

### 2.3 Regression suites (backend privacy/security/ownership, axe)

*What they can prove.* That Sprint 4 broke nothing. The disclosure suites are
the direct evidence for P5, and the password-auth suites are the evidence that
the original front door still works.

*What they cannot prove.* They say nothing about Google itself — by design. The
accessibility run executes against a build with no
`NEXT_PUBLIC_GOOGLE_CLIENT_ID`, so the Google button is not even rendered. Their
value is precisely that they are the **unchanged** pre-Sprint-4 behaviour.

### 2.4 Manual runtime validation (real Google, real browser, executed by hand)

*What it can prove.* The one boundary no automated layer can cross: Google's own
account chooser, a genuinely Google-signed ID token, and its acceptance by the
backend after signature and `aud` verification against a real Google Cloud OAuth
client. It is also the only layer that shows the journey as a person actually
experiences it:

```
PrymeCab → SecuriSelf → real Google authentication → SecuriSelf session →
restored authorization request → Context selection →
PrymeCab context-filtered profile
```

*What it cannot prove.* Anything that is not on the screen. Row counts,
`user.count()`, what `serializeUser` omits, what the ID token contained and what
the database actually stored are **not** visually observable and are never
claimed from a screenshot.

*Why this layer is necessary.* Sprint 4's premise is a real external identity
provider. This layer was executed by hand against the real running application
with a real Google Cloud client ID configured in both `apps/api-backend/.env`
and `apps/securiself-platform/.env.local`. The eight screenshots in §7 are the
record of that execution — observations, not test output.

---

## 3. Existing Test Evidence

These tests existed before this validation began (they were delivered with the
Sprint 4 implementation). All were executed; results are from the runs recorded
in §6.

### 3.1 `apps/api-backend/tests/google-auth.test.ts` (8 pre-existing tests)

Real Express app, real PostgreSQL, real JWT, real consent flow; only
`verifyGoogleIdToken` stubbed.

| Test | Behaviour exercised | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| creates a SecuriSelf account for a new Google user | `POST /api/v1/auth/google` with an unknown Google `sub` | `200`; account created; email lower-cased; `passwordHash`, `legalFirstName`, `legalLastName` all `null` | as expected | **PASS** |
| never returns the Google subject to the client | Response body of the same call | `user` has no `googleId` and no `passwordHash` | as expected | **PASS** |
| returns the SAME account for a returning Google user | Two sign-ins with the same `sub` | identical `user.id`; `user.count() === 1` | as expected | **PASS** |
| links an existing email/password account instead of duplicating it | Register a password user + a Context, then Google sign-in on the same email in different case | same `user.id`; `user.count() === 1`; the Context is listed through the Google-issued token; the original password login still returns `200` | as expected | **PASS** |
| rejects an invalid Google credential | Verifier throws | `401`; `user.count() === 0` | as expected | **PASS** |
| rejects a request without a credential | Empty body | Zod `400`; verifier never called | as expected | **PASS** |
| issues a session token accepted by the existing session middleware | Google token against `GET /api/v1/auth/me` and `PUT /api/v1/vault` | both `200` | as expected | **PASS** |
| discloses only context fields through the full consent flow | Google account → Vault → SOCIAL + LEGAL contexts → authorize → code → token → `/api/v1/profiles/me` | category allow-lists honoured; root email absent from the payload | as expected | **PASS** |

### 3.2 `apps/api-backend/tests/google-id-token.test.ts` (2 tests)

Exercises the **real** verifier with no mock.

| Test | Behaviour exercised | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| reports 503 when no Google client ID is configured | `GOOGLE_CLIENT_ID` unset | `ApiError` status `503` | as expected | **PASS** |
| rejects a credential that is not a Google-signed ID token | `"not.a.jwt"` through `google-auth-library` | `ApiError` status `401` | as expected | **PASS** |

### 3.3 `apps/securiself-platform/src/features/auth/return-to.test.ts` (3 tests)

| Test | Behaviour exercised | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| preserves the PrymeCab → SecuriSelf consent URL | `resolveReturnTo()` with the full `/oauth/authorize?...` URL | returned verbatim | as expected | **PASS** |
| falls back to the console when no returnTo is present | `null` / `undefined` / `""` | `/console` | as expected | **PASS** |
| rejects external and protocol-relative redirects | `https://evil.test/…`, `//evil.test/…`, `/\evil.test/…` | all → `/console` | as expected | **PASS** |

Because `useGoogleSignIn` and `useLogin` call the same function, this covers
both auth paths.

### 3.4 `apps/securiself-platform/src/features/auth/components/google-sign-in-button.test.tsx`

| Test | Behaviour exercised | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| renders the Google button with the configured client ID | GIS `initialize` + `renderButton` | called with `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; container present | as expected | **PASS** |
| submits the Google credential to the SecuriSelf session mutation | GIS callback with a credential | credential forwarded to the mutation | as expected | **PASS** |
| forwards returnTo so the consent flow is preserved | `returnTo` prop | passed into `useGoogleSignIn` | as expected | **PASS** |

### 3.5 Pre-existing regression suites (executed, unmodified)

Backend: `privacy`, `security`, `ownership`, `lifecycle`, `audit`,
`localization`, `locale`, `functional`, `grants-idempotent`.
Platform: `auth-store`, `api-client`, `context-rules`, `schemas`,
`context-label`, and the five `grants` suites.
Accessibility: `accessibility.spec.ts` (3 tests).

Results in §6.

---

## 4. Coverage Review

Each row was checked against the tests that existed **before** this validation.

| Required behaviour | Covered before? | By what |
| --- | --- | --- |
| Successful Google authentication | **Yes** | `google-auth.test.ts` — new user, returning user, linked user |
| New Google-backed SecuriSelf user | **Yes** | "creates a SecuriSelf account for a new Google user" |
| Returning Google user | **Yes** | "returns the SAME account for a returning Google user" |
| Existing-account handling, no duplicate accounts | **Yes** | "links an existing email/password account…", asserting `user.count() === 1` |
| Invalid / failed Google authentication | **Yes** | `401` + `user.count() === 0`; `400` on missing credential; real verifier `401`/`503` |
| Session creation (backend) | **Yes** | "issues a session token accepted by the existing session middleware" |
| Preservation of existing **Contexts** | **Yes** | Context read through the Google-issued token after linking |
| Preservation of existing **Vault** | **PARTIAL — gap G1** | The linking test created a Context but never wrote Vault fields, so no test asserted that Vault contents survive linking |
| `returnTo` after authentication | **PARTIAL — gap G2** | `resolveReturnTo()` was tested in isolation and the button was tested to *forward* `returnTo`, but nothing asserted that a **successful Google response actually establishes the session and navigates to that `returnTo`**. Both halves passed with the middle untested |
| Google auth during the PrymeCab → SecuriSelf consent journey | **NO — gap G3** | Covered only as a string in a unit test. Nothing exercised the journey against the real provider |
| No regression in `/api/v1/profiles/me` | **Yes** | `privacy`, `security` suites + the Google-account consent test |
| No new disclosure of root email or forbidden fields | **Yes** | `serializeUser` strips `googleId`; explicit `not.toContain(rootEmail)` assertions |
| Existing email/password auth still working | **Yes** | Full backend + platform suites; plus the explicit password-login assertion inside the linking test |

**Three gaps, all real, all inside Sprint 4's own scope.** G1 and G2 are
assertion gaps in existing suites; G3 is a whole missing layer. Nothing outside
Sprint 4 was added.

---

## 5. Additional Coverage Added

### 5.1 G1 — Vault preservation across Google linking

*Why the existing evidence was insufficient.* P3 names Vault **and** Context
ownership. Only Context ownership was asserted. `loginWithGoogle` issues a
`prisma.user.update` against the existing row, and nothing proved that update
leaves the rest of the row alone.

*Where.* `apps/api-backend/tests/google-auth.test.ts` — new test
*"preserves the existing Vault when linking Google to an account"*.

*What it validates.* A password account writes a full Vault
(`displayName`, `gender`, `avatarUrl`, plus `legalFirstName`/`legalLastName`
from registration). Google then signs in on the same email. `GET /api/v1/vault`
**through the Google-issued token** must return the same object.

*Result.* **PASS** — and it caught something on the first run. The initial
assertion `expect(vaultAfter).toEqual(vaultBefore)` **FAILED**: `updatedAt`
differs (`…57.556Z` → `…57.938Z`), because linking writes `googleId` onto the
same row. That is the correct and intended behaviour — one row updated, no data
replaced, nothing recreated — so the assertion was tightened to exclude
`updatedAt` and to check each preserved field explicitly, including that
`googleId` is absent from the Vault response. The failure is recorded here
because it is exactly the kind of detail an "expected to pass" test would have
hidden.

### 5.2 G2 — the Google → session → `returnTo` composition

*Why the existing evidence was insufficient.* `google-sign-in-button.test.tsx`
mocks `../hooks` away entirely, and `return-to.test.ts` tests a pure function.
The link between them — mutation succeeds → session stored → router navigates —
was asserted by neither.

*Where.* `apps/securiself-platform/src/features/auth/google-session.test.tsx`
(new, 3 tests). Only `fetch` and `next/navigation` are stubbed; the real
`api-client`, real `useGoogleSignIn`, real auth store and real React Query run.

*What it validates.*

1. *exchanges the credential for a SecuriSelf session and restores returnTo* —
   the request goes to `/api/v1/auth/google` as a `POST` with body
   `{ credential }` and **no** `Authorization` header; the session token and
   user land in the auth store, in `localStorage` under `securiself.auth`, and
   in the `auth.me` query cache; and `router.replace` is called with the full
   PrymeCab consent URL **verbatim**.
2. *falls back to the console when Google auth started without returnTo* —
   `router.replace("/console")`.
3. *leaves no session behind when the backend rejects the credential* — a `401`
   yields an `ApiError`, no token in the store, nothing in `localStorage`, and
   no navigation.

*Result.* **3/3 PASS.**

### 5.3 G3 — the Sprint 4 journey against the real provider

*Why the existing evidence was insufficient.* No automated layer executes Google
authentication: the frontend suites run in jsdom with Google Identity Services
stubbed, and no genuinely Google-signed ID token can be minted in an automated
environment. Nothing had exercised the PrymeCab consent journey through the real
provider.

*Where.* Manual runtime validation (§2.4), executed by hand against the real
running application with a real Google Cloud OAuth client configured in both
`apps/api-backend/.env` and `apps/securiself-platform/.env.local`, and recorded
as the eight screenshots in §7.

*What it validates.* The whole journey composing with the real provider:
PrymeCab → `/sign-in` carrying `returnTo` → Google's own account chooser on
`accounts.google.com` → a genuinely Google-signed credential accepted by the
backend → the restored `/oauth/authorize` consent screen listing the account's
pre-existing Context → Context selection → PrymeCab rendering the
context-filtered profile. Plus the second journey: an unknown Google identity
landing on the `/console` fallback with zero Contexts and an empty Vault.

*Result.* Executed and observed. Every claim drawn from it is limited to what is
visible on screen; row counts and payload contents remain the automated suites'
evidence.

**No test was added to increase a count.** Each addition closes a named gap in
the table in §4.

---

## 6. Test Execution and Results

All commands were run on **2026-08-23** from the repository root against the
project's isolated Neon PostgreSQL test database.

### 6.1 Summary

| Suite | Command | Result |
| --- | --- | --- |
| Backend integration | `pnpm test:backend` | **67/67 tests passed** (11 files, 204.15s) |
| Platform unit/component | `pnpm test:platform` | **55/55 tests passed** (14 files, 2.87s) |
| Accessibility | `pnpm test:a11y` | **2/3 tests passed, 1 failed** (31.5s) — pre-existing, see 6.4 |
| Lint | `pnpm lint` | **3/3 workspaces successful** |
| Type check | `pnpm check-types` | **3/3 workspaces successful** |

**Skipped tests: 0** across every suite executed above — no test in any of
them is marked `skip`, `todo` or `fixme`.

### 6.2 Backend integration — `pnpm test:backend`

```
Test Files  11 passed (11)
     Tests  67 passed (67)
  Duration  204.15s
```

Pre-Sprint-4 baseline at `HEAD`: 9 test files (verified with
`git ls-tree -r --name-only HEAD apps/api-backend/tests/`). Sprint 4 adds
`google-auth.test.ts` and `google-id-token.test.ts`; this validation adds one
test to the former.

### 6.3 Platform unit/component — `pnpm test:platform`

```
Test Files  14 passed (14)
     Tests  55 passed (55)
  Duration  2.87s
```

Pre-Sprint-4 baseline at `HEAD`: 11 test files. Sprint 4 adds
`return-to.test.ts` and `google-sign-in-button.test.tsx`; this validation adds
`google-session.test.tsx` (3 tests).

### 6.4 Accessibility — `pnpm test:a11y`

```
  ✓ public pages have no critical or serious axe violations (4.4s)
  ✓ authenticated console and consent screens pass the a11y gate (12.3s)
  ✘ Grants page and revoke dialog pass the a11y gate (8.4s)
    Error: Axe critical/serious violations on "/console/grants-revoke-dialog"
    - [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds (1 node(s))
  1 failed
  2 passed (31.5s)
```

**This failure is pre-existing and unrelated to Sprint 4 — verified, not
asserted.** The scan summary this run wrote to
`writeup-evidence/reports/accessibility-summary.json` was compared field by
field against the copy committed at `HEAD` (generated `2026-08-19T01:22:38Z`,
before this Sprint):

- 15 routes in both; no route added or removed;
- for every one of the 15 routes, `critical`, `serious`, `moderate`, `minor`,
  `incomplete`, `testResult` and `blockingRuleIds` are **identical**;
- the only difference between the two files is `generatedAt`.

The two routes Sprint 4 actually modified — `sign-in` and `sign-up` — scan
`pass` with 0 serious and 0 critical, both before and after.

**Caveat:** because this scan ran against a build with no Google client ID, the
Google button container was not present on the page. These `sign-in` / `sign-up`
passes therefore do **not** cover the Google button area. See §9.

### 6.5 Static quality — `pnpm test:quality`

```
Tasks:    3 successful, 3 total   (lint:        api-backend, securiself-platform, prymecab-simulator)
Tasks:    3 successful, 3 total   (check-types: api-backend, securiself-platform, prymecab-simulator)
QUALITY EXIT=0
```

---

## 7. Visual Evidence

Eight screenshots in `docs/sprint4/images/`, captured **by hand from the real
running application** during the manual runtime validation described in §2.4.
They are observations, not test output. None was staged, cropped or retouched,
and none is used to support a claim that is not visible in the image itself.

Screenshots `01`–`06` are one unbroken browser session:

```
PrymeCab → SecuriSelf → real Google authentication → SecuriSelf session →
restored authorization request → Context selection →
PrymeCab context-filtered profile
```

Screenshots `07`–`08` are a second session, signed in with a Google identity
SecuriSelf had never seen before.

| File | Stage |
| --- | --- |
| `01-prymecab-login-entry.png` | PrymeCab, unauthenticated — the journey's starting point |
| `02-securiself-signin-google-option.png` | SecuriSelf `/sign-in` with `returnTo`, Google's own button beside the unchanged email/password form |
| `03-google-account-chooser.png` | Google's own account chooser on `accounts.google.com` |
| `04-returnto-consent-restored.png` | The original authorization request, restored after real Google authentication |
| `05-context-selection-payload-preview.png` | Context selected, showing exactly what PrymeCab will receive |
| `06-prymecab-context-disclosure.png` | PrymeCab rendering the context-filtered profile |
| `07-new-google-user-console.png` | Console of an account just created from an unseen Google identity |
| `08-new-google-user-empty-vault.png` | That account's Vault — every root field empty |

### 7.1 Journey A — real Google authentication inside the PrymeCab consent journey

**`01-prymecab-login-entry.png` — before any authentication.**
*Visible:* the PrymeCab landing page at `localhost:3001`, unauthenticated: the
**LOGIN WITH SECURISELF** button, "Secure sign-in powered by SecuriSelf", and no
profile card anywhere on the page.
*Produced by:* opening `http://localhost:3001` in a browser with no SecuriSelf
session. Nothing was clicked.
*Observe:* PrymeCab holds no profile and no session. This is the baseline that
`06` is measured against.
*Supports:* provenance for everything that follows — the journey genuinely
begins in the third-party application, so the `returnTo` visible in `02` was
produced by the application rather than typed by hand.

**`02-securiself-signin-google-option.png` — SecuriSelf sign-in, reached by redirect.**
*Visible:* `/sign-in` with the Email field, the Password field, the **Sign in**
button, an **OR** divider, and Google's own rendered **Sign in with Google**
button. The address bar reads
`localhost:3000/sign-in?returnTo=%2Foauth%2Fauthorize%3Fclient_id%3Dscs_cbbf…%26redirect_uri%3D…`.
*Produced by:* clicking **LOGIN WITH SECURISELF** on `01`. PrymeCab sent the
browser to `/oauth/authorize?…`; because there was no session, SecuriSelf
bounced to `/sign-in` with the whole authorize URL preserved in `returnTo`.
*Observe:* three things at once — the button carries Google's own "G" mark and
typography, so it is Google's rendering and not a SecuriSelf imitation; the
email and password fields sit unchanged beside it, so Google was added as an
alternative front door rather than a replacement; and the address bar carries
the encoded `/oauth/authorize` request, with PrymeCab's `client_id`, inside
`returnTo`.
*Supports:* `GoogleSignInButton` renders the official GIS button when
`NEXT_PUBLIC_GOOGLE_CLIENT_ID` is configured; email/password authentication is
untouched; the consent request is captured before authentication (**P4**).

**`03-google-account-chooser.png` — real Google authentication, on Google's infrastructure.**
*Visible:* the Google-hosted popup at
`accounts.google.com/v3/signin/accountchooser?…`, headed **Sign in with Google**
and **"Choose an account — to continue to Securiself"**, listing the real Google
accounts available on the machine.
*Produced by:* clicking the Google button in `02`. Captured before any account
was selected.
*Observe:* the origin is `accounts.google.com`, and it is a **popup window**
rather than a full-page redirect — which is what `ux_mode: "popup"` produces,
and why the integration needs an authorised JavaScript origin but no authorised
redirect URI. The application name Google shows ("Securiself") is the one
configured on the real OAuth consent screen.
*Supports:* the credential is obtained from the real provider through Google's
own mechanism, against a real Google Cloud OAuth client.

**`04-returnto-consent-restored.png` — back on SecuriSelf, immediately after Google.**
*Visible:* `localhost:3000/oauth/authorize?client_id=scs_cbbf…&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fapi…`
showing **"PrymeCab wants to access an identity context"**, the redirect target
`http://localhost:3001/api/auth/callback`, the account's existing Context
(**Angela / Rosi**, `Social` badge), the "Only the selected context is shared"
notice, and the **Deny** / **Approve & continue** buttons.
*Produced by:* selecting the Google account in `03` and letting authentication
complete. The browser was not navigated by hand — the application chose the
destination.
*Observe:* the URL is the original `/oauth/authorize` request, **not**
`/console`; `returnTo` survived a real round trip through Google. The Context
offered is one that already belonged to this SecuriSelf account before Google
was ever used — a freshly created duplicate account would present an empty list
here.
*Supports:* `returnTo` is restored after real Google authentication (**P4**);
the session issued from a Google credential is accepted by the existing consent
screen (**P2**); the Contexts are still attached to the same owner (**P3**).
The screenshot is *consistent with* linking rather than duplication (**P1**),
but the authoritative evidence for that is the `user.count() === 1` assertion in
§3.1 — a row count is not visually observable.

**`05-context-selection-payload-preview.png` — choosing what PrymeCab may see.**
*Visible:* the same consent screen with the Social context selected and
**"What PrymeCab will receive"** expanded:
`GET /API/V1/PROFILES/ME` →
`{"status":"success","context":"SOCIAL","data":{"display_name":"Rosi","username":"sereinelah","pronouns":"it/that","avatar_url":"https://avatars.githubusercontent.com/…"}}`.
*Produced by:* clicking the context on `04` and waiting for the payload preview
to render. Nothing was approved yet.
*Observe:* the payload holds only the SOCIAL allow-list. There is no root email,
no `legal_first_name`, no `legal_last_name`, no `document_id` — and nothing
Google-derived: neither the Google display name visible in `03` nor the Google
profile picture. The avatar in the payload is the one stored in the owner's own
Vault.
*Supports:* contextual disclosure behaves identically regardless of how the
session was obtained, and no Google profile claim is available to leak into it
(**P5**).

**`06-prymecab-context-disclosure.png` — end of the journey, back in PrymeCab.**
*Visible:* `localhost:3001` rendering the profile it received — avatar, display
name **Rosi**, the **SOCIAL** badge, the EN/ES language switch,
`USERNAME sereinelah` and `PRONOUNS it/that`. The **LOGIN WITH SECURISELF**
button is gone.
*Produced by:* clicking **Approve & continue** on `05` and letting the redirect
and PrymeCab's server-side token exchange finish.
*Observe:* compare directly against `01` — the same application, now holding
exactly one context-bound profile and nothing more. PrymeCab displays the
*context*, never the person: no root email, no legal name, no document ID,
nothing from Google.
*Supports:* end to end, a session established from a real Google credential
drives the unchanged consent → grant → filtered-disclosure chain, and the third
party receives the same context-filtered payload as under password
authentication (**P2**, **P5**).

### 7.2 Journey B — a Google identity SecuriSelf had never seen

**`07-new-google-user-console.png` — first sign-in for an unknown Google identity, no `returnTo`.**
*Visible:* `localhost:3000/console` with `zevemstudio@gmail.c…` in the top bar,
**Identity completion 0%** ("0 of 5 vault fields set"), **Contexts 0**,
**Clients 0**, and "No activity yet".
*Produced by:* signing out, navigating **directly** to
`http://localhost:3000/sign-in` with no `returnTo`, and signing in with a second
Google account SecuriSelf had never seen.
*Observe:* the destination is `/console` — the fallback when no `returnTo` is
present, and the counterpart to `04`. Then the zeroes: Google returns a name and
a profile picture with this credential, and none of it is here.
*Supports:* a SecuriSelf account is created from an unknown Google identity and a
working session is established; `resolveReturnTo` falls back to `/console`
(**P4**); the new account starts with nothing it could disclose.

**`08-new-google-user-empty-vault.png` — the Vault of that new account.**
*Visible:* `localhost:3000/console/vault` — "Root identity" with **Legal first
name**, **Legal last name**, **Display name**, **Gender** and **Avatar URL** all
empty, and "No changes" beside **Save changes**.
*Produced by:* opening **Vault** from `07`. Nothing was typed and nothing saved.
*Observe:* the legal name fields are empty even though the Google account
certainly has a name attached to it. `legalFirstName` and `legalLastName` are
the **only** root `User` fields any context category (LEGAL) can disclose to a
third party; had Google's name auto-filled them, Google profile data would
silently have become third-party-disclosable without the owner ever choosing so.
*Supports:* `loginWithGoogle` persists only `email` and `googleId`; the LEGAL
disclosure surface stays under the owner's control (**P5**).

### 7.3 Sensitive content

No session token, authorization code, client secret, password field or
environment variable is visible in any image. Real personal data **is** visible
and was deliberately left unredacted, because it is what makes the evidence
real: `03` lists the operator's own Google accounts in Google's chooser, and
`07`/`08` show the Google address the Journey B account was created from. The
`client_id` and `redirect_uri` in the address bars of `02`, `04` and `05` are
public OAuth parameters, not secrets.

---

## 8. Image Evidence Guide

`docs/sprint4/images/README.md` records how this evidence is captured and what
may never appear in it: the Google Cloud prerequisites, the two journeys and
their ordering, the capture rules (which shots must include the address bar and
what must never be photographed), and the states deliberately left uncaptured
together with the reason for each. Every file in the folder is accounted for
there and in §7; there are no decorative images.

---

## 9. Results and Interpretation

### 9.1 Property-by-property evidence

Each entry names its class. **backend** and **platform** are automated
assertions; **manual** is an observation from §7, and is cited only where the
property is genuinely visible on screen.

| Property | Evidence |
| --- | --- |
| **P1** No duplicate accounts; existing account preserved | `user.count() === 1` after linking and after repeat sign-in (backend); the account's pre-existing Context offered after real Google authentication (manual, `04`) |
| **P2** Existing session model reused | Google-issued token accepted by `authUser` on `/auth/me` and an authenticated `PUT /vault` (backend); the consent screen and PrymeCab's disclosure both reached on a session issued from a real Google credential (manual, `04`, `06`) |
| **P3** Vault and Context ownership preserved | Vault read through the Google session is field-for-field unchanged (backend, new test); Contexts readable through the Google token (backend); the account's pre-existing Context still offered on the consent screen after real Google authentication (manual, `04`) |
| **P4** `returnTo` preserved | `resolveReturnTo` unit tests; `router.replace` called with the verbatim consent URL (new component test); the same landing after **real** Google authentication, and the `/console` fallback with no `returnTo` (manual, `04`, `07`) |
| **P5** Disclosure and privacy unchanged | Full privacy/security/ownership backend suites pass; Google-account consent test passes; `googleId` stripped by `serializeUser`; no Google claim beyond `sub`/`email` is persisted; a new Google account is created with `legalFirstName`/`legalLastName` `null` (backend assertion), and its Console reports 0 Contexts and 0 of 5 Vault fields set with an entirely empty Vault (manually observed, `07`/`08`) |
| Invalid credential authenticates nobody | `401` + `user.count() === 0` (backend, stubbed verifier); `401` from the **real** `google-auth-library` verifier (`google-id-token.test.ts`) |
| Email/password auth still works | Full backend + platform suites; explicit password-login assertion after linking |

### 9.2 Two classes of evidence, not interchangeable

- **Automated (§3–§6).** Backend integration tests against a real Express app
  and a real PostgreSQL database, plus platform unit and component tests.
  Everything SecuriSelf does with a credential is **asserted**: row counts,
  response codes, payload contents, forbidden strings. This is the layer that
  will catch a future regression.
- **Manual runtime validation (§7).** The same journey with the **real**
  provider — Google's own account chooser, a genuinely Google-signed credential,
  and the backend accepting it after signature and `aud` verification. This is
  **observed**, not asserted: it establishes what is visible on screen and
  nothing beyond it.

Only the automated layer can assert what the database and the payloads contain;
only the manual layer reaches Google. Each covers the other's blind spot.

### 9.3 Not established by any evidence here

- **Google credential edge cases.** One real Google credential was accepted end
  to end (§7). Nothing exercised an unverified Google email against
  `email_verified` enforcement, an expired or replayed ID token, or Google's
  certificate rotation.
- **Reproducibility of the manual evidence.** §7 is a single hand-executed
  session, by one operator, against one Google Cloud client. It cannot run in CI
  and it will not catch a future regression — only the automated suites will.
- **Accessibility of the Google sign-in area.** The axe scans ran against a
  build without the Google button, so `sign-in` / `sign-up` passing says nothing
  about it. Google renders its real button inside a cross-origin iframe, which
  axe cannot audit in any case.
- **Production readiness, complete OAuth/OIDC compliance, complete Google
  security assurance, complete privacy assurance, full accessibility
  compliance.** None of these is claimed, and the evidence does not establish
  any of them.
- **Concurrency.** Nothing tests two simultaneous first-time sign-ins for the
  same email; the `googleId` unique index and the email unique index are the
  only protection, and that path was not exercised.
- **Account unlinking and Google-side email changes.** No implementation, no
  tests.
- **Migration path.** `User.googleId` was applied with `prisma db push`; there
  is no migration file and no deployment was validated.

### 9.4 Critical failures remaining

**None.** Every executed test passes except the accessibility
`color-contrast` violation on `/console/grants-revoke-dialog`, which is proven
identical to the committed pre-Sprint-4 baseline and is untouched by this Sprint.

### 9.5 Verdict

**The Sprint 4 authentication objective is supported by the validation.**

Everything SecuriSelf itself does with a Google identity — resolve it to exactly
one account, link rather than duplicate, preserve the Vault and Contexts, issue
the existing session, restore `returnTo` into the PrymeCab consent journey, and
disclose nothing beyond the selected context — is demonstrated by executed
automated tests at the backend and platform layers.

The one boundary those layers structurally cannot cross — a genuinely
Google-signed credential, obtained from Google's own account chooser and
accepted by the backend — was executed by hand against the real running
application and recorded in §7. That evidence is observational: it shows the
full journey working with the real provider, and it stands alongside the
assertions in §3–§6 rather than replacing them. The automated suites remain what
will keep the behaviour from regressing; the manual session is what shows it is
real.

### 9.6 Remaining follow-ups

1. Re-run `pnpm test:a11y` against a build with `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
   set, to scan the Google sign-in area of `sign-in` and `sign-up` — Google's own
   button will stay out of axe's reach inside its cross-origin iframe.
2. Exercise a Google account whose email is unverified, against `email_verified`
   enforcement.
3. Replace the `prisma db push` used to apply `User.googleId` with a real
   migration file before any deployment.
