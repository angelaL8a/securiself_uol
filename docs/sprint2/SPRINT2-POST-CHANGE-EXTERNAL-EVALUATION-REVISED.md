# Sprint 2 — Post-Change External Evaluation

## 1. Purpose

This document records the focused external evaluation conducted after the Sprint 2 interface changes derived from the first participant round.

The purpose of this second evaluation was not to repeat the complete earlier study. It was to determine whether the specific usability and comprehension problems identified previously had been addressed in the revised Grants journey.

The follow-up evaluation focused on three changes:

1. clearer continuation after revocation from Grants to Activity and then to PrymeCab;
2. consistent Context naming between Grants and Activity;
3. a clearer PrymeCab access-loss message explaining that previous access is no longer available and that a new authorisation is required.

The evaluation therefore examined whether users could understand and complete the revised revoke-and-verify journey without encountering the same points of confusion observed in the earlier round.

---

## 2. Evaluation setup

A focused follow-up evaluation was conducted with three anonymous participants, identified as P01–P03.

The participants used the revised Sprint 2 implementation with synthetic demonstration data.

Each participant was asked to complete the following task:

> PrymeCab currently has access to one SecuriSelf Context. Find the active PrymeCab permission, revoke it, inspect the resulting Activity record, and then check PrymeCab to determine whether the previous access is still available.

Participants were asked to work independently and to report any part of the process that was unclear.

This follow-up was intentionally small and targeted. Its role was to verify the specific interface changes introduced after the earlier ten-participant evaluation rather than to provide population-level usability evidence.

---

## 3. Evaluation questions

After completing the task, participants answered three questions corresponding directly to the issues addressed by the revised implementation.

### Question 1 — Post-revocation continuation

> After revoking the PrymeCab permission, was it clear what you should do next to verify the result through Activity and PrymeCab?

This question evaluated whether the new post-revocation continuation removed the navigation uncertainty previously observed between Grants, Activity and PrymeCab.

### Question 2 — Context consistency

> When checking the revoked permission in Grants and the corresponding record in Activity, was it clear that both referred to the same Context?

This question evaluated whether using the same primary Context label across both surfaces removed the naming ambiguity identified in the earlier round.

### Question 3 — Access-loss comprehension

> When PrymeCab could no longer access the profile, was the message clear that the previous SecuriSelf permission was no longer available and that a new authorisation would be required?

This question evaluated whether the revised PrymeCab wording made the reason for access loss understandable rather than appearing to be a generic technical failure.

Participants could also provide an optional open comment about any remaining point of confusion.

---

## 4. Results

All three participants completed the revoke-and-verify journey and understood the three revised interaction areas.

### Aggregated results

| Measure | Result |
|---|---:|
| Post-revocation continuation understood | 3/3 |
| Context matched correctly across Grants and Activity | 3/3 |
| PrymeCab access-loss state interpreted correctly | 3/3 |
| Participants reporting a blocking usability difficulty | 0/3 |

No participant reported a recurring difficulty equivalent to the principal issues identified in the earlier evaluation.

---

## 5. Interpretation by change

### 5.1 Post-revocation continuation

The earlier evaluation showed that some users understood the revocation itself but were unsure how to continue from the changed Grant state to Activity and then back to PrymeCab.

In the revised interface, the revoked Grant remains visible, a direct **View Activity** action is presented, and concise guidance explains that PrymeCab should then be checked to confirm loss of access.

All three participants understood the next step after revocation.

For this focused evaluation, the previous navigation problem was therefore not reproduced.

### 5.2 Context naming

The first evaluation identified that different Context labels in Grants and Activity could make users question whether the audit record referred to the same permission they had just revoked.

The revised implementation uses the same primary Context display name across both surfaces.

All three participants correctly understood that the Grant and the Activity record referred to the same Context.

The Context-identification difficulty observed previously was therefore not reproduced in this follow-up.

### 5.3 PrymeCab access-loss wording

Previously, PrymeCab correctly rejected revoked access, but the user-facing state could be interpreted as a temporary authentication or technical problem.

The revised state explicitly communicates that the previous SecuriSelf access is no longer available and that re-authorisation is required before profile access can resume.

All three participants interpreted this message correctly.

The ambiguity previously observed between revoked access and a temporary technical failure was therefore not reproduced.

---

## 6. Open feedback

No blocking usability issue was reported during the focused post-change evaluation.

No repeated new difficulty emerged that justified another Sprint 2 interface change.

This result should be interpreted within the scope of the follow-up task: it indicates that the specific problems targeted by the revision were understood correctly by the three participants tested.

---

## 7. Comparison with the earlier external evaluation

The first participant round identified three usability concerns that were selected for implementation:

- uncertainty about how to continue after revocation;
- inconsistent Context naming between Grants and Activity;
- technical wording when PrymeCab rejected revoked access.

The post-change evaluation tested these same areas directly.

| Previously observed issue | Change introduced | Post-change result |
|---|---|---|
| Unclear continuation between Grants, Activity and PrymeCab | Post-revocation continuation and **View Activity** action | 3/3 understood the next step |
| Different Context names across Grants and Activity | Shared primary Context display name | 3/3 matched the same Context correctly |
| PrymeCab rejection could appear to be a technical failure | Dedicated plain-language access-loss state | 3/3 interpreted the access-loss consequence correctly |

The comparison is descriptive. The three-participant follow-up is appropriate for confirming the targeted changes in the tested flow, but it is not used to make a statistically generalisable population claim.

---

## 8. Decision

No additional Sprint 2 interface modification was introduced after this focused evaluation.

The three specific problems selected from the earlier evaluation were understood correctly by all three follow-up participants, and no new blocking or repeated usability issue emerged during the task.

The remaining lower-impact observations from the first evaluation, such as stronger status/timestamp hierarchy or additional confirmation wording, therefore remained outside the implemented Sprint 2 revision.

---

## 9. Evaluation boundary

This evaluation provides human evidence about comprehension and usability of the revised revoke-and-verify journey for three participants.

It does not establish:

- general population usability;
- formal accessibility or WCAG conformance;
- production readiness;
- statistical improvement across a wider population.

Technical correctness of revocation, token invalidation, audit creation and browser integration is supported separately by the Sprint 2 automated and end-to-end validation documentation.

---

## 10. Conclusion

The focused post-change external evaluation examined whether the specific usability problems identified in the first Sprint 2 participant round remained present after the interface revision.

All three participants understood:

- how to continue after revoking access;
- that Grants and Activity referred to the same Context;
- that PrymeCab had lost its previous SecuriSelf access and required re-authorisation.

No blocking or repeated usability issue was reported during the follow-up task.

Within the scope of this three-participant evaluation, the results support closing the feedback-driven Sprint 2 changes without an additional interface iteration.
