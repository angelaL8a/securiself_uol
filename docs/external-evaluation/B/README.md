# Cohort B — Post-Evaluation Documentation Refinements

Cohort B evaluated whether external developers could understand and begin integrating
SecuriSelf using the in-product Developer Docs without access to source code. Ten external
developers each carried out eight integration tasks using only the Developer Docs and the
Console.

The evaluation met its principal objectives: 80 / 80 tasks were completed, 78 / 80
independently; all 40 technical comprehension responses were Correct, with no Critical
misunderstanding; and all 10 developers indicated that they could begin integrating SecuriSelf
from the Developer Docs without source-code access.

Two bounded documentation frictions nevertheless justified refinement:

1. **B1** — clearer causality between the authorization code received at the callback and the
   access token used for the Profile API;
2. **B2** — a clearer navigation and recovery relationship between revoked access, the Errors
   area and the Grants & Revocation area.

Both concern how existing documentation areas relate to each other. Neither concerns missing or
incorrect technical content.

## Status

- Both refinements have been implemented in the Developer Docs.
- The final implementation has been technically validated, including a check of the revised
  wording against the implemented API behaviour.
- The integration and API contract documented to developers is unchanged.
- A focused external developer verification is the remaining human-evaluation step. Until it is
  conducted, no claim is made that the refinements reduce the friction observed in Cohort B.

## Documents

| Document | Content |
| --- | --- |
| [`cohort-b-refinement-implementation.md`](cohort-b-refinement-implementation.md) | Evaluation evidence, the two findings, design rationale, implemented changes, contract preservation and scope |
| [`cohort-b-refinement-validation.md`](cohort-b-refinement-validation.md) | Validation matrix, automated validation results, contract consistency check and interpretation boundary |
| [`evidence/`](evidence/) | Unedited output of the final validation runs |
| [`images/`](images/) | Browser captures of the two refined Developer Docs surfaces |

## Source of the evaluation figures

The Cohort B figures and the participant observations cited in these documents (D01, D04, D05,
D07, D10) are taken from the completed Cohort B evaluation summary. The source report and raw
session data (per-participant records, task timings, comprehension scoring sheets) are not
stored in this repository. No figure in this directory has been derived beyond that summary.

The earlier Sprint 5 developer evaluation, which produced the current area-based structure of
the Developer Docs, is recorded in
[`../../sprint5/sprint5-external-evaluation.md`](../../sprint5/sprint5-external-evaluation.md)
and [`../../sprint5/sprint5-post-evaluation-refinement.md`](../../sprint5/sprint5-post-evaluation-refinement.md).
