# Sprint 1 validation

This document records a fresh automated validation of the Playwright layer introduced in Sprint 1. It answers whether that layer could exercise the integrated SecuriSelf browser journeys that previously depended primarily on manual checks.

What Sprint 1 implemented is described in [`SPRINT1-IMPLEMENTATION.md`](./SPRINT1-IMPLEMENTATION.md). This file reports only observed test results.

The repository is now beyond Sprint 1. Later Grants console UI and multilingual Context behaviour were not treated as Sprint 1 evidence. Revocation was reproduced with the Sprint 1 mechanism: API-assisted revoke, then browser verification.

---

## 1. Validation purpose

The question was whether Playwright could automatically drive the three-application disclosure path — PrymeCab → Platform consent → callback → filtered profile → Activity — and whether the same stack could run an accessibility regression gate on those surfaces.

Backend API tests already existed. This validation concerns the browser layer added in Sprint 1.

---

## 2. Validation coverage

The following behaviours were exercised against the isolated E2E database, with Chromium driving Platform (`localhost:3000`) and PrymeCab (`localhost:3001`) while the API served the test schema.

**Social Context disclosure.** After the identity owner selects the Social Context and approves, PrymeCab receives only the Social payload. Vault email, legal identity, and professional fields must not appear in the consent preview, the PrymeCab UI, or PrymeCab’s profile response. Activity must show a profile read.

**Legal Context disclosure.** After Legal is selected and approved, PrymeCab shows legal names and document id. Vault email and Social/Professional fields must not appear.

**Consent denial.** After a Context is selected and Deny is used, no authorization code is issued, PrymeCab still has no profile, the Platform shows that access was denied, and audit does not record access granted or a profile read.

**Privacy boundary.** The Vault still holds the owner email, while Social and Legal third-party payloads never include it. The Legal half runs in a fresh browser context so the Social grant is not reused.

**Revocation and loss of access.** After a successful Social disclosure, the active grant is revoked through the Grants API using the Platform session already established in the browser. PrymeCab’s profile request then fails, the landing login control returns, and Activity shows that access was revoked. The current Grants console page was not used.

**Activity observation.** After disclosure, Activity shows a profile read for PrymeCab. After revoke, it shows access revoked.

**Automated accessibility scanning.** Public landings, sign-in/sign-up, authenticated console routes that existed in Sprint 1, the consent screen, and post-approval PrymeCab were scanned with axe-core (WCAG 2 / 2.1 A and AA tags). The gate fails on critical and serious impact.

**Targeted keyboard and semantic checks.** Sign-in and Login with SecuriSelf can receive keyboard focus. On consent, a Context radio can be focused, selected with Enter, and reports `aria-checked="true"`. Deny and Approve can receive keyboard focus.

---

## 3. Automated test scenarios

### Social disclosure

**Purpose.** Check that a real browser consent for Social yields a filtered PrymeCab profile and an Activity record, with no vault or other-context leakage.

**Automated actions.** Playwright opens PrymeCab, starts Login with SecuriSelf, signs in if asked, reaches consent, confirms PrymeCab has no profile yet, selects Social, checks the consent preview, approves, asserts the PrymeCab Social profile and UI, then opens Activity.

**Expected behaviour.** PrymeCab cannot retrieve a contextual profile before consent. After approval it shows the Social identity (display name, username, pronouns) and not vault email, legal names, document id, or professional fields. Activity records a profile read for PrymeCab.

**Observed result.** The scenario completed successfully. Before approval, PrymeCab’s profile request was unauthorised (HTTP 401). After approval, PrymeCab rendered the Social profile for AngelaTech. Activity showed a profile read.

**Evidence.** [`social-consent-selection.png`](./images/social-consent-selection.png), [`social-prymecab-profile.png`](./images/social-prymecab-profile.png).

### Legal disclosure

**Purpose.** Check that Legal disclosure returns legal identity fields and still withholds vault email and Social/Professional values.

**Automated actions.** Playwright reaches consent, selects Legal, confirms legal names and document id on the consent screen without the vault email, approves, and asserts the PrymeCab Legal profile, UI, and Activity profile-read row.

**Expected behaviour.** PrymeCab shows legal first name, last name, and document id, with a Legal context badge. Email, Social username, and professional job title/company are absent.

**Observed result.** The scenario completed successfully. PrymeCab displayed Angela Paola / Lozano Ochoa and document id `PER-E2E-74829104` under a LEGAL badge.

**Evidence.** [`legal-prymecab-profile.png`](./images/legal-prymecab-profile.png).

### Consent denial

**Purpose.** Check that Deny does not create a usable third-party session or a disclosure audit trail.

**Automated actions.** Playwright reaches consent, selects Social, clicks Deny, then checks the URL, PrymeCab profile request, on-screen denied state, and audit actions.

**Expected behaviour.** The browser remains on the Platform with no `code` query parameter. PrymeCab still cannot read a profile (HTTP 401). The UI states that access was denied and that no data was shared. Audit does not contain ACCESS_GRANTED or PROFILE_READ.

**Observed result.** The scenario completed successfully. The Platform showed “Access denied” / “No data was shared.” PrymeCab remained unauthorised.

**Evidence.** [`consent-denied-state.png`](./images/consent-denied-state.png).

### Privacy boundary

**Purpose.** Check that the Vault still stores the root email while Social and Legal third-party payloads never include it.

**Automated actions.** Playwright confirms the Vault email over the authenticated API, completes Social disclosure and asserts the Social object, then opens a fresh browser context, completes Legal disclosure, and asserts the Legal object.

**Expected behaviour.** Vault email matches the seeded owner. Neither Social nor Legal profile objects contain that email, or each other’s forbidden fields.

**Observed result.** The scenario completed successfully. Vault retained `e2e.owner@securiself.test`. Social and Legal PrymeCab payloads did not include it.

**Evidence.** The Social and Legal PrymeCab figures above; the assertion itself is on profile JSON rather than a third screenshot.

### Revocation and loss of access

**Purpose.** Check that revoking an active grant invalidates PrymeCab access and is visible in Activity, using the Sprint 1 API-assisted path.

**Automated actions.** Playwright completed Social consent and confirmed that PrymeCab could read the profile. It then read the Platform session from `localStorage`, listed grants, and revoked the active Social grant with `POST /api/v1/grants/:id/revoke`. It opened Activity, returned to PrymeCab, and requested the profile again.

The current Grants console UI was not opened.

**Expected behaviour.** After revoke, Activity shows “Access revoked”. PrymeCab no longer presents the Social profile; Login with SecuriSelf is available again. The profile request is unauthorised (HTTP 401).

**Observed result.** The scenario completed successfully. Activity listed “Access revoked” for PrymeCab. PrymeCab showed that previous access was no longer available and offered Login with SecuriSelf. The subsequent profile request returned HTTP 401.

The current PrymeCab copy for lost access is later product chrome. The Sprint 1 claim is the effect: the authorised profile was gone and login returned.

**Evidence.** [`activity-access-revoked.png`](./images/activity-access-revoked.png), [`revoked-access-prymecab.png`](./images/revoked-access-prymecab.png).

---

## 4. Accessibility validation

This automated validation does not establish WCAG conformance. It does not replace assistive-technology user testing or a complete accessibility audit.

### Automated axe checks

**Surfaces scanned**

- Platform landing, sign-in, sign-up
- PrymeCab landing
- Authenticated console: `/console`, `/console/vault`, `/console/contexts`, `/console/contexts/new`, `/console/clients`, `/console/activity`
- Consent (`/oauth/authorize`)
- PrymeCab profile after Social approval

The current accessibility spec also visits `/console/grants` in the same console loop. That route did not exist in Sprint 1. It was scanned because it is in the current file; it is not claimed as Sprint 1 behaviour. The later Grants-page and revoke-dialog test was not executed.

**Rule scope.** axe-core tags `wcag2a`, `wcag2aa`, `wcag21a`, and `wcag21aa`.

**Failure gate.** Critical and serious impact findings fail the test. Moderate and minor findings are advisory.

**Fresh findings**

| Surface | Critical | Serious | Moderate | Minor | Incomplete | Gate |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Platform landing, sign-in, sign-up | 0 | 0 | 0 | 0 | 0 | pass |
| PrymeCab landing | 0 | 0 | 0 | 0 | 1 | pass |
| Console routes listed above | 0 | 0 | 0 | 0 | 0 | pass |
| `/console/grants` (later route, incidental) | 0 | 0 | 0 | 0 | 0 | pass |
| Consent | 0 | 0 | 0 | 0 | 0 | pass |
| PrymeCab profile | 0 | 0 | 0 | 0 | 1 | pass |

No blocking (critical/serious) violations were recorded. Incomplete counts on the two PrymeCab pages mean axe could not fully determine those checks; they are not recorded as violations.

### Targeted interaction checks

These steps exist because an axe scan does not operate the consent radios or prove that controls can receive keyboard focus.

| Check | Observed result |
| --- | --- |
| Sign in can be focused | Passed |
| Login with SecuriSelf can be focused | Passed |
| Social context radio focused, Enter selects it, `aria-checked="true"` | Passed |
| Deny can be focused | Passed |
| Approve & continue can be focused | Passed |

The helper asserts that the named control `toBeFocused()` after programmatic focus. It does not audit the visual focus ring.

---

## 5. Results summary

| Validation area | What was checked | Result | Evidence |
| --- | --- | --- | --- |
| Social disclosure | Consent preview, PrymeCab Social profile, no forbidden fields, Activity profile read | Passed | `social-consent-selection.png`, `social-prymecab-profile.png` |
| Legal disclosure | PrymeCab Legal profile; email and Social/Professional fields withheld | Passed | `legal-prymecab-profile.png` |
| Consent denial | No code, no PrymeCab profile, denied UI, no grant/read audit | Passed | `consent-denied-state.png` |
| Privacy boundary | Vault keeps email; Social and Legal payloads do not | Passed | Social and Legal profile figures |
| Revocation | API revoke; PrymeCab unauthorised; login returns; Activity access revoked | Passed | `revoked-access-prymecab.png`, `activity-access-revoked.png` |
| Activity | Profile read after disclosure; access revoked after revoke | Passed | `activity-access-revoked.png` |
| Axe scans | WCAG 2/2.1 A–AA tags; fail on critical/serious | Passed (0 blocking) | `accessibility-results.png` |
| Keyboard / semantics | Focus, radio Enter, `aria-checked`, Deny/Approve | Passed | `accessibility-results.png` |

**Sprint 1 Playwright E2E (committed journey specs)**

```
Running 4 tests using 1 worker
  ✓  consent denial — denies without issuing a usable code or PROFILE_READ (7.5s)
  ✓  LEGAL disclosure — authorizes LEGAL context and keeps root email private (8.8s)
  ✓  vault versus profile privacy — vault retains root email while third-party profiles never expose it (10.9s)
  ✓  SOCIAL disclosure — authorizes SOCIAL context end-to-end with zero forbidden leakage (8.4s)
  4 passed (42.4s)
```

Failed: 0. Skipped: 0.

Evidence: [`playwright-e2e-results.png`](./images/playwright-e2e-results.png).

**Sprint 1 revocation (API-assisted reproduction)**

One Social grant was revoked through the Grants API and verified in PrymeCab and Activity. The scenario passed (11.8s for that journey). The current Grants-UI revocation spec was not run.

**Sprint 1 accessibility automation**

```
Running 2 tests using 1 worker
  ✓  public pages have no critical or serious axe violations (4.6s)
  ✓  authenticated console and consent screens pass the a11y gate (10.3s)
  2 passed (21.1s)
```

Failed: 0. Skipped: 0. The Grants dialog test was excluded from this run.

Evidence: [`accessibility-results.png`](./images/accessibility-results.png).

These results show that the Sprint 1 journeys and the accessibility gate completed successfully on this execution. They do not show production readiness, WCAG conformance, or a complete security assessment.

---

## 6. Visual evidence

All figures are under [`docs/sprint1/images/`](./images/). Each was taken from this validation session.

**Filename:** `playwright-e2e-results.png`

**What it shows.** Playwright HTML report for the four Sprint 1 journey tests: 4 passed, 0 failed, 0 skipped, 42.4s.

**Claim.** The committed Social, Legal, denial, and privacy-boundary browser tests completed successfully.

**Related scenario.** Results summary (E2E).

**Filename:** `social-consent-selection.png`

**What it shows.** Consent card with E2E Social selected, payload preview limited to Social fields, Deny and Approve visible.

**Claim.** Before approval, the owner can see what PrymeCab would receive, and that payload is the Social context rather than the Vault.

**Related scenario.** Social disclosure.

**Filename:** `social-prymecab-profile.png`

**What it shows.** PrymeCab profile card after Social approval: AngelaTech, SOCIAL badge, username and pronouns. Vault email and legal identity are not shown.

**Claim.** After Social consent, PrymeCab renders the filtered Social profile.

**Related scenario.** Social disclosure.

The current card also shows later EN/ES controls. Those controls are not Sprint 1 behaviour and are not part of this claim.

**Filename:** `legal-prymecab-profile.png`

**What it shows.** PrymeCab profile after Legal approval: legal names, document id, LEGAL badge.

**Claim.** Legal disclosure returns legal identity fields and not the Social display name.

**Related scenario.** Legal disclosure.

**Filename:** `consent-denied-state.png`

**What it shows.** Platform “Access denied” state: PrymeCab was denied and no data was shared, with a path back to the console.

**Claim.** Deny leaves the owner on the Platform without completing disclosure.

**Related scenario.** Consent denial.

**Filename:** `activity-access-revoked.png`

**What it shows.** Activity log with Access granted, Profile read, and Access revoked for PrymeCab, newest first.

**Claim.** After API-assisted revoke, Activity records that access was revoked.

**Related scenario.** Revocation; Activity observation.

The current sidebar includes Grants. That destination is later than Sprint 1. The claim is the Access revoked row.

**Filename:** `revoked-access-prymecab.png`

**What it shows.** PrymeCab after revoke: previous access is no longer available; Login with SecuriSelf is the action. The Social profile is gone.

**Claim.** Revoking the grant removes PrymeCab’s authorised profile in the browser.

**Related scenario.** Revocation.

**Filename:** `accessibility-results.png`

**What it shows.** Playwright HTML report for the two Sprint 1 accessibility tests: 2 passed, 0 failed, 21.1s.

**Claim.** The public-page axe scan and the authenticated console/consent/keyboard suite completed without critical or serious violations.

**Related scenario.** Accessibility validation.

---

## 7. Conclusion

Yes. On this execution, the Sprint 1 Playwright layer reproduced the browser disclosure path it was introduced to test: Social and Legal approval, consent denial, vault-versus-profile isolation, API-assisted revocation with Activity and PrymeCab verification, plus the axe gate and targeted keyboard/semantic checks. All executed Sprint 1 E2E journey tests passed (4/4). The historical revocation reproduction passed. Both executed accessibility tests passed (2/2), with 0 critical and 0 serious axe findings.

Limitations that affect interpretation:

- Only Chromium was used.
- The current product includes later Grants navigation and PrymeCab language controls; those were visible in some screenshots but were not treated as Sprint 1 behaviour.
- `/console/grants` was scanned incidentally by the current accessibility spec and is not a Sprint 1 surface.
- Axe incomplete checks on two PrymeCab pages were not treated as passes or failures of those specific rules.
- Focus checks confirm that controls can be focused, not that a visible focus ring meets WCAG.
- Automated accessibility is not WCAG conformance and does not replace assistive-technology testing.
- An earlier combined journey run in this session hit two sign-in timeouts that did not reproduce; the recorded E2E counts are from the subsequent complete passing run.
