# F1 Accessibility Remediation and Verification

This report supplements the baseline technical evaluation
([`../baseline-report.md`](../baseline-report.md)). The baseline report and its evidence are
unchanged and remain the record of the state first evaluated. This report documents the
corrective action taken for finding F1 and its re-evaluation.

## 1. Baseline Finding

| Aspect | Baseline observation (baseline report §5.9, §6.2) |
| --- | --- |
| Affected interface | Console → Grants → revoke-confirmation dialog |
| Accessibility rule | axe `color-contrast` (impact: serious), WCAG 2.0/2.1 A/AA rule sets |
| Affected elements | 4 nodes, 14 px text |
| Observed contrast | 3.66:1, 3.55:1 and 2.76:1 (foreground `#696969` / `#6b6b6b` on `#070709`, `#0c0c0e`, `#421d1f`); 4.5:1 required (WCAG 2.1 SC 1.4.3) |
| Reproducibility | Reported on 3 of 3 attempts |
| Result | Test *Grants page and revoke dialog pass the a11y gate*: **FAIL**; 23 of 24 axe scans clean; Q11 not met for this state |

Baseline evidence: [`../evidence/accessibility-results.txt`](../evidence/accessibility-results.txt),
[`../evidence/accessibility-axe-scans.json`](../evidence/accessibility-axe-scans.json).

## 2. Reason for Remediation

The revoke-confirmation dialog is the point at which a user confirms withdrawing a third
party's access to one of their identity Contexts. Its text names the application and Context
whose access will be withdrawn, and its buttons commit or cancel that decision. Text rendered
below the required contrast can be harder to read for users with low vision or in poor viewing
conditions, at the moment the user acts on a privacy control. The baseline also showed that
revocation itself works correctly (§5.5), so the defect concerns legibility, not behaviour.
It was the only product-facing technical finding and caused the only failing accessibility
check.

## 3. Correction

**Cause.** Before making any change, the dialog was inspected in the browser under the same
E2E harness and seeded data as the baseline:

- *Colours.* Once the dialog is fully open, none of its text has insufficient contrast. The
  platform uses a single dark theme (a fixed `dark` class on the root layout; no other theme
  can be selected), and the dialog's foreground and button text is near-white. The colours in
  the baseline output were therefore blended values, not theme colours.
- *Animation.* The shared dialog primitive (`src/components/ui/dialog.tsx`) animates the
  dialog panel from opacity 0 to 1 over 200 ms, with a zoom from 95% to 100%. While the panel
  is partly transparent, its text is actually rendered at reduced contrast against the
  darkened page behind it.
- *Reproduction.* The opening animation was paused at fixed offsets and scanned at each one.
  At about 50 ms (panel opacity 0.41), axe reported the baseline pattern: one serious
  `color-contrast` violation on 4 nodes, including `#6b6b6b` on `#070709` / `#0c0c0e` and
  2.79:1 on `#441e20`. The baseline recorded 2.76:1 on `#421d1f`, which is consistent with a
  neighbouring point in the same transition.
- *Affected nodes.* The four nodes are the two emphasised names in the dialog description
  (application and Context), the *Cancel* button and the *Revoke access* button.
- *When it occurs.* Violations occurred from 25 ms to 75 ms after opening and disappeared
  from 100 ms onwards. The baseline scans had evaluated the dialog during this transition.

**Change.** A single class, `data-[state=open]:fade-in-100`, was added to the revoke dialog's
`DialogContent` in
[`revoke-grant-dialog.tsx`](../../../apps/securiself-platform/src/features/grants/components/revoke-grant-dialog.tsx).
It sets the panel's opening opacity to 100%, so the dialog's text is at full contrast from the
first rendered frame.

Everything else about the dialog is unchanged:

- the zoom-in motion, the overlay fade and the closing animation;
- all colours, layout and text;
- the dialog's behaviour.

**Scope.** The correction is local to the revoke dialog. No colour token was changed, because
the tokens were not the cause. The shared dialog primitive was also left unchanged, although
the fade-in originates there: other dialogs that use it (rotate secret, delete Context, secret
reveal) were outside F1 and were neither modified nor evaluated. No backend, OAuth, revocation,
privacy or Context-disclosure code was changed.

## 4. Verification Method

All checks ran with the project's existing Playwright E2E harness and seeded data: Chromium,
Playwright 1.61.1, `@axe-core/playwright` / axe-core 4.12.1, and the same WCAG 2.0/2.1 A/AA
tags as the baseline.

**Automated accessibility verification.**

1. *Existing accessibility suite* (`pnpm test:a11y`). This is the same suite and gate that
   failed at baseline: it fails on any critical or serious violation and covers 24 route/state
   scans, including the open revoke dialog.
2. *Repetition of the dialog test.* The revoke-dialog test was run three more times
   (`--repeat-each 3`), matching the baseline's three attempts.
3. *Controlled transition sweep.* The baseline itself cautions that one passing run is not
   proof of resolution, because the result depends on scan timing. The opening animation was
   therefore paused at nine fixed offsets (0–200 ms in 25 ms steps) and axe was run at each
   one:
   - on the pre-remediation code and on the remediated code, as full-page scans;
   - on the remediated code, a second scan scoped to the dialog, to record the measured
     contrast of the previously failing nodes.

   The diagnostic script is not retained in the repository; its output is.

**Functional regression verification.**

- *Confirmation (browser).* The existing `grant-revocation.spec.ts` scenario was run. It
  checks the whole confirmation path:
  - it opens the dialog from the Grants revoke control and checks that the explanatory text is
    visible;
  - it confirms, then checks that the dialog closes, the continuation message appears and the
    grant shows *Revoked*;
  - it checks that Activity shows *Access revoked*, and that PrymeCab loses access (the API
    returns 401).
- *Cancellation (browser).* In the remediated sweep run, *Cancel* was clicked in the browser.
  The check was that the dialog closes, the grant remains *Active* and the revoke control
  remains available.
- *Keyboard.* The accessibility test opens the dialog with the keyboard (`Enter`) and closes
  it with `Escape`.
- *Component tests.* The existing Grants unit/component tests were run (18 tests). They
  include confirm, cancel (no revoke call) and failure handling in the dialog.

**Additional checks.** Lint and type-check of `securiself-platform`.

**Success criteria.** F1 is resolved if all of the following hold:

- axe reports no `color-contrast` violation on the revoke dialog in the accessibility suite,
  or at any sampled point of the opening transition, including the offsets that reproduced F1
  before remediation;
- the revoke-dialog accessibility test passes;
- the confirm and cancel flows behave as before;
- no existing check regresses.

## 5. Verification Results

**Accessibility suite (baseline → post-remediation).**

| Check | Baseline | Post-remediation |
| --- | ---: | ---: |
| `color-contrast` violations on the revoke dialog | 1 serious (4 nodes) | 0 |
| Lowest contrast among the affected nodes | 2.76:1 | 6.47:1 |
| *Grants page and revoke dialog* a11y test | FAIL (3 of 3 attempts) | PASS (4 of 4 runs) |
| Axe scans with 0 critical / 0 serious | 23 of 24 | 24 of 24 |
| Revoke interaction | PASS (§5.5) | PASS |

Post-remediation contrast of the formerly failing nodes was measured by axe (`passes` data):

| Node | Contrast |
| --- | ---: |
| Emphasised application name | 19.06:1 (`#fafafa` on `#09090b`) |
| Emphasised Context name | 19.06:1 (`#fafafa` on `#09090b`) |
| *Cancel* button | 17.62:1 (`#fafafa` on `#141416`) |
| *Revoke access* button | 6.47:1 (`#ffffff` on `#9d4042`) |

The dialog scan returned 2 *incomplete* rule results, the same count as at baseline.
Incomplete results mark checks axe could not decide; they are not violations. In the
post-remediation dialog scan, the `color-contrast` incomplete nodes were the dialog title and
description, which axe judged partially obscured and so could not evaluate. They were not part
of F1, and, as at baseline, they were not manually reviewed.

**Controlled transition sweep (pre-remediation → post-remediation).**

| Offset after opening | Pre: panel opacity | Pre: violations (lowest ratio) | Post: panel opacity | Post: violations |
| ---: | ---: | --- | ---: | ---: |
| 0 ms | 0.00 | 0 (not yet visible) | 1.00 | 0 |
| 25 ms | 0.14 | 4 nodes (1.31:1) | 1.00 | 0 |
| 50 ms | 0.41 | 4 nodes (2.79:1) | 1.00 | 0 |
| 75 ms | 0.65 | 1 node (4.45:1) | 1.00 | 0 |
| 100–200 ms | 0.80–1.00 | 0 | 1.00 | 0 |

After remediation, the panel stayed fully opaque at every offset. The zoom motion was still
present (the panel scaled from 0.95 to 1.00), and the four nodes kept the ratios listed above
throughout the transition.

**Functional regression.**

| Check | Result |
| --- | --- |
| `grant-revocation.spec.ts` (open → confirm → revoked → Activity → access lost) | PASS |
| Browser *Cancel* (dialog closes; grant remains *Active*; revoke control present) | PASS |
| Keyboard open (`Enter`) and close (`Escape`) in the accessibility test | PASS |
| Grants unit/component tests | 18 of 18 PASS |
| `securiself-platform` lint / type-check | PASS / PASS |

Evidence:

- [`evidence/post-remediation-test-results.txt`](evidence/post-remediation-test-results.txt)
- [`evidence/post-remediation-axe-scans.json`](evidence/post-remediation-axe-scans.json)
- [`evidence/revoke-dialog-transition-sweep.json`](evidence/revoke-dialog-transition-sweep.json)

## 6. Remediation Conclusion

F1 was resolved. On the evidence obtained:

- The previously observed `color-contrast` violation on the Grants revoke-confirmation dialog
  was no longer reproduced. This held in the accessibility suite, in repeated runs, and at
  every sampled point of the dialog's opening transition, including the points at which it
  reproduced before remediation.
- The four affected nodes now measure between 6.47:1 and 19.06:1.
- The accessibility check that failed at baseline now passes, and all 24 scans in the suite
  report no critical or serious violations.
- Revocation confirmation and cancellation continue to operate correctly, and no existing
  Grants test, lint or type check regressed.

These conclusions are bounded by the following:

- the automated axe rules and targeted checks listed above;
- Chromium at a desktop viewport;
- the platform's single dark theme;
- the sampled animation offsets.

The pending (*Revoking…*) state, in which the dialog's buttons are disabled, was not
separately scanned. Dialogs other than the revoke dialog were not evaluated.

This remediation closes one identified accessibility finding. It is not an accessibility audit
and does not establish that SecuriSelf conforms to WCAG.
