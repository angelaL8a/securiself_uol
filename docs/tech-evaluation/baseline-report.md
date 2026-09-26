# SecuriSelf — Baseline Technical Evaluation

| Field | Value |
| --- | --- |
| Document type | Baseline technical evaluation record |
| System evaluated | Completed SecuriSelf implementation: API backend, SecuriSelf Platform (Console and consent screen) and the PrymeCab third-party simulator |
| Evaluation date | 2026-09-12 |
| Evaluation environment | Chromium (Playwright) against production builds of all three applications; isolated PostgreSQL test database |
| Scope | Technical (specification-conformance) evaluation; representative-user evaluation is a separate, later phase |
| Evidence | [`evidence/`](./evidence/) |

---

## 1. Technical Evaluation Purpose and Rationale

SecuriSelf lets a person keep one private root identity and disclose only a selected
*Context* (`SOCIAL`, `PROFESSIONAL`, `LEGAL` or `PRIVATE`) to a third-party application
through an OAuth-like consent flow, with later revocation and an audit trail. Its central
claims are therefore technical: that each Context discloses only its permitted fields, that
unauthorised requests are rejected, that access can be withdrawn, and that disclosure is
recorded.

These claims cannot be established by representative users. A participant can judge whether
a consent screen is understandable, but cannot observe whether a forbidden field is absent
from an API payload, whether a revoked token is rejected, or whether a replayed
authorization code is refused. A technical evaluation was therefore required before the
human evaluation, for two reasons:

1. to establish whether the completed implementation satisfies its specification (the
   project PRD and the in-Console Developer Documentation), independently of how easy it is
   to use; and
2. to ensure that the later human evaluation is conducted on a system whose privacy,
   security and integration behaviour has already been verified, so that any difficulty
   participants encounter can be attributed to usability rather than to undetected
   functional failure.

The evaluation answers a single question:

> Does the completed SecuriSelf implementation behave according to its specification?

No claim about human comprehension, navigation or perceived intuitiveness is made in this
report. Where the distinction matters — for example, a test confirming that the text
"Access token has been revoked" appears in the documentation demonstrates documentation
*coverage*, not that revocation *works* — it is stated explicitly.

This is a baseline record: it reports the behaviour observed, including the product-facing
finding, without correcting it.

---

## 2. Evaluation Scope

### 2.1 System behaviour evaluated

- **Authentication and protected access** — email/password registration and login, session
  token issuance and verification, protection of owner-only endpoints, and Google sign-in to
  the extent it can be evaluated deterministically.
- **Identity Vault** — private storage of the root identity, which is never disclosed
  wholesale to a third party.
- **Contexts** — creation, update and deletion under category-specific validation rules for
  the four categories.
- **Client application registration** — client identifier issuance, one-time display of the
  client secret, and secret rotation.
- **Contextual privacy and disclosure** — the per-category disclosure filter, exclusion of
  forbidden fields, and correspondence between the consent preview and the delivered payload.
- **Authorisation and security** — consent approval and denial, authorization codes, token
  exchange, binding of access tokens to one application and one Context, redirect-URI
  matching, ownership boundaries between users, and the corresponding rejection paths.
- **Third-party integration** — the complete PrymeCab lifecycle across three applications.
- **Grants, revocation and auditability** — grant state, revocation, token invalidation,
  re-authorisation and the audit trail.
- **Multilingual behaviour** — `Accept-Language` resolution as part of the privacy model.
- **In-Console Developer Documentation** — the integration guidance presented to third-party
  developers, checked against implemented behaviour.
- **Accessibility** — automated axe scans and targeted keyboard/semantic checks on core
  interfaces.

### 2.2 Outside the product's scope (PRD §3.2)

Certified OAuth 2.0 / OpenID Connect compliance; PKCE, refresh tokens and scopes beyond
`identity_context`; identity providers other than Google; webhooks; payments; email/SMS
verification and password reset; multi-tenant administration; production hardening at scale;
certified WCAG or assistive-technology studies; and browsers other than Chromium. These are
product non-goals and are not treated as deficiencies.

### 2.3 Outside the scope of this evaluation phase

Human usability, comprehension and perceived intuitiveness (the later phase), and the
behaviour of the real Google identity provider (§5.7, §7).

---

## 3. Evaluation Questions and Success Criteria

| # | Area | Question | Success criterion |
| --- | --- | --- | --- |
| Q1 | Core functionality | Do the core identity, Context and client-registration journeys complete correctly? | Registration, login, Vault, Context, client registration, authorization, token exchange and profile retrieval all succeed with correct data and status codes |
| Q2 | Privacy / context separation | Does each Context disclose only its permitted fields? | **Forbidden-field leakage = 0** for all four categories, at the API and in the rendered third-party interface |
| Q3 | Consent-preview fidelity | Does the consent preview correspond to what the third party receives? | The preview shows the category's permitted fields and no forbidden field |
| Q4 | Security / authorisation | Are invalid, expired, replayed, revoked, manipulated, cross-client and cross-user requests rejected? | Every defined rejection case returns the expected 4xx status and grants no access |
| Q5 | Token–context binding | Is an access token bound to exactly one application and one Context? | A token cannot retrieve the fields of a different Context |
| Q6 | Third-party integration | Does the PrymeCab lifecycle complete coherently across the three applications? | Login → consent → callback → context-bound profile → activity → revocation → loss of access, observed in a real browser for more than one Context |
| Q7 | Grants / revocation / audit | Is post-authorisation control correct and auditable? | Revocation invalidates tokens, is idempotent and produces exactly one `ACCESS_REVOKED` event; disclosure events are recorded and correctly associated |
| Q8 | Multilingual behaviour | Does language selection change values without broadening disclosure? | `Accept-Language` changes only localisable values within the permitted field set; the field set and authorised Context are unchanged |
| Q9 | Authentication | Are email/password and Google sign-in correct where deterministically testable? | Correct sessions; for Google: credential verification, account resolution and linking without duplicates, session interoperability, and non-disclosure of the Google subject identifier |
| Q10 | Developer documentation | Does the in-Console documentation give a third-party developer accurate integration information? | Documented integration facts match implemented behaviour; the documentation is reachable through the authenticated Console |
| Q11 | Accessibility | Is there any critical or serious automated accessibility violation on the evaluated interfaces? | 0 critical / 0 serious axe violations (NFR-QUA-07) on every evaluated route and state |

The privacy and security criteria are interpreted strictly: a single forbidden-field
disclosure, or a single accepted unauthorised request, would constitute failure of that
criterion regardless of the number of passing positive cases.

---

## 4. Evaluation Methods

Five forms of evidence were used. They support different kinds of claim and are attributed
individually in §5.

- **Backend integration tests** (Vitest and Supertest). Requests are made to the API at its
  HTTP boundary against a real PostgreSQL database, without mocking the persistence layer,
  so privacy and security properties are verified against stored data rather than simulated
  data. This is the primary evidence for enforcement behaviour.
- **Front-end unit and component tests** (Vitest and React Testing Library) for client-side
  behaviour of the Platform and the PrymeCab simulator, such as return-URL validation
  against open redirects and the mapping of API responses to PrymeCab's access states.
  These provide supporting evidence only (`evidence/frontend-unit-tests.txt`).
- **Browser end-to-end scenarios** (Playwright, Chromium) running the API, the Platform and
  the PrymeCab simulator together. These are the only evidence for the cross-application
  disclosure path as experienced through a real browser redirect chain. Outcomes are
  reported per scenario; two scenarios (`grant-revocation`, `privacy-boundary`) are recorded
  from a second execution because their first execution stopped at the automated sign-in
  step, before any disclosure or revocation assertion was reached.
- **Automated accessibility scanning** (`@axe-core/playwright` with the WCAG 2.0/2.1 A and AA
  rule sets, failing on critical or serious violations), combined with explicit keyboard,
  focus, role and `aria-checked` assertions.
- **Source inspection** for properties that are structural rather than observable in a
  single request (for example, how the disclosure filter constructs a payload), and for
  checking the in-Console documentation against implemented behaviour. Claims resting on
  inspection alone are marked as such.

---

## 5. Technical Evaluation Results

| Evidence source | Result |
| --- | --- |
| Backend integration tests | **67 / 67 passed** (11 suites) |
| Platform unit/component tests | **66 / 66 passed** (15 suites) |
| PrymeCab simulator unit tests | **8 / 8 passed** (2 suites) |
| Browser end-to-end scenarios | **11 / 11 scenarios passed** |
| Accessibility (axe) | **23 of 24** route/state scans with 0 critical / 0 serious; **1 serious violation** on the Grants revoke-confirmation dialog (F1) |

### 5.1 Core Functionality (Q1)

**Evaluated.** The owner journey from registration to third-party profile retrieval, and
the client-application lifecycle.

**Expected.** Registration and login return the user and a session token, without any
password hash; the current user is retrievable; Vault updates persist; Contexts of each
category are created, updated and deleted under their validation rules; client registration
returns the secret once and rotation invalidates the previous secret; authorization, token
exchange and profile retrieval complete; the health endpoint responds.

**Observed.** All behaviours were confirmed by the `functional` (8 tests) and `lifecycle`
(5 tests) backend suites. Registration returns `201` with neither `passwordHash` nor
`googleId` in the body; Vault updates persist; `PROFESSIONAL`, `LEGAL` and `SOCIAL`
Contexts are created; invalid category updates are rejected and a deleted Context is no
longer readable; a rotated client secret is returned once and the old secret stops working;
the authorization code exchanges for an access token and `/profiles/me` returns the filtered
payload. The browser scenarios additionally complete the Console and consent forms end to end.

**Conclusion.** Pass. **Evidence:** `evidence/backend-vitest.txt`.

### 5.2 Privacy and Context Separation (Q2, Q3)

This is the central claim of the project and was evaluated with positive and negative cases
at two layers: the API and the rendered third-party interface.

**Filter design (source inspection).** The disclosure filter constructs the response
field by field from a per-category allow-list, rather than serialising the stored user
record and removing fields. A field later added to the data model therefore cannot appear in
an existing category's payload unless it is explicitly added to that category. The root
email, gender and Google subject identifier are referenced by no category; legal names and
`document_id` are referenced only by `LEGAL`.

**Per-category disclosure (backend integration tests).**

| Category | Fields disclosed | Forbidden fields asserted absent | Root email in payload |
| --- | --- | --- | --- |
| `SOCIAL` | `display_name`, `username`, `pronouns`, `avatar_url` | email, gender, legal names, `document_id`, `job_title`, `company`, `short_bio`, password hash | No |
| `PROFESSIONAL` | `display_name`, `pronouns`, `job_title`, `company`, `short_bio`, `avatar_url` | email, gender, legal names, `document_id` | No |
| `LEGAL` | `legal_first_name`, `legal_last_name`, `document_id`, `avatar_url` | email, gender, `username`, `job_title`, `company`, `short_bio`, `display_name` | No |
| `PRIVATE` | `display_name`, `pronouns`, `avatar_url` | email, gender, legal names, `document_id`, `username`, `job_title`, `company`, `short_bio` | No |

The `privacy` suite (5 tests) asserts each category's disclosed set, enumerates its forbidden
set, and checks that the serialised payload of every category does not contain the root email.
A dedicated test confirms that legal identifiers remain outside all non-`LEGAL` Contexts.
Unset `pronouns` are disclosed as the literal value `"hidden"`.

**Browser-layer confirmation (end-to-end scenarios).** The browser scenarios re-establish the
result through the real redirect path:

- `social-disclosure` — neither the consent preview nor the rendered PrymeCab interface
  contains the email, legal names, document identifier, gender, job title or company;
- `legal-disclosure` — legal fields are shown to PrymeCab while the root email is never
  shown;
- `privacy-boundary` — the owner's Vault holds the root email, while the same owner's
  `SOCIAL` and `LEGAL` third-party profiles never expose it.

**Consent-preview fidelity (Q3).** The consent preview is generated by the Platform's
disclosure model, which mirrors the backend allow-list per category. The end-to-end
assertions confirm that neither the preview a user approves nor the profile subsequently
rendered in PrymeCab contains a forbidden field.

**Conclusion.** Pass — **forbidden-field leakage = 0**, observed at the API boundary for all
four categories and in the rendered third-party interface for the `SOCIAL` and `LEGAL`
Contexts exercised in the browser. **Evidence:** `evidence/backend-vitest.txt`,
`evidence/e2e-results.txt`.

### 5.3 Security and Authorisation (Q4, Q5)

Both acceptance and rejection paths were evaluated; the rejection paths constitute the
substantive security evidence.

| # | Rejection case | Expected | Observed | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Expired authorization code | 400 | 400 | `security` suite |
| 2 | Replayed (already consumed) code | first exchange 200, second 400 | as expected | `security` suite |
| 3 | Wrong client secret | 401 | 401 | `security` suite |
| 4 | Redirect URI differs at exchange | 400 | 400 | `security` suite |
| 5 | Missing bearer token | 401 | 401 | `security` suite |
| 6 | Manipulated bearer token | 401 | 401 | `security` suite |
| 7 | Token used after its grant is revoked | 401 | 200 before revocation, 401 after | `security` suite |
| 8 | Token bound to one Context used to read another | Context-correct payload only | `SOCIAL` token returns no `job_title` | `security` suite |
| 9 | Cross-user Context read, update or delete | 403/404 | as expected | `ownership` suite |
| 10 | Cross-user client inspection or secret rotation | 403/404 | as expected | `ownership` suite |
| 11 | Cross-user grant revocation | 403/404 | as expected | `ownership` suite |
| 12 | Authorization code presented by a different client | 400, failure audited | code path returns 400 and records `TOKEN_EXCHANGE_FAILED` (`application_mismatch`) | source inspection only |

**Credentials at rest and non-disclosure.** Passwords and client secrets are stored as
bcrypt hashes; authorization codes and access tokens are opaque values. The grant-listing test
asserts that no client secret or secret hash appears in any response. Redirect URIs are
compared by exact string equality. By inspection, the token endpoint returns the same
`401 Invalid client credentials` for an unknown `client_id` and for a wrong secret, so the
response does not reveal which identifiers exist.

**Conclusion.** Pass — all 11 rejection cases exercised by automated tests produced the
expected rejection and granted no access, the positive token–context binding case behaved
correctly, and the cross-client case is handled correctly in the inspected code path. This
establishes the evaluated rejection behaviours; it is not a general claim that the system is
secure against all attacks. **Evidence:** `evidence/backend-vitest.txt`.

### 5.4 Third-Party Integration (Q6)

**Evaluated.** The complete PrymeCab lifecycle in a real browser across the API, the
Platform consent screen and the simulator, repeated with different Contexts.

**Observed.**

- `social-disclosure` — PrymeCab login → SecuriSelf consent → `SOCIAL` selection → callback →
  context-bound profile displayed in PrymeCab → `PROFILE_READ` visible in the owner's
  Activity, with zero forbidden fields.
- `legal-disclosure` — the same path for a `LEGAL` Context, with a different disclosed field
  set and the root email still absent. This demonstrates context-specific behaviour rather
  than a single happy path.
- `consent-denial` — denial returns no authorization `code`, PrymeCab's profile request
  remains `401`, and neither `ACCESS_GRANTED` nor `PROFILE_READ` is recorded.
- `grant-revocation` — login → consent → profile retrieved (200) → revocation through the
  Grants interface → Activity shows `ACCESS_REVOKED` with the same Context label as Grants →
  PrymeCab presents its plain-language access-lost state → the next profile request returns
  `401`. No client secret is present in browser storage.
- `privacy-boundary` — see §5.2.

**Conclusion.** Pass — the complete integration path functions coherently across the three
applications and is demonstrated for more than one Context. **Evidence:**
`evidence/e2e-results.txt`.

### 5.5 Grants, Revocation and Auditability (Q7)

**Grants and revocation.** Approval creates or reuses a single grant per
(user, application, Context) and clears any previous revocation on re-authorisation. By
inspection, revocation is performed in one database transaction in which only the first
request changes the grant's state, all active tokens for that grant are revoked together, and
one `ACCESS_REVOKED` event is written. The backend tests confirm that revocation invalidates
the active token (200 → 401), that re-authorisation reactivates the same grant, and that a
second revocation returns the same revoked grant without writing a second `ACCESS_REVOKED`
event (`grants-idempotent` suite).

**Auditability.** The `audit` suite verifies the chain *event occurs → record created →
correctly associated → retrievable*: `ACCESS_GRANTED`, `PROFILE_READ` and `ACCESS_REVOKED` are
recorded; logs are returned newest first; and a `PROFILE_READ` is associated with the correct
user, application and Context. By inspection, every failed token exchange after the code is
identified writes `TOKEN_EXCHANGE_FAILED` with a reason. The `grant-revocation` browser
scenario confirms that the revoked state is consistent across the Grants page, the Activity
page and PrymeCab.

**Conclusion.** Pass. **Evidence:** `evidence/backend-vitest.txt`,
`evidence/e2e-results.txt`.

### 5.6 Multilingual Behaviour (Q8)

**Evaluated.** Whether `Accept-Language` selects among already-permitted values without
widening disclosure — localisation treated as part of the privacy model rather than as a
cosmetic feature.

**Observed.** The `localization` and `locale` backend suites confirm English and Spanish
selection, reduction of regional tags (`es-MX` → `es`), ordering by quality value, and
fallback to English for missing, wildcard or unsupported headers. When a Spanish variant is
missing for one field, that field falls back individually without failing the request.
Requesting Spanish for a `SOCIAL` or `PRIVATE` Context returns Spanish `pronouns` without
disclosing `short_bio`: the permitted field set is unchanged. In the browser, the
`localization` scenarios confirm that the same grant returns English or Spanish values in
PrymeCab, that values entered in the Console persist after reload, and that per-field
fallback holds.

**Conclusion.** Pass — language selection changes disclosed *values* only, never the
disclosed *fields*. **Evidence:** `evidence/backend-vitest.txt`, `evidence/e2e-results.txt`.

### 5.7 Authentication (Q9)

**Email/password.** Covered in §5.1; session tokens are verified on every protected request.

**Google sign-in.** The `google-auth` and `google-id-token` suites, with the Google token
verifier replaced by a deterministic stub, confirm that: a new Google user creates exactly one
account; a returning Google user resolves to the same account; a Google identity whose verified
email matches an existing email/password account is linked to that account rather than
duplicating it, and the existing Vault is preserved; an invalid or missing credential is
rejected with no account created; the endpoint responds `503` when Google sign-in is not
configured; the issued session token is accepted by the existing session verification; and a
Google-created account discloses only Context fields through the full consent flow. The Google
subject identifier is never returned to the client.

**Conclusion.** Pass for the locally deterministic behaviour. The behaviour of the real
Google provider is not established by these results (§7). **Evidence:**
`evidence/backend-vitest.txt`.

### 5.8 In-Console Developer Documentation (Q10)

**Evaluated.** Whether the Developer Documentation presented to third-party developers inside
the Console accurately describes the implemented integration.

**Observed.** The documentation is reachable only through the authenticated Console and is
organised into nine areas (confirmed by the three `developer-docs` browser scenarios). Its
payload examples and disclosure matrices are generated at render time from the same
disclosure model used by the consent screen, so they cannot diverge from it. On inspection
against implemented behaviour, the documented facts were accurate: the separation between
browser-side and server-side steps, with `client_secret` and `access_token` kept server-side;
exact-string redirect-URI matching; single-use five-minute authorization codes and one-hour
access tokens without refresh; the JSON body of `POST /oauth/token`; `pronouns` disclosed as
`"hidden"` when unset; the `401` returned after revocation; the localisable fields per category
(`PROFESSIONAL`: `pronouns`, `job_title`, `short_bio`; `SOCIAL` and `PRIVATE`: `pronouns`;
`LEGAL`: none); and the error messages, which match those the API returns.

**Conclusion.** Pass. The browser scenarios establish reachability and structure; accuracy
rests on inspection. **Evidence:** `evidence/e2e-results.txt`.

### 5.9 Accessibility (Q11)

**Evaluated.** 24 route/state scans across the Platform and PrymeCab using the WCAG 2.0/2.1 A
and AA axe rule sets, together with targeted keyboard and semantic assertions.

**Observed.**

- **Public pages** (Platform landing, sign-in, sign-up, PrymeCab landing): 0 critical /
  0 serious. Keyboard focus reaches "Sign in" and "Login with SecuriSelf"; email and password
  inputs are labelled.
- **Authenticated Console** (overview, Vault, Contexts list and creation, Clients, Activity,
  Grants in empty and active states, and all nine Developer Documentation routes), the
  **consent screen** and the **PrymeCab profile page**: 0 critical / 0 serious. The consent
  screen's Context options are keyboard-operable (`Enter` sets `aria-checked="true"`) and
  Approve/Deny are reachable by keyboard focus.
- **Grants revoke-confirmation dialog**: **1 serious `color-contrast` violation affecting
  4 nodes**. Secondary text (foreground `#696969` / `#6b6b6b`, 14 px) is rendered on dark
  backgrounds (`#070709`, `#0c0c0e`, `#421d1f`) at contrast ratios of **3.66:1, 3.55:1 and
  2.76:1**, against the 4.5:1 required for normal-size text (WCAG 2.1 SC 1.4.3). The violation
  was reported on all three scan attempts. This is finding **F1** (§6.2).

Several scans also returned axe *incomplete* results (checks axe could not decide
automatically); these are not violations and were not manually reviewed.

**Conclusion.** Criterion not met for one interface state: 23 of 24 scans satisfied the
criterion; the revoke-confirmation dialog did not. These results are bounded to automated axe
rules and the targeted checks listed; they are not a WCAG conformance audit. **Evidence:**
`evidence/accessibility-results.txt`, `evidence/accessibility-axe-scans.json`.

---

## 6. Summary of Results and Product-Facing Findings

### 6.1 Results by evaluation question

| Area | Question(s) | Result |
| --- | --- | --- |
| Core functionality | Q1 | Pass |
| Privacy / context separation | Q2, Q3 | Pass — forbidden-field leakage = 0 |
| Security / authorisation | Q4, Q5 | Pass — 11/11 automated rejection cases correct; cross-client case correct by inspection |
| Third-party integration | Q6 | Pass — complete lifecycle for `SOCIAL` and `LEGAL` Contexts |
| Grants / revocation / audit | Q7 | Pass |
| Multilingual behaviour | Q8 | Pass — values change, disclosed fields do not |
| Authentication | Q9 | Pass within the deterministic scope; real Google provider not exercised |
| Developer documentation | Q10 | Pass |
| Accessibility | Q11 | Not met for one state — 1 serious violation (F1); 23 of 24 scans clean |

### 6.2 Product-facing finding

One product-facing technical finding was identified in the evaluated SecuriSelf system
behaviour.

**F1 — Insufficient text contrast in the Grants revoke-confirmation dialog.**

| Aspect | Detail |
| --- | --- |
| Affected interface | Console → Grants → revoke-confirmation dialog |
| Evaluation question | Q11 (accessibility) |
| Method | `@axe-core/playwright`, WCAG 2.0/2.1 A/AA rule sets; three scan attempts |
| Observed | One serious `color-contrast` violation affecting 4 nodes: secondary text `#696969` / `#6b6b6b` at 14 px on dark backgrounds, with contrast ratios of 3.66:1, 3.55:1 and 2.76:1; reported on 3 of 3 attempts |
| Expected | 0 serious violations (NFR-QUA-07); minimum 4.5:1 contrast for normal-size text (WCAG 2.1 SC 1.4.3) |
| Impact | Medium. Users with low vision, or anyone in poor viewing conditions, may be unable to read the explanatory text shown when confirming a revocation — the step at which a user decides to withdraw a third party's access. The revocation itself functions correctly (§5.5); the defect concerns legibility, not behaviour. |
| Status | Open; recorded as observed and not remediated during this evaluation |

---

## 7. Evaluation Limitations and Boundaries

- **Real Google provider not exercised.** Google sign-in was evaluated with a stubbed token
  verifier. The live Google account chooser and real token issuance cannot be driven by
  automated browser tests or proven by a stub; their behaviour is therefore not established
  here.
- **Single browser engine.** Browser scenarios and accessibility scans ran in Chromium only,
  consistent with the product scope. Behaviour in Firefox and WebKit is not confirmed.
- **Single viewport for accessibility.** Scans ran at a desktop viewport; narrow-viewport
  layouts were not scanned.
- **Bounded accessibility conclusions.** Automated axe rules and targeted keyboard/semantic
  checks detect only a subset of accessibility barriers. No assistive-technology testing was
  performed and no WCAG conformance claim is made. Axe *incomplete* results were not manually
  reviewed. Because axe may report contrast on overlays as *incomplete* rather than as a
  violation when it cannot determine the background colour (for example, while an overlay is
  still appearing), the absence of F1 in any single automated run should not be read as
  evidence that it has been resolved.
- **Browser-layer privacy coverage.** Forbidden-field leakage was verified for all four
  categories at the API, and for the `SOCIAL` and `LEGAL` Contexts through the full browser
  path. The `PROFESSIONAL` Context was exercised in the browser by the localisation scenarios,
  which do not assert forbidden-field absence, and `PRIVATE` was not exercised in the browser;
  for these two categories the leakage result rests on the API-level evidence.
- **Inspection-based claims.** The cross-client authorization-code rejection, the
  transactional form of revocation, the audit of failed token exchanges and the accuracy of the
  Developer Documentation are established by source inspection rather than by an executed test.
- **Human factors excluded.** No conclusion is drawn about comprehension, ease of navigation
  or intuitiveness.

---

## 8. Technical Evaluation Conclusion

The evidence shows that the completed SecuriSelf implementation satisfies the defined
technical criteria for its core privacy, security, integration and auditability behaviour,
and that one product-facing technical finding (F1) remains open.

Specifically, the evidence supports the following conclusions:

- **The contextual privacy model holds.** Forbidden-field leakage was zero for all four
  Context categories at the API and for the Contexts exercised through the full browser path,
  in both positive and negative cases, and disclosure is constructed from an allow-list that
  does not expose fields added later to the data model (§5.2).
- **Evaluated authorisation rejections behave correctly.** All 11 automated rejection cases
  (expired, replayed, wrong-secret, wrong-redirect, missing, manipulated, revoked, cross-Context
  and cross-user) were rejected as expected, and access tokens are bound to a single Context
  (§5.3).
- **Third-party integration completes coherently.** The PrymeCab lifecycle — consent, callback,
  context-bound retrieval, activity, revocation and loss of access — functions across the
  three applications for more than one Context (§5.4).
- **Revocation and auditability are correct.** Revocation invalidates tokens, is idempotent
  and produces exactly one `ACCESS_REVOKED` event; disclosure events are recorded and correctly
  associated, and the revoked state is consistent across interfaces (§5.5).
- **Localisation respects the privacy model.** Language selection changes disclosed values but
  never the disclosed field set (§5.6).
- **Authentication behaves correctly within its deterministic scope**, including account
  linking without duplication and non-disclosure of the Google subject identifier (§5.7).
- **The in-Console Developer Documentation is accurate** on the integration facts examined
  (§5.8).
- **Accessibility criteria are met on 23 of 24 evaluated states.** The Grants
  revoke-confirmation dialog has a serious contrast violation (F1), which affects a screen
  that the representative-user evaluation is expected to exercise (§5.9, §6.2).

The technical evaluation does not establish that representative users can understand,
navigate or intuitively operate these capabilities; that the real Google provider behaves as
the stubbed verifier does; that behaviour holds in browsers other than Chromium or at narrow
viewports; or that any interface meets full WCAG conformance. Human comprehension and
usability are the subject of the later representative-user evaluation.
