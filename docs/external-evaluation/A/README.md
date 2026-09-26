# External Evaluation — Cohort A (Identity Owners)

This directory records the evidence chain that follows the Final External Evaluation of
SecuriSelf with Cohort A, the Identity Owner cohort.

## Evidence chain

1. **Cohort A external evaluation completed.** Fifteen Identity Owners each carried out ten
   representative tasks (150 task executions).
2. **Core acceptance criteria passed.** All 150 executions were completed; 144 of 150 (96.0%)
   were completed without researcher assistance; no critical privacy misunderstanding and no
   critical keyboard or accessibility blocker occurred; post-revocation comprehension was
   correct for every participant.
3. **Four bounded usability findings justified refinement.** Friction concentrated in keyboard
   revocation (A1), the relationship between Activity and Grants (A2), the discoverability of
   language variants (A3) and the visibility of information that is not shared at consent (A4).
4. **Refinements were implemented.** Each finding received one targeted interface change; the
   privacy model, API behaviour and authorization semantics were not changed.
   → [`cohort-a-refinement-implementation.md`](cohort-a-refinement-implementation.md)
5. **Technical regression and validation checks were executed.** Unit, integration, end-to-end
   and accessibility suites, lint and type checking were run against the refined version.
   → [`cohort-a-refinement-validation.md`](cohort-a-refinement-validation.md)
   (command output in [`evidence/`](evidence/))
6. **A focused post-refinement participant verification remains the final human check for
   Cohort A.** It has not yet been conducted. Until it is, no claim is made that the refinements
   reduced the observed friction.
   → [`cohort-a-final-verification-plan.md`](cohort-a-final-verification-plan.md)

## Documents

| Document | Content |
| --- | --- |
| [`cohort-a-refinement-implementation.md`](cohort-a-refinement-implementation.md) | Findings, design rationale and implementation of A1–A4; preserved invariants; scope boundaries |
| [`cohort-a-refinement-validation.md`](cohort-a-refinement-validation.md) | Verification method, executed commands and results for each refinement and for regression |
| [`cohort-a-final-verification-plan.md`](cohort-a-final-verification-plan.md) | Protocol for the focused verification with 5–6 new participants (not yet conducted) |
| [`evidence/`](evidence/) | Unedited output of the executed test suites |

## Source of the evaluation figures

The Cohort A figures above and the qualitative findings summarised in the implementation
document are taken from the completed Cohort A evaluation summary. The raw Cohort A session data
(per-participant records, per-task SEQ ratings and timings) are not stored in this repository;
no figure in this directory has been derived beyond that summary.
