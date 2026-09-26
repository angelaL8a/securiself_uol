# Cohort B Documentation Refinement Validation

This document records the technical validation of the two Cohort B documentation refinements,
B1 and B2, described in
[`cohort-b-refinement-implementation.md`](cohort-b-refinement-implementation.md). It is a
technical and contract-consistency validation of the final implementation. It is not a
usability evaluation.

## 1. Validation Objective

The validation checked that:

1. B1 exists and accurately describes the integration lifecycle from callback code to access
   token to Profile API request;
2. B2 exists and accurately describes how access is lost on revocation and how it is restored;
3. the new links resolve to the intended documentation routes and anchors;
4. the documentation agrees with the implemented SecuriSelf behaviour;
5. the existing integration semantics remain unchanged.

**Method.** Component tests (Vitest, jsdom) check the rendered content and link targets of each
documentation area. Browser tests (Playwright 1.61.1, Chromium) follow the new links across a
production build of the SecuriSelf Platform in the isolated end-to-end environment. The
platform and backend suites, lint and type checking confirm that the surrounding system still
passes. An axe scan checks the accessibility of the nine Developer Docs routes. The visible
documentation was compared statement by statement with the API backend source (§4).

## 2. Validation Matrix

Component tests are in
`apps/securiself-platform/src/features/developer-docs/components/developer-docs.test.tsx`
(describe blocks *B1 authorization code to access token* and *B2 revocation recovery path*).
Browser tests are in `tests/e2e/specs/cohort-b-refinements.spec.ts` (scenarios *B1* and *B2*).

| Refinement | Check | Expected behaviour | Final observed result | Status |
| --- | --- | --- | --- | --- |
| B1 | Callback code clearly distinguished from the access token | Token Exchange `#code-to-token` opens with "You are here" and the callout "The authorization code is not a Profile API credential", stating that sending the code to the profile endpoint returns `401 Invalid access token`; the Authorization callback carries the same statement; the Profile API shows `Authorization: Bearer <ACCESS_TOKEN>`, never `<AUTHORIZATION_CODE>`, and states that the callback code is rejected | All texts rendered in the component tests and in the production build; Profile API uses only the access-token placeholder (component tests *opens Token Exchange with the code-to-token transition, grouped by channel*, *sends the Authorization callback onward to Token Exchange*, *authenticates Profile API requests with the access token, not the code*; browser *B1*) | Pass |
| B1 | Server-side exchange explicit | A six-step transition in the order `/oauth/authorize` → `?code=` → application backend → `POST /oauth/token` → access token returned → `GET /api/v1/profiles/me`, grouped as *Browser · front channel*, *Your server · server-side*, *Your server · protected API request*, each label shown once | Six list items in that order; each channel label rendered once, on steps 1, 3 and 6 respectively (component test *opens Token Exchange…*; browser *B1*, `#code-to-token ol > li` = 6) | Pass |
| B1 | `client_secret` server-only | No browser step mentions `client_secret`; every step naming it is a server step in the server-side channel; the credential reference marks `client_secret` server-only; no real secret is rendered | No browser-step text contains `client_secret`; the one step naming it is a server-side step; `serverOnly` is true; the rendered Token Exchange area does not contain the end-to-end client's real secret (component tests *keeps the client_secret and the access token on the server side*, *uses placeholders instead of real credentials*; browser *B1*) | Pass |
| B1 | Authorization → Token Exchange relationship | The `#callback` link targets `/console/docs/token-exchange`; Token Exchange links back to `/console/docs/authorization#callback` | Both `href` values correct; following the callback link reached Token Exchange, which rendered `#code-to-token` (component tests *sends the Authorization callback…*, *opens Token Exchange…*; browser *B1*) | Pass |
| B1 | Token Exchange → Profile API relationship | `#code-to-token` links to `/console/docs/profile-api`, which states that the `access_token` from the exchange is used, "not the authorization code from the callback"; the nine-step sequence remains only on the Overview, linked from Token Exchange | Link correct; following it reached the Profile API, which rendered that text; Overview `#flow` has 9 steps and Token Exchange links to `/console/docs#flow` (component tests *opens Token Exchange…*, *keeps the full nine-step sequence on the Overview only*; browser *B1*) | Pass |
| B2 | Revoked access documented as unusable | Grants & Revocation states that the next profile read returns `401 Access token has been revoked` and that "Re-authorization is required; nothing else restores access."; the Errors recovery sequence places the `401` rejection of the existing token directly after revocation and before any recovery step | Texts present; the seven-step recovery sequence renders in that order (component tests *states on Grants & Revocation that a new user authorization is required*, *explains revoked access on Errors and links to its cause and its restart*; browser *B2*, `#recovery ol > li` = 7) | Pass |
| B2 | Errors links to recovery guidance | Errors contains the `#recovery` block, which links to Grants & Revocation (`/console/docs/grants`) and to Authorization (`/console/docs/authorization`); the Profile API links a rejected read to `/console/docs/errors#recovery` | All `href` values correct; from the Profile API the link landed on the recovery heading, in the viewport and below the sticky area bar; from `#recovery`, the links reached Grants & Revocation and Authorization, whose `#authorize` section contains `/oauth/authorize` (component tests *explains revoked access on Errors…*, *points a rejected profile read at the recovery sequence*; browser *B2*; [`images/b2-revocation-recovery.png`](images/b2-revocation-recovery.png)) | Pass |
| B2 | Grants & Revocation links to error and recovery information | Grants & Revocation links to `/console/docs/errors#recovery` and to `/console/docs/authorization`; following the recovery link lands on the recovery heading below the sticky area bar | `href` values correct; after the click the URL hash was `#recovery` and the heading was in the viewport, below the sticky area bar (component test *states on Grants & Revocation…*; browser *B2*) | Pass |
| B2 | New user authorization required | Grants & Revocation states that the identity owner "must approve your application again"; the recovery sequence orders revocation → `401` → nothing reusable → owner authorizes again → new code → new access token → reads resume | Texts present in that order; the three steps after the new approval carry a *new* authorization code or a *new* `access_token` (component tests *states on Grants & Revocation…*, *only restores access through values issued by a new approval*) | Pass |
| B2 | No old authorization or access reuse described | On Profile API, Grants & Revocation and Errors, every sentence mentioning refreshing, retrying or reusing is negated (*no*, *not*, *never*, *cannot*, *nothing*) | At least one such sentence exists across the three areas, and every one is negated (component test *never presents refreshing, retrying or reusing old access as recovery*) | Pass |
| B1, B2 | Documentation agrees with implementation | Every error message quoted by the documentation exists verbatim in the API backend; each documented statement matches the implemented behaviour | The four quoted messages exist in `requireBearerToken.ts` and `oauth.service.ts` (component test *quotes the rejection messages the API backend actually returns*); statement-by-statement result in §4 | Pass |
| B1, B2 | Integration semantics unchanged | The backend suite, including the token-exchange, revocation and re-authorization contract tests, passes | 70 / 70 backend tests; 14 / 14 named contract tests (§3) | Pass |
| B1, B2 | Accessibility of the refined areas | No critical or serious axe violation on the nine Developer Docs routes | 0 critical, 0 serious, 0 moderate, 0 minor on all nine routes; 1 *incomplete* (needs review) result per route (§3) | Pass |

## 3. Automated Validation

All results below are from the final validation of the implemented state. Output files in
[`evidence/`](evidence/) are unedited. Backend and browser suites share one test database and
were run one after the other.

| Suite | Command | Result | Counts | Evidence |
| --- | --- | --- | --- | --- |
| Developer Docs component tests (targeted) | `pnpm exec vitest run src/features/developer-docs --reporter=verbose` (in `apps/securiself-platform`) | Pass | 22 / 22 — 11 pre-existing Developer Docs tests and 11 B1/B2 tests (5 B1, 6 B2) | [`developer-docs-unit-tests-verbose.txt`](evidence/developer-docs-unit-tests-verbose.txt) |
| Platform unit and component tests | `pnpm test:platform` | Pass | 17 files, 88 / 88 | [`platform-unit-tests.txt`](evidence/platform-unit-tests.txt) |
| API backend tests | `pnpm test:backend` | Pass | 11 files, 70 / 70 | [`backend-tests.txt`](evidence/backend-tests.txt) |
| Token-exchange and revocation contract tests (named) | `pnpm --filter api-backend exec vitest run tests/security.test.ts tests/grants-idempotent.test.ts --reporter=verbose` | Pass | 2 files, 14 / 14 | [`backend-contract-tests-verbose.txt`](evidence/backend-contract-tests-verbose.txt) |
| Lint and type checking (all packages) | `pnpm test:quality` | Pass, exit 0 | lint 2 / 2 tasks; check-types 3 / 3 tasks | [`lint-and-type-check.txt`](evidence/lint-and-type-check.txt) |
| Browser tests for the refined Developer Docs | `pnpm exec playwright test tests/e2e/specs/cohort-b-refinements.spec.ts tests/e2e/specs/developer-docs.spec.ts` (after `pnpm test:e2e:prepare`) | Pass | 5 / 5 — Cohort B *B1* and *B2*, and the three existing Developer Docs scenarios (authenticated access, sidebar navigation, nine areas behind sticky navigation) | [`e2e-developer-docs-and-cohort-b.txt`](evidence/e2e-developer-docs-and-cohort-b.txt); captures in [`images/`](images/) |
| Axe accessibility scan of the nine Developer Docs routes | `pnpm test:a11y` | Pass for all nine routes | 0 critical, 0 serious, 0 moderate, 0 minor per route | [`accessibility-tests.txt`](evidence/accessibility-tests.txt), [`accessibility-summary.json`](evidence/accessibility-summary.json) |

**Contract tests included in the named run.** *rejects an expired authorization code*,
*rejects a consumed authorization code*, *rejects a wrong client secret*, *rejects a wrong
redirect uri*, *issues exactly one token when the same code is exchanged concurrently*,
*rejects an unexchanged code once its Grant is revoked and issues no token*, *allows a new
authorization after revocation while the old code stays dead*, *rejects a missing bearer token*,
*rejects a manipulated bearer token*, *rejects a revoked token after the grant is revoked*,
*lists grants with application and context display fields and no secrets*, *reactivates a
revoked grant on re-authorisation by clearing revokedAt*, *binds a token to a single context and
cannot read another*, and *revokes once, then returns the same revoked Grant without a second
ACCESS_REVOKED*.

**Scope of the accessibility evidence.** The nine Developer Docs routes are scanned inside the
suite's test *authenticated console and consent screens pass the a11y gate*, before that test
scans Console and OAuth consent states that lie outside the Developer Docs and were not changed
by B1 or B2. Each scan asserts on its own route, so the Developer Docs rows in
[`accessibility-summary.json`](evidence/accessibility-summary.json) are the evidence cited here.
Results for states outside the Developer Docs are not part of this validation; the consent
screen's axe result is recorded with the Cohort A validation.

**Captures.** The two images in [`images/`](images/) were written by the passing Cohort B
browser scenarios:

- [`b1-code-to-token-transition.png`](images/b1-code-to-token-transition.png) — the Token
  Exchange `#code-to-token` section: the "You are here" transition, the
  "not a Profile API credential" callout and the six-step code-to-token transition grouped by
  channel;
- [`b2-revocation-recovery.png`](images/b2-revocation-recovery.png) — the Errors `#recovery`
  block: the revoked-access explanation, the seven-step recovery sequence and the expiry note.

## 4. Contract Consistency

Each statement introduced or reworded by B1 and B2 was compared with the API backend source
(`apps/api-backend/src`) and with the Platform consent screen.

### 4.1 B1 statements

| Documented statement | Implemented behaviour | Consistent |
| --- | --- | --- |
| Authorization starts at `/oauth/authorize` with `client_id` and `redirect_uri`; no secret is involved | `getAuthorizeView` (`modules/oauth/oauth.service.ts`) validates `client_id` and exact `redirect_uri` equality; the query schema has no secret field | Yes |
| The callback receives `redirect_uri?code=…` | `decideAuthorization` returns `${redirectUri}${separator}code=${code}`, using `&` when the URI already has a query | Yes |
| The code is temporary (5 minutes by default) and single use | Code `expiresAt` = now + `AUTH_CODE_TTL_MINUTES` (`config/env.ts`, default 5); `exchangeToken` rejects an expired or consumed code, and marks the code consumed in the same transaction that creates the access token, so one code yields at most one token | Yes |
| The exchange is `POST /oauth/token` and requires the `client_secret` | `oauthRouter.post("/token")` → `exchangeToken`, which verifies `client_secret` against the stored bcrypt hash and returns `401 Invalid client credentials` otherwise | Yes |
| The exchange returns the access token | `exchangeToken` returns `{ access_token, token_type: "Bearer", expires_in }` | Yes |
| The authorization code is not a Profile API credential; sending it returns `401 Invalid access token` | `requireBearerToken` looks up `sha256(<bearer value>)` in the access-token table only; codes are stored in a different table, so the lookup fails with `401 Invalid access token` | Yes |
| The Profile API is called with `Authorization: Bearer <ACCESS_TOKEN>` | `extractBearerToken` (`lib/bearer.ts`) accepts only the case-sensitive `Bearer` scheme; `profilesRouter.get("/me", requireBearerToken, …)` | Yes |
| `client_secret` remains server-side; `client_id` may appear in the browser | A documentation statement that the backend cannot enforce; consistent with the credential reference table and with the PrymeCab reference integration, whose `CLIENT_SECRET` is not exposed with a `NEXT_PUBLIC_` prefix | Yes |

### 4.2 B2 statements

| Documented statement | Implemented behaviour | Consistent |
| --- | --- | --- |
| Revoking a Grant ends its access at once; the held token stops working immediately, not at its expiry | `revokeGrant` (`modules/grants/grants.service.ts`) sets the Grant's `revokedAt` and, in the same transaction, marks any unexchanged authorization codes for the Grant as consumed and revokes its access tokens | Yes |
| The application is not notified | `revokeGrant` issues no notification, webhook or callback | Yes |
| The next profile read returns `401 Access token has been revoked` | `requireBearerToken` returns that message when the token's `revokedAt` is set; backend test *rejects a revoked token after the grant is revoked* | Yes |
| Sending the request or the token again does not change the result | The check depends only on the stored token row, which revocation does not reset | Yes |
| There is no refresh token | The token schema accepts only `grant_type: "authorization_code"`; the token response contains no refresh token | Yes |
| The code that produced the token was consumed at exchange; nothing already issued restores access | `exchangeToken` consumes the code when it issues the token; a code whose Grant is revoked is rejected with `400` and issues no token; a code issued before revocation remains unusable after re-authorization; backend tests *rejects a consumed authorization code*, *rejects an unexchanged code once its Grant is revoked and issues no token*, *allows a new authorization after revocation while the old code stays dead* | Yes (see note) |
| The identity owner must authorize the application again, choosing a Context and approving | The consent screen submits an approval only with a selected Context (`oauth-consent.tsx`); `decideAuthorization` issues a new code and reactivates the Grant (`revokedAt: null`); backend test *reactivates a revoked grant on re-authorisation by clearing revokedAt* | Yes |
| A new code is exchanged for a new access token; reads resume, bound to the newly chosen Context | `exchangeToken` creates a new access-token row bound to the new code's `contextId`; backend test *allows a new authorization after revocation while the old code stays dead* reads the profile with the new token | Yes |
| `401 Access token has expired` follows the same path from the new authorization request | `requireBearerToken` rejects a token past `expiresAt`; no refresh mechanism exists | Yes |

**Note on the quoted message in recovery step 3.** Step 3 cites
`400 Authorization code has already been used`, which is the message the token endpoint
returns for a consumed code. `exchangeToken` checks code expiry and Grant status before the
consumed flag, so a consumed code re-sent *after* its Grant has been revoked receives
`400 Invalid authorization code`, or `400 Authorization code has expired` once
`AUTH_CODE_TTL_MINUTES` has passed. The documented outcome is accurate: the code is rejected
with `400` and no token is issued. The quoted message is the consumed-code message rather than
the message returned in that sequence.

The messages quoted in the documentation are also pinned by the component test *quotes the
rejection messages the API backend actually returns*, which reads the backend source files and
fails if a quoted message is removed there.

### 4.3 Placeholder credentials

The Cohort B browser scenario asserts that the rendered Token Exchange area does not contain the
end-to-end client's real secret, and the component test *uses placeholders instead of real
credentials* passes. The new content uses only `<ACCESS_TOKEN>`,
`https://your-app.example/callback` and references to `client_secret` by name.

### 4.4 Result

The visible documentation for B1 and B2 agrees with the implemented behaviour of
`/oauth/authorize`, the callback code, `/oauth/token`, client credential handling, access-token
usage, `/api/v1/profiles/me`, Grant revocation, and the requirement for a new authorization after
revocation. The note in §4.2 concerns the wording of one quoted error message, not the documented
behaviour.

## 5. Interpretation Boundary

Technical validation establishes that the B1 and B2 refinements are implemented and consistent
with SecuriSelf's actual integration contract: the content is present in the built application,
the links resolve to the intended routes and anchors, the wording agrees with the API
implementation, and the relevant automated suites pass.

It does not establish that external developers find the revised documentation easier to use,
that the Level 2 and Level 3 assistance observed for D04 and D05 would no longer be needed, or
that cross-area navigation would be reduced. That question belongs to the subsequent focused
external developer verification.
