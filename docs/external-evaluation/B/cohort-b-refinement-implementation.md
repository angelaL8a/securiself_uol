# Cohort B Post-Evaluation Documentation Refinements

## 1. Purpose

The Cohort B external evaluation tested whether external developers could understand and begin
integrating SecuriSelf using only the in-product Developer Docs and the Console, without access
to source code. Ten developers carried out eight integration tasks each. The evaluation showed
that the Developer Docs were sufficient overall:

| Measure | Result |
| --- | --- |
| Task completions | 80 / 80 |
| Independent task completions | 78 / 80 |
| Technical comprehension responses scored Correct | 40 / 40 |
| Incorrect comprehension responses | 0 |
| Critical misunderstandings | 0 |
| Developers who indicated they could begin integrating without source-code access | 10 / 10 |

The evaluation also recorded two concentrated areas in which developers reached the correct
understanding only after reconstructing a relationship across several documentation areas, and
in two cases only after researcher assistance. These two findings, B1 and B2, were selected
for refinement because they produced the clearest behavioural friction in the evaluation: they
are the two places where assistance was required and where independent developers also moved
back and forth between areas. Both are bounded clarity and navigation findings. They do not
indicate missing or incorrect technical content, a general lack of clarity in the integration
contract, or a security failure.

This document records the evidence behind B1 and B2, the design response, and the implemented
changes. The technical validation is recorded in
[`cohort-b-refinement-validation.md`](cohort-b-refinement-validation.md).

## 2. Findings Driving Refinement

| ID | Finding | Evaluation evidence | Interpretation | Response |
| --- | --- | --- | --- | --- |
| B1 | Authorization code → access token boundary | D04 required Level 2 clarification during the token-exchange task. D01 independently identified the callback-to-token transition as the integration stage requiring the most attention. All developers answered the technical comprehension question correctly. | The concept was documented, but the causal transition from callback code to access token had to be reconstructed across the Authorization and Token Exchange areas. | A channel-grouped code-to-token transition at the start of Token Exchange, an explicit statement that the authorization code is not a Profile API credential, and short links from the adjacent areas (§3). |
| B2 | Revocation ↔ Errors recovery path | D05 required Level 3 direction to locate the recovery path. D07, D10 and other developers who completed the task independently navigated between Errors, Grants & Revocation and Authorization before reconstructing the recovery flow. All developers ultimately understood revocation correctly. | The information was documented, but the recovery guidance was fragmented across areas that did not link to each other. | A dedicated recovery sequence in Errors, an application-side consequence on Grants & Revocation, and links in both directions and from the Profile API (§4). |

No percentages beyond the figures above are used; none were derived from the evaluation for
these findings.

### B1 — Authorization code → access token boundary

D04 (junior developer) required Level 2 clarification during the token-exchange task, having
initially treated the callback authorization code as possibly usable as the Profile API
credential. D01 independently identified the callback-to-token transition as the integration
stage requiring the most attention. Open feedback asked for a stronger visual or explanatory
transition from browser callback to application backend to `/oauth/token` to access token. All
developers ultimately answered the technical comprehension question correctly.

**Interpretation.** The distinction between the two values existed in the Developer Docs: the
Overview contained a nine-step sequence and a callout stating that the values differ, and Token
Exchange compared them side by side. On Token Exchange, where D04 needed clarification, the
relationship was expressed by repeating the nine-step sequence with the instruction "the code
is carried by steps 2 to 5 and the token by steps 7 onwards", which left the reader to work out
the boundary. The technical concept was present; the causal transition required unnecessary
reconstruction across Authorization and Token Exchange.

### B2 — Revocation ↔ Errors recovery path

Task 8 was the weakest Developer Docs task overall. D05 (junior developer) searched the Profile
API and Authorization areas first, expected the failed profile request to lead to the recovery
path, and required Level 3 directional assistance to reach the Grants & Revocation and Errors
material. D07, D10 and other developers who completed the task independently moved between
Errors, Grants & Revocation and Authorization before reconstructing the full recovery flow. All
developers ultimately answered the revocation comprehension question correctly.

**Interpretation.** The facts were documented: Grants & Revocation stated that "re-authorization
is required; nothing else restores access", and Errors listed `401 Access token has been
revoked`. But no area connected the observed failure to its cause and to the recovery action.
The Profile API mentioned re-authorization only in a code comment without a link, Errors named
the revoked Grant as the cause without linking to Grants & Revocation or describing the
recovery, and Grants & Revocation did not link to Errors or Authorization. The recovery
guidance was fragmented.

## 3. B1 Design Response

**Why the finding justified a change.** The confusion concerns the central security boundary
of the integration. A second developer independently named the same transition as the stage
requiring the most attention, and open feedback asked for it to be made more explicit. The cost
of misreading it in a real integration (sending the code to the profile endpoint, or attempting
the exchange from the browser, where the `client_secret` would be exposed) is higher than for
other content.

**Final implementation.**

- Token Exchange opens with a **"You are here"** transition: the application's callback
  (linked to the Authorization area) has just received `?code=`, and the exchange is the
  single point where that browser-delivered artifact becomes a server-held credential.
- A callout titled **"The authorization code is not a Profile API credential"** states:
  "Exchange it server-side for an access token before calling the Profile API." It gives the
  reason (the exchange requires the `client_secret`, so it runs on the server, never in the
  browser) and the observable consequence of sending the code to the profile endpoint
  (`401 Invalid access token`).
- A six-step transition, grouped by channel:

  | Step | Channel | Actor | Carries |
  | --- | --- | --- | --- |
  | 1. Browser authorization — `GET /oauth/authorize` with `client_id` and `redirect_uri`; the `client_id` is public and no secret is involved | Browser · front channel | Browser | — |
  | 2. Callback code — `redirect_uri?code=…`, temporary (5 minutes by default) and single use | Browser · front channel | Browser | authorization code |
  | 3. Application backend — the callback handler runs on the server; the code on its own reads nothing | Your server · server-side | Your server | authorization code |
  | 4. `POST /oauth/token` with the `client_secret` — server to server; the code is consumed | Your server · server-side | Your server | authorization code |
  | 5. Access token returned — kept on the server; from here on it is the credential | Your server · server-side | Your server | `access_token` |
  | 6. `GET /api/v1/profiles/me` with `Authorization: Bearer <ACCESS_TOKEN>` | Your server · protected API request | Your server | `access_token` |

  In compact form: browser authorization → callback code → application backend →
  `POST /oauth/token` → access token → `GET /api/v1/profiles/me`.

- The three channel boundaries are explicit: the **browser / front channel** (steps 1–2), the
  **server-side exchange** (steps 3–5), and the **protected API request** (step 6). The
  `client_secret` appears only in the server-side exchange.
- The Authorization callback now states that the authorization code is not a Profile API
  credential, that the callback handler exchanges it at `POST /oauth/token` with the
  `client_secret`, and that only the resulting access token is sent to
  `GET /api/v1/profiles/me`, before linking to Token Exchange.
- The Profile API states that the `access_token` returned by the token exchange is used, not
  the authorization code from the callback, which is rejected with `401 Invalid access token`.

**Reduced duplication.** The Overview's nine-step lifecycle remains the single full sequence.
Token Exchange no longer repeats it; it links to it and onward to the Profile API. The existing
side-by-side comparison of the authorization code and the access token on Token Exchange is
kept.

**Alternatives considered.**

| Alternative | Reason not selected |
| --- | --- |
| A new box-and-arrow diagram | Inconsistent with the Developer Docs, which use ordered lists and tables so that the sequence is readable without colour or arrows and by assistive technology. |
| The same explanation repeated on Authorization, Token Exchange and Profile API | Duplication increases length and drift risk; the evidence called for one clearer transition, not more copies of it. |
| Merging Authorization and Token Exchange | Reverses the area-based structure introduced after the Sprint 5 developer evaluation; disproportionate to the finding. |
| Strengthening only the Authorization callout | D04's difficulty occurred during the token-exchange task, so Token Exchange itself needed to open with the boundary. |

## 4. B2 Design Response

**Why the finding justified a change.** Task 8 was the weakest Developer Docs task overall. One
developer required Level 3 assistance, and developers who completed it independently also
navigated back and forth between three areas. Handling lost access is a required part of any
integration, because revocation is an identity-owner action of which the application is not
notified.

**Final implementation.**

- **Errors** contains a dedicated recovery block, *Recovering from revoked or expired access*,
  reachable at the stable anchor `#recovery`. It states that a previously working profile read
  that now returns `401 Access token has been revoked` means the identity owner revoked the
  Grant, links to Grants & Revocation, and gives the recovery sequence. It then notes that
  `401 Access token has expired` follows the same path from the new authorization request,
  because there is no refresh token.
- **Grants & Revocation** has a section *What your application sees, and how access is
  restored*. It states that the held access token stops working at once, not at its expiry;
  that it cannot be refreshed and that the code that produced it was consumed at exchange; that
  re-authorization is required and nothing else restores access; and that the identity owner
  must approve the application again through a new authorization request. It links to
  Authorization and to the recovery sequence in Errors.
- **Profile API**, the first area D05 searched, states that a `401` means the token is no
  longer accepted, that retrying with the same token does not help, and that a previously
  working request points to expiry or a revoked Grant, with a link to the recovery sequence.
- The **recovery sequence** is explicit:

  1. The identity owner revokes the Grant; the application is not notified.
  2. The existing access token is no longer accepted: `401 Access token has been revoked`;
     sending the request or the token again does not change the result.
  3. Nothing already issued can be used to regain access: there is no refresh token, and the
     authorization code that produced the token was consumed at exchange
     (`400 Authorization code has already been used`). The stored token is discarded.
  4. The identity owner authorizes the application again (sign-in if needed, Context
     selection, approval on the consent screen).
  5. A new authorization code arrives at the callback.
  6. The server exchanges it at `POST /oauth/token`, with the `client_secret`, for a new access
     token.
  7. Profile reads resume with the new access token, bound to the Context chosen in the new
     approval, which may differ from the previous one.

  In compact form: Grant revoked → existing access rejected → new user authorization → new
  authorization code → new access token → profile access resumes.

**Alternatives considered.**

| Alternative | Reason not selected |
| --- | --- |
| A new "Troubleshooting" area | Adds an area to the navigation and duplicates Errors, which is where a developer with an error should arrive. |
| The full recovery text on every related page | Duplication; the evidence called for connection, not repetition. |
| A revocation notification or webhook | A new API capability, outside the scope of a documentation refinement and not evidenced as necessary. |
| Links only, without a recovery sequence | Links alone would still leave the reader to assemble the order of events. |

## 5. Implementation Traceability

All refinements are in the SecuriSelf Platform Developer Docs feature,
`apps/securiself-platform/src/features/developer-docs/`. The routes are
`/console/docs/authorization`, `/console/docs/token-exchange`, `/console/docs/profile-api`,
`/console/docs/grants` and `/console/docs/errors`.

| Refinement | Files / components | Previous documentation behaviour | Final behaviour |
| --- | --- | --- | --- |
| B1 — Token Exchange | `developer-docs.ts` (`CODE_TO_TOKEN_TRANSITION`; optional `phase` field on flow steps); `components/authorization-flow.tsx` (accepts a `steps` list, defaulting to the Overview's nine steps, and shows each channel label once); `components/docs-areas.tsx` (`TokenExchangeArea`, section `#code-to-token`) | An introductory paragraph, the code/token comparison, then the full nine-step sequence repeated from the Overview with the instruction to locate the boundary by step number. | "You are here" transition linked back to the callback; the "not a Profile API credential" callout; the six-step channel-grouped transition; the code/token comparison; links to the Overview sequence (`/console/docs#flow`) and onward to the Profile API. |
| B1 — Authorization callback | `components/docs-areas.tsx` (`AuthorizationArea`, section `#callback`) | A callout stating that the code "cannot read a profile", linking to Token Exchange without naming the token endpoint, the `client_secret` or the Profile API. | The callout states that the code is not a Profile API credential, that it is exchanged server-side at `POST /oauth/token` with the `client_secret`, and that only the access token is sent to `GET /api/v1/profiles/me`; the link to Token Exchange is kept. |
| B1 — Profile API | `components/docs-areas.tsx` (`ProfileApiArea`) | The Bearer access-token requirement, without mentioning the authorization code. | States that the `access_token` from the token exchange (linked) is used, not the callback code, which is rejected with `401 Invalid access token`. |
| B2 — Errors | `developer-docs.ts` (`REVOCATION_RECOVERY`); `components/docs-areas.tsx` (`ErrorsArea`; the `AreaLink` helper accepts an optional anchor) | The profile-read error table listed the revoked-Grant `401`, followed by "Restart authorization instead", with no link to Grants & Revocation or Authorization. | The existing text is kept and followed by the `#recovery` block: cause (linked to Grants & Revocation), the seven-step recovery sequence, and the expiry case (linked to Authorization). The block is offset so that a link to it lands below the sticky Console and area bars. |
| B2 — Grants & Revocation | `components/docs-areas.tsx` (`GrantsArea`) | One paragraph ending "Re-authorization is required; nothing else restores access.", with no links. | The sentence is kept within a new section stating the application-side consequence and the new approval requirement, linked to Authorization and to `/console/docs/errors#recovery`. |
| B2 — Profile API | `components/docs-areas.tsx` (`ProfileApiArea`) | A code comment suggesting re-authorization, with no link. | A paragraph after the request example explaining a `401` and linking to `/console/docs/errors#recovery`. |

The B1 transition and the B2 sequence are rendered by the component that renders the
Overview's nine-step sequence, so they share its form: a numbered ordered list with an actor tag,
a "carries:" label and a screen-reader step prefix. Channel labels are text, not colour. The
Overview's sequence is unchanged apart from one wrapping adjustment shared by all three lists:
the "carries:" label wraps between words rather than inside a word.

**Cross-links.** The link from the Authorization callback to Token Exchange already existed and
was kept.

| From | Link text | Target | Purpose |
| --- | --- | --- | --- |
| Token Exchange, `#code-to-token` | callback | `/console/docs/authorization#callback` | Where the code comes from ("You are here") |
| Token Exchange, `#code-to-token` | Overview | `/console/docs#flow` | The full nine-step sequence |
| Token Exchange, `#code-to-token` | Profile API | `/console/docs/profile-api` | The next step once the access token is held |
| Profile API | token exchange | `/console/docs/token-exchange` | Where the access token comes from |
| Profile API | recovering from revoked or expired access | `/console/docs/errors#recovery` | Recovery from a rejected profile read, where D05 first searched |
| Grants & Revocation | authorization request | `/console/docs/authorization` | Where the new authorization begins |
| Grants & Revocation | recovery sequence in the Error reference | `/console/docs/errors#recovery` | The step-by-step recovery and the observed error |
| Errors, `#recovery` | Grants & Revocation | `/console/docs/grants` | The lifecycle cause of the error |
| Errors, `#recovery` | authorization request | `/console/docs/authorization` | Where the new authorization begins |

**Automated checks.** Eleven component tests (five for B1, six for B2) in
`components/developer-docs.test.tsx`, including a check that the rejection messages quoted by
the documentation exist verbatim in the API backend source; and two browser scenarios in
`tests/e2e/specs/cohort-b-refinements.spec.ts` that follow the new links across the real routes
and write the captures in [`images/`](images/). No existing Developer Docs test was removed or
weakened.

## 6. Contract and Security Preservation

The B1 and B2 refinements change documentation content and its presentation only. No request
or response example was changed, and the documentation still renders placeholders
(`scs_client_example`, `<SECURISELF_CLIENT_SECRET>`, `<ACCESS_TOKEN>`), never a real or
generated secret. The refinements did not change:

- **`/oauth/authorize`** — the browser-facing start of authorization with `client_id` and
  `redirect_uri`;
- **`client_id` / `client_secret` semantics** — `client_id` public and browser-facing;
  `client_secret` server-only and used only at `POST /oauth/token`;
- **the authorization-code role** — temporary (`AUTH_CODE_TTL_MINUTES`, 5 minutes by default),
  single use, exchangeable only at the token endpoint, never a Profile API credential;
- **the `/oauth/token` contract** — request fields, `client_secret` verification and the
  `{ access_token, token_type: "Bearer", expires_in }` response;
- **the access-token role** — opaque Bearer credential, time-limited by
  `ACCESS_TOKEN_TTL_HOURS`, no refresh token;
- **Context binding** — a token is bound to the one Context chosen at consent; a new approval
  may bind a different Context;
- **Profile API filtering** — `GET /api/v1/profiles/me` returns only the bound Context's data;
- **Grant revocation semantics** — revoking a Grant ends its access at once, without
  notification to the application, and revocation is idempotent;
- **the user-consent requirement** — access is restored only through a new, explicit approval
  by the identity owner on the consent screen.

The final documentation reflects the current implemented behaviour. The statement-by-statement
comparison with the implementation is recorded in validation §4.

## 7. Scope Boundary

- Only B1 and B2 were addressed in this refinement.
- Lower-priority Cohort B suggestions, such as quick-reference improvements, additional
  cross-links beyond those required by B1 and B2, and an optional light appearance, remain
  outside this refinement.
- The nine documentation areas, their routes, their section anchors and their sticky navigation
  are unchanged.
- Implementation alone does not show that developer usability improved. The refinements have
  been implemented and technically validated; whether they reduce the friction observed in
  Cohort B can only be established by the final focused external developer verification.
