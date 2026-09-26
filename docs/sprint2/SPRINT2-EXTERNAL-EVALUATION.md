# Sprint 2 — External User Evaluation

## 1. Purpose

Sprint 2 introduced a user-facing **Grants** interface through which an identity owner can inspect a third-party application's permission to a SecuriSelf Context and revoke that permission. Automated component, API and end-to-end tests can verify that the programmed flow behaves correctly, but they cannot determine whether a person can understand the permission, locate the correct controls, interpret the consequence of revocation, or complete the cross-application verification journey without guidance.

The external evaluation therefore focused on **usability, comprehension and navigation continuity**. It asked whether participants could independently identify the correct PrymeCab Grant, understand what would happen before confirming revocation, verify the resulting Activity record, and correctly interpret PrymeCab's loss of access.

This evaluation was not intended to establish population-level usability or formal accessibility conformance. It was a bounded task-based evaluation of the implemented Sprint 2 interaction.

---

## 2. Evaluation setup

Ten participants were evaluated using anonymous identifiers **P01–P10** between 2 and 4 August 2026. Six sessions were recorded as local participant sessions and four as peer-review sessions. Eight participants had no prior familiarity with SecuriSelf and two had prior familiarity. General web-application familiarity was recorded as high for four participants, moderate for four and low for two.

Only synthetic demonstration identity data was used. Participants were instructed not to enter personal information, inspect source code or developer tools, or copy credentials or tokens. They were asked to work independently and request help only when unable to continue.

Before each session, the evaluator confirmed that SecuriSelf Platform, API and PrymeCab were available; an active PrymeCab Grant existed; PrymeCab could access the profile before revocation; the database was prepared; and no previous participant state remained visible.

### Source completeness note

Observation sheets are available for all ten participants. Participant-instruction records are available for P01–P09. The P10 instruction file was not included in the supplied set. The common task wording, response scale and three post-task statements below are therefore taken from the identical P01–P09 instruction records. P10's responses and observed behaviour are taken directly from the P10 observation sheet, which records the same three statements and the same observational measures.

---

## 3. Participant task

Each participant received the same task:

> You are using a demonstration SecuriSelf account. PrymeCab currently has access to one identity Context. Find PrymeCab's active permission, identify which Context it can access, revoke that permission, locate the resulting Activity record, and then check PrymeCab to decide whether it still has access. Do not enter personal information.

The task deliberately crossed three user-visible surfaces:

1. **Grants** — identify the active PrymeCab permission and revoke it.
2. **Activity** — locate the resulting `ACCESS_REVOKED` record.
3. **PrymeCab** — retry access and decide whether the previously authorised profile remained available.

This sequence was chosen because Sprint 2 was not only a button-level interaction. The user needed to understand the permission before acting and then verify both the recorded revocation and its practical consequence for the third-party application.

---

## 4. Measures and post-task questions

### 4.1 Observational measures

The evaluator recorded the following for every participant:

- whether the correct Grant was selected;
- whether the core task was completed without procedural assistance;
- whether procedural assistance was required;
- whether `ACCESS_REVOKED` was located;
- whether PrymeCab's rejected-access state was interpreted correctly;
- whether a critical misunderstanding occurred;
- significant hesitation, navigation difficulty, label/state misunderstanding and technical incidents.

A critical misunderstanding included revoking the wrong Grant or believing PrymeCab still retained access after revocation.

### 4.2 Post-task questions

Participants responded using the scale:

**Disagree · Partially disagree · Neither agree nor disagree · Partially agree · Agree**

The three statements were:

1. **Grant clarity:** “The Grants page made it clear which application had access, which identity Context was authorised, and whether the permission was active or revoked.”
2. **Revocation comprehension:** “Before I confirmed revocation, I understood that PrymeCab would lose access associated with the selected permission.”
3. **Journey independence:** “I could complete the revocation journey and verify both the Activity record and PrymeCab's loss of access without assistance.”

Participants could also leave an optional open comment.

---

## 5. Participant-level results

| Participant | Correct Grant | Core task | Activity record | PrymeCab interpretation | Q1 | Q2 | Q3 | Principal observation |
|---|---|---|---|---|---|---|---|---|
| P01 | Yes | Unassisted | Located | Correct | Agree | Agree | Agree | Re-authorised Grant retained the original displayed authorisation date. |
| P02 | Yes | Unassisted | Located | Correct | Agree | Agree | Partially agree | Context naming differed between Grants and Activity. |
| P03 | Yes | Unassisted | Located | Correct | Partially agree | Agree | Partially agree | Status and date competed visually when scanning the Grant. |
| P04 | Yes | Unassisted | Located | Correct | Agree | Agree | Agree | Suggested a direct continuation from the revoked Grant to Activity. |
| P05 | Yes | Unassisted | Located | Correct | Agree | Partially agree | Partially agree | Wanted the exact application and Context repeated more explicitly at confirmation. |
| P06 | Yes | Unassisted | Located | Correct | Partially agree | Agree | Partially agree | Opened Activity first and initially expected permission management there. |
| P07 | Yes | Unassisted | Located | Correct | Agree | Agree | Agree | Re-authorised Grant retained the older displayed date. |
| P08 | Yes | Unassisted | Located | Correct | Agree | Agree | Partially agree | PrymeCab's rejected-access message sounded technical and initially ambiguous. |
| P09 | Yes | Procedural assistance | Located | Correct | Partially agree | Agree | Partially agree | Could not find the Activity record without a navigation hint. |
| P10 | Yes | Procedural assistance | Located | Correct | Agree | Partially agree | Partially agree | Could not determine how to return to PrymeCab and retry access without a navigation hint. |

No session was excluded from analysis.

---

## 6. Aggregated results

### 6.1 Task outcomes

| Measure | Result |
|---|---:|
| Correct Grant selected | **10/10 (100%)** |
| Core task completed without procedural assistance | **8/10 (80%)** |
| Core task completed with procedural assistance | **2/10 (20%)** |
| `ACCESS_REVOKED` located | **10/10 (100%)** |
| PrymeCab access loss interpreted correctly | **10/10 (100%)** |
| Wrong Grant revoked | **0/10 (0%)** |
| Believed PrymeCab retained access | **0/10 (0%)** |
| Technical incidents | **0/10 (0%)** |

The two assisted sessions were both navigation-related. P09 required a hint to locate Activity after revocation, and P10 required a hint to return to PrymeCab and repeat the profile-access check. Neither participant required help selecting the Grant, understanding the revocation itself, locating the final evidence after the hint, or interpreting the access-loss result.

### 6.2 Likert responses

| Statement | Agree | Partially agree | Other responses |
|---|---:|---:|---:|
| Q1 — Grant clarity | **7/10 (70%)** | **3/10 (30%)** | 0/10 |
| Q2 — Revocation comprehension | **8/10 (80%)** | **2/10 (20%)** | 0/10 |
| Q3 — Journey independence | **3/10 (30%)** | **7/10 (70%)** | 0/10 |

The observational and self-reported results answer different questions. Objectively, eight participants completed the entire task without procedural assistance. However, only three selected “Agree” for the broader independence statement. Several unassisted participants selected “Partially agree” because they experienced hesitation, inconsistent labelling, generic confirmation wording or an unclear final message. The Likert responses therefore indicate friction that did not necessarily cause task failure.

---

## 7. Findings

Findings were prioritised using two factors: **frequency** and **impact on the privacy-control journey**. Repetition increased confidence that a problem was systematic, but a lower-frequency finding could still justify action when it affected interpretation of access or the ability to verify revocation.

### F01 — Cross-surface navigation and next-step discoverability

**Evidence:** P06, P09 and P10 experienced navigation friction. P09 and P10 required procedural assistance. P04 independently suggested a direct route from the revoked Grant to Activity.

**Impact:** High. The revocation action itself was understood, but the complete journey depended on moving from Grants to Activity and then to PrymeCab. Two participants could not complete that sequence independently.

**Decision:** Implement a clearer post-revocation continuation without redesigning the whole console or automatically redirecting the user.

### F02 — Authorisation-date semantics after re-authorisation

**Evidence:** P01 and P07 independently observed that a re-authorised permission still displayed the older date.

**Impact:** Medium. The issue did not affect revocation correctness, but the displayed timestamp could be interpreted as the latest authorisation when it actually represented the original Grant creation.

**Decision:** Investigate the timestamp source and use wording that accurately represents its meaning rather than presenting it as the latest authorisation.

### F03 — Inconsistent Context naming between Grants and Activity

**Evidence:** P02 paused because Grants displayed one Context name while Activity displayed another, and had to match the event using the application name and timestamp.

**Impact:** Medium. The participant recovered independently, but inconsistent naming weakened confidence that the audit record corresponded to the same permission that had just been revoked.

**Decision:** Use the same primary Context display name across Grants and Activity, with any internal name treated only as secondary metadata.

### F04 — PrymeCab rejection message was technically correct but unclear

**Evidence:** P08 initially questioned whether the rejected-access state was caused by revocation or by a temporary technical failure.

**Impact:** Medium. The participant ultimately interpreted the state correctly, but the final application message did not explain the privacy-control consequence in plain language.

**Decision:** Present the known rejected-access condition as loss of previously authorised access and explain that a new authorisation is required.

### F05 — Grant status and timestamp visual hierarchy

**Evidence:** P03 initially compared the date and status and suggested stronger visual separation.

**Impact:** Low. The participant recovered without help, selected the correct Grant and completed the task correctly.

**Decision:** Defer. The observation is valid but did not justify widening the Sprint 2 change set.

### F06 — Confirmation specificity

**Evidence:** P05 re-read the confirmation and suggested repeating the exact application and Context more explicitly near the final action.

**Impact:** Low. No participant revoked the wrong Grant, and P05 still verified the correct target before confirming.

**Decision:** Defer unless later evidence shows target ambiguity when multiple similar Grants are present.

---

## 8. Changes derived from the evaluation

The subsequent implementation was intentionally limited to findings that either affected completion continuity or could materially improve interpretation of the revocation state.

| Finding | Decision | Resulting implementation response |
|---|---|---|
| F01 — Navigation continuity | Implement | After successful revocation, Grants now keeps the revoked permission visible and presents an explicit **View Activity** continuation together with guidance to verify the result in PrymeCab. No automatic redirect is used. |
| F02 — Timestamp semantics | Clarify semantics | The persisted creation timestamp is presented as **First authorised**, avoiding the unsupported implication that it represents the latest re-authorisation time. |
| F03 — Context naming | Implement | Grants and Activity use the Context `displayName` as the primary user-facing label; a distinct internal name is secondary only where needed. |
| F04 — PrymeCab message | Implement | PrymeCab maps rejected access to a plain-language access-lost state indicating that previous access is no longer available and re-authorisation is required. |
| F05 — Visual hierarchy | Defer | No redesign was introduced because the issue caused hesitation but no incorrect action or assistance requirement. |
| F06 — Confirmation specificity | Defer | No additional confirmation redesign was introduced because no wrong-Grant event occurred in the ten sessions. |

These decisions reflect the pattern in the participant evidence: the core revocation concept was understood by all participants, while the strongest weakness was continuity across the three surfaces used to verify the result. The response therefore targeted navigation continuity and semantic clarity rather than replacing the Grants interaction as a whole.

---

## 9. Interpretation

The evaluation provides evidence that the central permission-control concept was understandable in the tested scenario. All ten participants selected the intended PrymeCab Grant, all ten located the recorded revocation, and all ten ultimately concluded correctly that PrymeCab no longer had access. No participant revoked the wrong Grant or concluded that access continued after revocation.

The principal weakness was not the revocation operation itself but the **continuity of the verification journey**. Two participants required navigation assistance, while several others reported smaller comprehension or presentation issues. This distinction is important: a technically correct revocation flow can still impose unnecessary cognitive or navigational effort when the user must confirm what happened across separate surfaces.

The results therefore justified a restrained revision. The implemented changes addressed the highest-impact navigation issue and the medium-impact semantic inconsistencies while preserving the underlying permission model and revocation behaviour.

---

## 10. Evaluation boundaries

This evaluation used ten participants in one bounded demonstration task and should not be treated as evidence of general-population usability. The participant group had mixed web-application familiarity, but it was not a statistically representative sample. The task also used a prepared scenario with one active PrymeCab permission and synthetic data, so the results do not establish performance under larger or more complex Grant sets.

The evaluation examined human comprehension and task interaction; it does not establish formal WCAG conformance. Automated accessibility and technical validation remain separate evidence layers.

Finally, the evaluation was conducted on the interface state that existed before the resulting changes were applied. The participant evidence therefore supports the **need and rationale for those changes**; it does not by itself demonstrate that the revised interface improved population-level usability. The revised behaviour is validated separately through the Sprint 2 technical validation record.

---

## 11. Conclusion

The external evaluation showed that the implemented Grants concept and revocation consequence were understood across all ten tested sessions: the correct Grant was selected in 10/10 cases, the Activity record was found in 10/10 cases, and PrymeCab's loss of access was ultimately interpreted correctly in 10/10 cases. Eight participants completed the complete journey without procedural assistance, while two needed navigation guidance.

The evidence identified a clear distinction between **functional understanding of revocation** and **usability of the cross-surface verification journey**. Navigation continuity was the highest-impact issue, followed by timestamp meaning, Context-label consistency and clarity of PrymeCab's rejected-access message. These findings led to bounded interface changes rather than a general redesign. Lower-impact observations concerning visual hierarchy and confirmation wording were retained as findings but deferred because they did not produce incorrect actions or task failure in the evaluated sessions.

---

## 12. Source records

This document was reconstructed from the following project records:

- `P01-OBSERVATION-SHEET.md` through `P10-OBSERVATION-SHEET.md`
- `P01-PARTICIPANT-INSTRUCTIONS.md` through `P09-PARTICIPANT-INSTRUCTIONS.md`
- `SPRINT2-CANDIDATE-B-CHANGE-DECISIONS.md` (used only to recover the documented feedback-to-change decisions)
- `SPRINT2-IMPLEMENTATION.md` (used to confirm which evaluation-derived changes are present in the implemented Grants flow)

The missing P10 participant-instruction file was not treated as a source for participant responses. P10 outcome data, assistance record, Likert responses and comment come from `P10-OBSERVATION-SHEET.md`.
