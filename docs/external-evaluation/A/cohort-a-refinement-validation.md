# Cohort A Refinement Technical Validation

This document records the technical validation of the four Cohort A post-evaluation
refinements (A1–A4) described in
[`cohort-a-refinement-implementation.md`](cohort-a-refinement-implementation.md). It is a
technical validation only. It does not replace, and makes no prediction about, the focused
human verification defined in [`cohort-a-final-verification-plan.md`](cohort-a-final-verification-plan.md).

## Validation objective

The validation aims to demonstrate that:

1. each planned refinement exists in the running application;
2. the intended interactions technically work;
3. existing privacy and security behaviour remains intact;
4. no relevant regression was detected in the executed tests.

## 1. Verification Method

- **Environment.** The repository's existing test harnesses. The E2E harness builds the
  SecuriSelf Platform and PrymeCab simulator for production, starts them with the API against
  an isolated E2E database, and reseeds the database before every test. Browser checks used
  Chromium (Playwright 1.61.1, desktop viewport 1280 × 720). Accessibility scans used
  `@axe-core/playwright` with the WCAG 2.0/2.1 A/AA rule tags, as in the baseline evaluation.
- **Order.** Backend and browser suites share one test database and were therefore run one after
  the other, never in parallel.
- **New automated checks.** Unit/component tests were added for each refinement, together with a
  new browser spec, `tests/e2e/specs/cohort-a-refinements.spec.ts` (one scenario per
  refinement). Three axe scans were added to the existing accessibility spec for states
  introduced or changed by the refinements (§5).
- **Existing checks.** All existing suites were run unchanged, apart from the three added axe
  scans. No existing test was removed, skipped or weakened.
- **Side effects.** The existing localization spec regenerates two Sprint 3 evidence screenshots,
  and the accessibility helper rewrites `writeup-evidence/reports/accessibility-summary.json`.
  After the runs, these tracked files were restored to their previous versions, so that earlier
  evidence is unchanged. The summary produced by this validation is stored separately in
  [`evidence/accessibility-summary.json`](evidence/accessibility-summary.json).

## 2. Refinement Verification

| Refinement | Verification method | Expected behaviour | Observed result | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| A1 | Browser: `cohort-a-refinements.spec.ts` › *A1* | First Tab stop on the Grants page is a visible *Skip to main content* link; Enter moves focus to `<main>`; Revoke is then reached in 2 Tab presses | First Tab focused the visible skip link; Enter focused `main#main-content`; Revoke reached after 2 Tab presses | Pass | [`e2e-tests.txt`](evidence/e2e-tests.txt) |
| A1 | Same test, measurement | Fewer key presses to Revoke with the skip link than without | Without skip link: 12 Tab presses (the skip link is the 1st stop, so the sequence before the refinement was 11). With skip link: 1 Tab + 1 Enter + 2 Tab | Pass | [`e2e-tests.txt`](evidence/e2e-tests.txt) (`[A1]` line) |
| A1 | Same test | Row of the keyboard-focused Revoke is highlighted; control keeps visible text *Revoke* | Row computed background changed while Revoke had keyboard focus; text *Revoke* | Pass | [`e2e-tests.txt`](evidence/e2e-tests.txt) |
| A1 | Same test | Confirmation can be opened and completed with the keyboard only; state shown as text | Enter opened the dialog; Tab reached *Revoke access*; Enter revoked; dialog closed; row shows *Revoked*; Revoke control removed | Pass | [`e2e-tests.txt`](evidence/e2e-tests.txt) |
| A1 | Same test, API | Revocation semantics unchanged | Grant `revokedAt` set; PrymeCab profile request returned 401 | Pass | [`e2e-tests.txt`](evidence/e2e-tests.txt) |
| A1 | Unit: `grants-list.test.tsx` (2 new tests) | Keyboard-only reach and confirm call the existing revoke mutation once; Escape closes without revoking | First Tab focused the active Grant's Revoke (revoked row has no control); Enter / Tab / Enter called `mutate("grant-1", …)`; Escape closed the dialog with no call | Pass | [`platform-unit-tests.txt`](evidence/platform-unit-tests.txt) |
| A1 | Axe scans `/console/grants-skip-link-focused`, `/console/grants-row-focused` | No critical or serious violation | 0 critical, 0 serious, 0 moderate, 0 minor in both scans, in 3 of 3 runs | Pass | [`accessibility-grants-rerun.txt`](evidence/accessibility-grants-rerun.txt), [`accessibility-summary.json`](evidence/accessibility-summary.json) |
| A2 | Browser: `cohort-a-refinements.spec.ts` › *A2* | Grants text begins "Current permissions:"; *View Activity* → `/console/activity`; Activity text begins "A record of what has happened:"; *Manage current Grants* → `/console/grants` | All texts rendered; both links had the expected `href` and navigated to the expected route | Pass | [`e2e-tests.txt`](evidence/e2e-tests.txt) |
| A2 | Same test, API before/after navigation | Navigation changes neither Grants nor audit events | Grants list and audit-log list deep-equal before and after the navigation round trip | Pass | [`e2e-tests.txt`](evidence/e2e-tests.txt) |
| A2 | Unit: `grants-page-states.test.tsx` (1 new test) | Grants description and *View Activity* link render | Rendered; link `href="/console/activity"` | Pass | [`platform-unit-tests.txt`](evidence/platform-unit-tests.txt) |
| A3 | Browser: `cohort-a-refinements.spec.ts` › *A3* | Named region *Language variants* with the same-Context explanation on the Professional Context editor | Region present, explanation rendered verbatim | Pass | [`e2e-tests.txt`](evidence/e2e-tests.txt) |
| A3 | Same test, API before/after save | Adding a Spanish value updates the same Context; no Context created; English value intact | Context IDs identical before and after save; saved `jobTitleI18n` = `{ en: "Software Engineer", es: "Ingeniera principal" }` | Pass | [`e2e-tests.txt`](evidence/e2e-tests.txt) |
| A3 | Unit: `context-form.test.tsx` (3 new tests) | Cue and field list render; tablist described by cue; no cue for Legal; values survive switching; a single submission carries both variants | "Only pronouns, job title, and short bio have language variants"; tablist description matches; no region for Legal; values retained across tab switches; `onSubmit` called once with `jobTitle` and `jobTitleEs` | Pass | [`platform-unit-tests.txt`](evidence/platform-unit-tests.txt) |
| A3 | Existing browser: `localization.spec.ts` (3 tests) | Existing EN/ES entry, Accept-Language responses and per-field fallback unchanged | 3 of 3 passed (run 2) | Pass | [`e2e-tests.txt`](evidence/e2e-tests.txt) |
| A4 | Browser: `cohort-a-refinements.spec.ts` › *A4* | No *Not shared* region before selection; category-specific labels after selection; list updates on change of selection | Absent before selection. Social: Legal name, Document ID, Account email, Gender, Your other Contexts. Legal: Account email, Gender, Your other Contexts. Professional: Document ID, Account email, Gender, Legal name, Your other Contexts | Pass | [`e2e-tests.txt`](evidence/e2e-tests.txt) |
| A4 | Same test, page text | No hidden value displayed | With Social selected, page text contained none of the seeded account email, legal first name, legal last name or document ID; with Legal selected, the region contained none of them and the page did not contain the account email (the Legal preview shows the legal name and document ID, as before) | Pass | [`e2e-tests.txt`](evidence/e2e-tests.txt) |
| A4 | Same test, preview and approval | Preview unchanged; approval authorises exactly the selected Context | Preview showed `job_title` for Professional; after approval PrymeCab showed PROFESSIONAL; exactly 1 Grant, for *E2E Professional*, active | Pass | [`e2e-tests.txt`](evidence/e2e-tests.txt) |
| A4 | Same test | Corrected consent notice | "…Vault data not included in that payload, remain private." rendered | Pass | [`e2e-tests.txt`](evidence/e2e-tests.txt) |
| A4 | Unit: `context-rules.test.ts` (2 new), `consent-not-shared.test.tsx` (3 new) | Labels per category; no label names a field disclosed by that category's payload; region named; updates on category change; no `@` in rendered text | All assertions held | Pass | [`platform-unit-tests.txt`](evidence/platform-unit-tests.txt) |
| A4 | Axe scan `oauth-consent-context-selected` (new) | No critical or serious violation | 2 serious rule violations, both on elements not changed by A4; see §5.2 | Fail (pre-existing, not caused by A4) | [`accessibility-tests.txt`](evidence/accessibility-tests.txt), [`consent-axe-diagnostic.json`](evidence/consent-axe-diagnostic.json) |

## 3. Executed Commands and Results

All commands were run from the repository root. Output is stored, unedited, in
[`evidence/`](evidence/).

| Suite | Command | Result | Pre-existing failure | Interpretation | Output |
| --- | --- | --- | --- | --- | --- |
| Backend integration | `pnpm test:backend` | 67 / 67 passed (11 files) | — | Identical count to the baseline (67 / 67); no backend file changed | [`backend-tests.txt`](evidence/backend-tests.txt) |
| Platform unit / component | `pnpm test:platform` | 77 / 77 passed (17 files) | — | Baseline 66 / 66 (15 files) plus 11 new tests in 2 new and 3 extended files | [`platform-unit-tests.txt`](evidence/platform-unit-tests.txt) |
| PrymeCab simulator unit | `pnpm --filter prymecab-simulator test` | 8 / 8 passed (2 files) | — | Identical to the baseline; simulator not modified | [`prymecab-unit-tests.txt`](evidence/prymecab-unit-tests.txt) |
| Browser E2E, run 1 | `pnpm test:e2e` | 13 passed, 2 failed (15) | Yes: both failures at the automated sign-in step | `grant-revocation` and one `localization` test stopped at sign-in, before any refined surface was reached (§5.1) | [`e2e-tests-run1.txt`](evidence/e2e-tests-run1.txt) |
| Browser E2E, run 2 | `pnpm test:e2e` | 14 passed, 1 failed (15) | Yes: failure at the automated sign-in step | `legal-disclosure` stopped at sign-in (§5.1); both run 1 failures passed | [`e2e-tests.txt`](evidence/e2e-tests.txt) |
| Browser E2E, targeted re-run | `pnpm test:e2e:prepare && pnpm exec playwright test tests/e2e/specs/legal-disclosure.spec.ts --repeat-each 3` | 3 / 3 passed | — | Every one of the 15 scenarios passed in at least one run; the 4 new scenarios passed in both full runs (between runs 1 and 2, the A1 scenario gained the Tab-count measurement and the A4 scenario the consent-notice assertion; run 2 is the final version) | [`e2e-legal-disclosure-rerun.txt`](evidence/e2e-legal-disclosure-rerun.txt) |
| Accessibility, run 1 | `pnpm test:a11y` | 2 passed, 1 failed (3) | Yes: sign-in step | *Grants page and revoke dialog* stopped at sign-in before any scan. Run before the three new scans were added | [`accessibility-tests-run1.txt`](evidence/accessibility-tests-run1.txt) |
| Accessibility, run 2 | `pnpm test:a11y` | 1 passed, 2 failed (3) | Yes: both | *Authenticated console and consent screens*: new scan `oauth-consent-context-selected` reported 2 serious violations on unchanged elements (§5.2). *Grants page and revoke dialog*: sign-in step (§5.1) | [`accessibility-tests.txt`](evidence/accessibility-tests.txt) |
| Accessibility, targeted re-run | `pnpm test:e2e:prepare && pnpm exec playwright test tests/e2e/specs/accessibility.spec.ts --grep "Grants page and revoke dialog" --repeat-each 3` | 3 / 3 passed | — | Grants, skip-link-focused, row-focused and revoke-dialog scans: 0 critical / 0 serious | [`accessibility-grants-rerun.txt`](evidence/accessibility-grants-rerun.txt) |
| Lint | `pnpm lint` (via `pnpm test:quality`) | Pass, 0 warnings (2 packages with a lint task) | — | — | [`lint-and-type-check.txt`](evidence/lint-and-type-check.txt) |
| Type check | `pnpm check-types` (via `pnpm test:quality`) | Pass (3 packages) | — | — | [`lint-and-type-check.txt`](evidence/lint-and-type-check.txt) |

**Axe scan totals** (latest result per route/state; [`evidence/accessibility-summary.json`](evidence/accessibility-summary.json)):
27 scans. 26 report 0 critical and 0 serious violations (and 0 moderate and 0 minor). One,
`oauth-consent-context-selected`, reports 2 serious violations (§5.2). The baseline had 24
scans; the 3 new scans are `oauth-consent-context-selected`, `/console/grants-skip-link-focused`
and `/console/grants-row-focused`. Every baseline route/state scanned again reported 0 critical
and 0 serious violations, including `/console/contexts/new` (which now contains the A3 region),
`/console/grants`, `/console/activity`, the consent screen before selection and all nine
Developer Docs routes.

## 4. Regression Verification of Invariants

No API, database, PrymeCab or authorization file was modified. The invariants below were
additionally exercised by the suites listed.

| Invariant | Verified by | Result |
| --- | --- | --- |
| Vault privacy; root email excluded from `/profiles/me` | Backend `privacy.test.ts`; E2E `privacy-boundary.spec.ts`, `social-disclosure.spec.ts`, `legal-disclosure.spec.ts` | Pass |
| Context ownership | Backend `ownership.test.ts` | Pass |
| Context-bound access | Backend `security.test.ts` (*binds a token to a single context and cannot read another*); E2E A4 scenario (single Grant for the selected Context) | Pass |
| Category field allow-lists; Legal-only data | Backend `privacy.test.ts`; platform `context-rules.test.ts` (existing payload tests unchanged) | Pass |
| OAuth-like flow; authorization-code and access-token behaviour | Backend `security.test.ts` (expired / consumed code, wrong secret, wrong redirect URI, missing / manipulated / revoked token), `functional.test.ts`; E2E `consent-denial.spec.ts` | Pass |
| Audit-event generation | Backend `audit.test.ts`; E2E A2 scenario (no audit change on navigation); E2E `grant-revocation.spec.ts` (*Access revoked* in Activity) | Pass |
| Grant revocation semantics, including repeated revocation | Backend `grants-idempotent.test.ts` (*revokes once, then returns the same revoked Grant without a second ACCESS_REVOKED*), `ownership.test.ts`; E2E A1 scenario | Pass |
| PrymeCab access-loss behaviour | E2E `grant-revocation.spec.ts` (run 2) and A1 scenario (401 after revocation) | Pass |
| Accept-Language semantics | Backend `localization.test.ts`, `locale.test.ts`; E2E `localization.spec.ts` (run 2) | Pass |

## 5. Failures and Findings

### 5.1 Intermittent failure at the automated sign-in step (pre-existing)

- **Observation.** Across the runs, 5 test executions stopped at the same step: the E2E helper
  `signInAsE2EOwner` submits the seeded credentials on `/sign-in` and waits up to 30 s for the
  return to `/oauth/authorize`, which did not occur. The failures occurred in different tests
  in different runs (`grant-revocation` and `localization` in E2E run 1, `legal-disclosure` in
  E2E run 2, *Grants page and revoke dialog* in accessibility runs 1 and 2). Each of these tests
  passed in another run.
- **Diagnosis.** The page snapshot at failure shows the sign-in form, with credentials filled
  in, and no error. In the recorded network trace of one failure, the consent page first issued
  `GET /api/v1/contexts` and `GET /api/v1/vault` (both 401, as the page briefly renders before
  redirecting an unauthenticated user), then `POST /api/v1/auth/login` returned 200, but the
  client did not navigate to the `returnTo` destination.
- **Relation to the refinements.** None of the refined components renders on `/sign-in`, and
  no authentication or redirect code was changed. The failure occurs before any refined surface
  is reached. The baseline evaluation reported the same behaviour
  ([`../../tech-evaluation/baseline-report.md`](../../tech-evaluation/baseline-report.md)):
  two scenarios were recorded from their second execution because the first stopped at the
  automated sign-in step.
- **Treatment.** Recorded as a pre-existing intermittent failure. It was not corrected here,
  because doing so would change authentication redirect behaviour outside the scope of A1–A4.

### 5.2 Axe violations on the consent screen with a Context selected (pre-existing state, newly scanned)

The new scan `oauth-consent-context-selected` covers a state that the baseline suite did not
scan: the consent screen after a Context has been selected. It reported two serious rule
violations. A diagnostic run examined both. It scanned the same state after the *Approve &
continue* button reached full opacity, then removed the A4 *Not shared* region from the page and
scanned again. The diagnostic script is not retained; its output is
[`evidence/consent-axe-diagnostic.json`](evidence/consent-axe-diagnostic.json).

| Rule | Node | Diagnosis | Caused by A4? |
| --- | --- | --- | --- |
| `color-contrast` (serious) | *Approve & continue* button | Measured 4.48:1 (`#0b0b0e` on `#0581b2`). The theme tokens for this button give 7.62:1 (`#09090b` on `#00abed`). The measured background is a blend: the button is enabled on selection and animates from its disabled `opacity: 0.5` state, and the scan ran during that transition. At full opacity, the diagnostic scan reported no `color-contrast` violation. This is the same transitional mechanism documented for F1 ([`../../tech-evaluation/f1/f1-remediation-report.md`](../../tech-evaluation/f1/f1-remediation-report.md)). | No. The button and its styles are unchanged, and the button becomes enabled on selection regardless of the new region. |
| `scrollable-region-focusable` (serious) | `<pre>` of the payload preview (*What PrymeCab will receive*) | The preview's JSON overflows horizontally at the consent card's width (`scrollWidth` 484 px, `clientWidth` 460 px), and the scroll container cannot receive keyboard focus, so a keyboard user cannot scroll to the end of a long value such as the avatar URL. The violation persisted with the *Not shared* region removed. | No. The shared `PayloadPreview` component is unchanged, and the violation is present without the A4 region. |

**Treatment.** Both violations are recorded as pre-existing in the selected-Context state. The
new scan was kept, so the accessibility suite reports them. Neither was corrected in this
refinement:

- the `PayloadPreview` component is shared with the Context form and the Developer Docs
  (Cohort B), and a change to it is outside the scope of A1–A4;
- the button transition belongs to the shared button primitive.

Both are candidates for a separate remediation, handled in the same way as F1.

## 6. Screenshots

Screenshots were not captured as part of this validation. If visual evidence is required for
the Final Report, following the convention of the earlier evaluation documents, the following
states should be captured from the E2E environment into `docs/external-evaluation/A/images/`:

1. Grants page with the focused *Skip to main content* link (A1);
2. Grants page with keyboard focus on Revoke and the row highlighted (A1);
3. Grants and Activity page headers, including *Manage current Grants* (A2);
4. Professional Context editor showing the *Language variants* section (A3);
5. Consent screen with a Social Context selected, showing the preview and *Not shared with
   PrymeCab* (A4).

## 7. Conclusion of the Technical Validation

On the evidence above:

- all four refinements are present in the built application and behave as specified in the
  unit, component and browser tests written for them;
- keyboard operation of revocation, including the confirmation dialog, works end to end, and
  the key presses needed to reach Revoke from the top of the Grants page fell from 11 Tab
  presses to 1 Tab, 1 Enter and 2 Tab presses when the skip link is used;
- the refined surfaces introduced no critical or serious axe violation in the scanned states;
  the two violations reported on the consent screen with a Context selected concern unchanged
  elements and persist without the A4 region;
- the privacy, authorization, revocation, audit and localization suites passed, with the same
  counts as the baseline for the backend and simulator suites;
- the only other failures observed were the pre-existing intermittent sign-in step failure,
  which never reached a refined surface, and whose affected tests all passed on re-run.

The validation is bounded by the executed automated checks, Chromium at a desktop viewport and
the platform's single dark theme. It shows that the refinements were implemented and technically
verified. It does not show that they reduce the usability friction observed in Cohort A, and it
does not establish conformance with any accessibility standard. The first question is assigned
to the focused human verification in
[`cohort-a-final-verification-plan.md`](cohort-a-final-verification-plan.md).
