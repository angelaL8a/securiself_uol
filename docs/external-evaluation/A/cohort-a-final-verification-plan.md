# Cohort A Final Focused Verification Plan

This plan defines the last human verification for Cohort A (Identity Owners). It follows the
post-evaluation refinements documented in
[`cohort-a-refinement-implementation.md`](cohort-a-refinement-implementation.md) and their
technical validation in [`cohort-a-refinement-validation.md`](cohort-a-refinement-validation.md).

**Status: planned, not yet conducted.** No session has taken place and no result is reported
in this document.

## 1. Purpose

The Cohort A external evaluation (15 Identity Owners, 10 tasks) met its predefined acceptance
criteria but identified four bounded areas of usability friction (A1–A4). Each area received a
targeted interface refinement. The technical validation established that the refinements exist,
operate as specified and did not alter the privacy and security behaviour covered by the
automated tests. It cannot establish whether the refinements changed how people use the
interface.

This focused verification determines whether the refinements reduced the friction observed in
Cohort A. It is the final human check for Cohort A. It is not a repetition of the full ten-task
study: only the tasks whose surfaces were refined, and the task that depends on them, are
retested.

## 2. Research Questions

| ID | Question | Refinement |
| --- | --- | --- |
| RQ1 | Can Identity Owners who have not used SecuriSelf find where Spanish wording belongs and understand that it is part of the same Context? | A3 |
| RQ2 | Before approving, do Identity Owners correctly identify both what is shared and notable information that is not shared, including the account email? | A4 |
| RQ3 | Do Identity Owners look for a past access event in Activity rather than in Grants? | A2 |
| RQ4 | Do Identity Owners look for current access in Grants rather than in Activity, and reach and operate Revoke with the keyboard with less backtracking than observed in Cohort A? | A1, A2 |
| RQ5 | Do Identity Owners still correctly conclude that PrymeCab's previous access is no longer available? | Regression check for A1 |

## 3. Participants

**Number.** Five or six participants.

**Inclusion criteria.**

- Adult (18 years or older).
- Able to use a desktop web browser, including with the keyboard.
- Gives informed consent to take part and to have task measures recorded.

**Exclusion criteria.**

- Took part in any earlier SecuriSelf evaluation (any cohort, any sprint).
- Has significant previous exposure to SecuriSelf, for example through its development, a
  demonstration or its documentation.

**Rationale for new participants.** Cohort A participants have already learned where the
revoke control, Activity, the language controls and the consent preview are located. Retesting
them would confound any effect of the refinements with learning effects. New participants
reproduce the first-use conditions under which the friction was observed.

**Rationale for sample size.** The verification is formative: its aim is to detect whether the
previously observed friction recurs, not to estimate population parameters. Small samples of
around five participants are commonly used for this purpose because recurring problems tend to
appear within the first few sessions (Nielsen and Landauer, 1993). The corresponding limitation
is stated in §9.

## 4. Environment and Preconditions

- Same system configuration as Cohort A: SecuriSelf Platform, API and PrymeCab simulator in the
  local evaluation environment; same browser family and a desktop viewport of at least 1024 px
  width, so that the Console sidebar is displayed as it was in Cohort A.
- The software version is the one containing the A1–A4 refinements, as technically validated.
- A seeded Identity Owner account with Professional, Social, Legal and Private Contexts and no
  existing Grants. The account uses test data only; participants never enter their own personal
  data.
- The Professional Context has English values and no Spanish values at the start of the session.
- The facilitator resets the environment between participants.
- The moderation protocol (instructions, think-aloud convention, assistance rules and assistance
  levels) is the same as in Cohort A, so that independence and help-request measures remain
  comparable.

## 5. Tasks

Tasks are presented in the order below, which follows the order of the corresponding Cohort A
tasks. Task wording is scenario-based and avoids interface labels introduced by the refinements
(for example, it does not say "Language variants", "Not shared", "Skip to main content" or
"Manage current Grants"), so that the tasks measure discoverability rather than instruction
following.

### V1 (T4-type) — Language variants inside one Context

- **Scenario prompt.** "Some applications show your professional profile to Spanish-speaking
  users. Add a Spanish version of your job title to your professional identity."
- **Precondition.** Signed in to the Console, on the Overview page.
- **Success criterion.** The Spanish job title is saved in the existing Professional Context;
  no additional Context is created.
- **Refinement under observation.** A3.
- **Observation focus.** Whether the participant starts creating a second Context; searches
  Settings, the Vault or another location for a language setting; scrolls past the language
  controls; reads the language-variant explanation.
- **Comprehension question (after the task).** "After this change, how many professional
  identities do you have, and how many applications can see the Spanish job title?" Correct
  answer: one Professional Context; only applications already authorised for that Context, and
  only for fields that Context already shares.

### V2 (T6-type) — What is and is not shared before consent

- **Scenario prompt.** "PrymeCab asks to use your SecuriSelf identity. Choose your social
  identity, and before you approve, tell me what PrymeCab will receive and what it will not.
  Then approve."
- **Precondition.** Starting from the PrymeCab landing page.
- **Success criterion.** The Social Context is selected and approved; the participant states
  the shared fields and at least that the account email is not shared.
- **Refinement under observation.** A4.
- **Comprehension questions (before approval).**
  1. "Will PrymeCab receive the email address you use to sign in to SecuriSelf?" Correct: no.
  2. "Will PrymeCab receive information from your other identities, such as the professional
     one?" Correct: no.
  3. "Will PrymeCab receive your legal name?" Correct for the Social Context: no.

### V3 (T8-type) — Find the historical access record

- **Scenario prompt.** "Find the record showing when PrymeCab was given access to your
  identity."
- **Precondition.** V2 completed; participant back in the Console.
- **Success criterion.** The participant locates the *Access granted* event for PrymeCab in
  Activity.
- **Refinement under observation.** A2.
- **Observation focus.** First surface visited (Activity or Grants); whether the participant
  uses the explanatory text or the cross-link.

### V4 (T9-type) — Find and revoke current PrymeCab access with the keyboard

- **Scenario prompt.** "Using only the keyboard, stop PrymeCab from accessing your identity."
- **Precondition.** V3 completed. The mouse or trackpad is set aside for the task. The starting
  page is the same as in the Cohort A T9 task.
- **Success criterion.** The active PrymeCab Grant is revoked through the confirmation dialog
  using the keyboard only.
- **Refinements under observation.** A1 and A2.
- **Observation focus.** First surface visited (Grants or Activity); use of the skip link;
  number of times focus passes the Revoke control and the participant reverses (overshoot);
  whether the focused row highlight is noticed; any difficulty in the confirmation dialog.

### V5 (T10-type) — Verify that previous access is no longer available

- **Scenario prompt.** "Check whether PrymeCab can still show your profile."
- **Precondition.** V4 completed.
- **Success criterion.** The participant opens PrymeCab and identifies that the previous access
  is no longer available.
- **Refinement under observation.** None directly; regression check that the A1 changes did not
  weaken post-revocation comprehension.
- **Comprehension question.** "What happened to PrymeCab's access, and what would PrymeCab
  need to do to get it back?" Correct: access was revoked; the owner would have to authorise
  PrymeCab again.

## 6. Measures

The objective measures of Cohort A are retained so that results can be compared descriptively.

| Measure | Definition | Recorded per |
| --- | --- | --- |
| Completion | Task success criterion met (yes / no) | Task |
| Independence | Completed without researcher assistance (yes / no), using the Cohort A assistance rules | Task |
| Time on task | Seconds from the end of the scenario prompt to success or abandonment | Task |
| Errors | Actions that do not advance the task and require correction (for example, starting a second Context, approving the wrong Context, confirming the wrong Grant) | Task (count) |
| Backtracking | Navigation away from the optimal path followed by a return (for example, opening Activity during V4, or tabbing past Revoke and reversing) | Task (count) |
| Help requests | Explicit requests for help, recorded separately from assistance given | Task (count) |
| SEQ | Single Ease Question, 7-point scale, asked immediately after each task | Task |
| Comprehension | Correct / partially correct / incorrect for each question in §5 | Question |

Refinement-specific observations, recorded as present or absent per participant:

| Code | Observation | Refinement |
| --- | --- | --- |
| O-A1-1 | Focus passed the Revoke control and the participant reversed at least once | A1 |
| O-A1-2 | Skip link used | A1 |
| O-A2-1 | V3: first opened Grants instead of Activity | A2 |
| O-A2-2 | V4: first opened Activity instead of Grants | A2 |
| O-A3-1 | V1: started creating a second Context | A3 |
| O-A3-2 | V1: looked for a language setting outside the Context form | A3 |
| O-A4-1 | V2: uncertain or incorrect about the account email | A4 |
| O-A4-2 | V2: uncertain or incorrect about other Contexts | A4 |

## 7. Analysis and Decision Criteria

Results are analysed per task and compared descriptively with the corresponding Cohort A task:
completion and unassisted completion rates, median time on task, total errors, total
backtracking events, median SEQ, and the incidence of each observation code. The Cohort A
reference values are taken from the Cohort A evaluation dataset.

The following criteria are fixed before any session takes place:

**Preserved acceptance criteria (all must hold).**

- Every task is completed by every participant.
- No critical privacy misunderstanding occurs.
- No critical keyboard or accessibility blocker occurs.
- Post-revocation comprehension (V5) is correct for every participant.

**Friction criteria, per refinement.**

| Refinement | Friction considered reduced if |
| --- | --- |
| A1 | In V4, overshoot (O-A1-1) is observed in at most one participant, and median SEQ is not lower than the Cohort A T9 median |
| A2 | Wrong first surface (O-A2-1 in V3 or O-A2-2 in V4) is observed in at most one participant per task |
| A3 | No participant starts a second Context (O-A3-1), and at most one looks for a language setting elsewhere (O-A3-2) |
| A4 | Every participant answers V2 comprehension questions 1 and 2 correctly |

Each refinement is reported as one of:

- **Friction reduced** — the criterion is met.
- **Friction persisting** — the criterion is not met, and the observations show the same pattern
  as in Cohort A.
- **Inconclusive** — the criterion is not met for reasons unrelated to the refined surface (for
  example, an environment fault or a protocol deviation).

## 8. Procedure

1. Informed consent; confirmation of the inclusion and exclusion criteria.
2. Standard Cohort A briefing, including the think-aloud convention and the assistance rules.
3. Tasks V1–V5 in order, each followed by the SEQ and its comprehension questions.
4. Short closing interview: "Was anything unclear about what an application can see, or about
   how to remove its access?"
5. Environment reset before the next participant.

## 9. Limitations

- With five or six participants, comparisons with Cohort A (15 participants) are descriptive.
  They cannot establish statistical significance, and a single participant changes a rate by
  roughly 17–20 percentage points.
- Retesting only five tasks removes the context of the full ten-task session. Differences in
  fatigue or preceding tasks may affect times and SEQ ratings.
- The verification covers the desktop layout used in Cohort A. It does not assess the mobile
  layout or assistive technologies such as screen readers.

## 10. Reporting

Results will be reported in a separate document in this directory,
`cohort-a-final-verification-results.md`, using the measures in §6 and the decision criteria in
§7. Participants are identified only by code (VP01–VP06). This plan will not be edited to add
results.

## Reference

Nielsen, J. and Landauer, T. K. (1993) 'A mathematical model of the finding of usability
problems', *Proceedings of the INTERACT '93 and CHI '93 Conference on Human Factors in Computing
Systems*, pp. 206–213.
