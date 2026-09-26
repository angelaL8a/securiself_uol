# Cohort A Post-Evaluation Refinements

## 1. Purpose

This document records the interface refinements made to SecuriSelf after the Final External
Evaluation with Cohort A (Identity Owners), and the reasoning that links each refinement to the
evaluation evidence.

Cohort A met its predefined acceptance criteria. Fifteen Identity Owners carried out ten
representative tasks (150 task executions):

- all 150 executions were completed;
- 144 of 150 (96.0%) were completed without researcher assistance;
- no critical privacy misunderstanding occurred;
- no critical keyboard or accessibility blocker occurred;
- post-revocation comprehension was correct for all 15 participants.

The evaluation therefore did not show a failure of SecuriSelf's privacy model or of its core
Identity Owner flows. It did show friction concentrated in four specific places: on those
surfaces, task ease ratings, backtracking, first navigation choices and participants' own
comments indicated recurring difficulty, although the tasks were still completed. The refinements
respond to these four findings only. Each finding is:

1. stated with the evidence observed;
2. interpreted, with alternative interpretations considered;
3. answered by the smallest interface change judged capable of addressing it;
4. bounded, by stating which system behaviour the change must not affect.

Whether the refinements reduce the observed friction is a question for the focused human
verification described in [`cohort-a-final-verification-plan.md`](cohort-a-final-verification-plan.md).
This document makes no claim about that outcome.

**Source of evidence.** The figures above and the observations in §2 come from the completed
Cohort A evaluation summary. Per-participant session records, per-task SEQ values and timings
are not stored in this repository, so this document does not reproduce per-task statistics
beyond that summary and does not attribute the six assisted executions to particular tasks.

## 2. Evaluation Findings Driving the Changes

| Finding | Observed evidence | Interpretation | Required refinement |
| --- | --- | --- | --- |
| **A1** Keyboard revocation / row action | The task of finding and revoking PrymeCab's access with the keyboard (T9) was the most difficult Cohort A task: lower task ease than the other flows and substantial backtracking. Some participants first looked in Activity rather than in the current permissions; some overshot the Revoke control or had difficulty reaching it; one participant suggested a clearer textual or action affordance. Every participant was ultimately able to operate the control; no keyboard-operability blocker occurred. | A discoverability and keyboard-efficiency problem, not a defect in revocation. The control can be operated, but reaching it and relating it to the correct permission costs effort. The Activity-first navigation is treated as part of A2. | Make Revoke easier to reach and to identify with the keyboard, without changing the confirmation step, the control's operability or revocation semantics. |
| **A2** Activity ↔ Grants relationship | Several participants confused "what has happened" with "what is currently authorised": some searched Grants when asked to find a historical access event (T8), and some searched Activity when asked to revoke current access (T9). | The two surfaces have distinct and correct responsibilities, but their headers did not state the difference, and Activity offered no route to current access other than the sidebar. The model is sound; the surfaces do not communicate it. | State explicitly that Grants shows current access and Activity shows recorded history, and link the two, without combining them. |
| **A3** Language-variant discoverability | Participants understood multilingual behaviour once they found it, but some scrolled past the EN/ES controls, looked for language settings elsewhere, began creating a second Professional Context, or read the Spanish values as belonging to another identity representation (T4). | The language controls were not recognisable as part of the Context, and nothing on the form said that a Spanish value belongs to the same Context. Participants filled that gap with a "one Context per language" model, which the product does not implement. | Make it immediately clear, next to the language controls, that English and Spanish are variants of the same Context and do not create another Context or permission. |
| **A4** Explicit non-disclosure on Consent | The consent preview communicated the fields to be shared, and the resulting disclosure was generally understood (T6). Some participants were nevertheless uncertain about what was *not* shared, particularly the account email and other root identity information. | A list of included fields makes data minimisation visible only by omission. Participants had to infer that an absent field was withheld; for the account email, they were not confident in that inference. | Show a concise, category-specific statement of notable information not shared with the application, using labels only and without exposing hidden values. |

## 3. Design Rationale

### A1 — Keyboard revocation / row action

**Observed problem.** Reaching Revoke with the keyboard required more effort than the other
flows, and participants overshot the control or had difficulty reaching it.

**Inspection of the interface before the change.** The Revoke control already had visible text
("Revoke") and a specific accessible name (for example, *Revoke PrymeCab access to AngelaTech*).
It opened a confirmation dialog that could be operated and dismissed with the keyboard. The
cost lay in the path to it. At the desktop width used in the evaluation, Tab reached, in order,
the eight Console sidebar links, the account menu, the page's *View Activity* action and only
then the first Revoke control: eleven Tab presses from the top of the page (confirmed by
measurement; see the validation document). Revoke sat in the
rightmost of seven table columns, so the focused control was visually distant from the
application and Context it acted on.

**Why a change was justified.** The task was the most difficult in Cohort A, and the difficulty
was observed across several participants, as backtracking and overshoot, rather than as a single
comment.

**Alternative interpretations and options considered.**

- *The label is the problem.* One participant suggested a clearer textual affordance. The
  control already has text, and the recurring evidence concerned reaching the control rather
  than recognising it. Changing the visible label would also require the accessible name (used
  for identification by assistive technologies) to be rewritten so that it still contains the
  visible text. The label was therefore left unchanged. This interpretation remains open for the
  focused verification.
- *A keyboard shortcut for revocation.* Rejected: it is not discoverable without instruction,
  and single-key shortcuts can conflict with assistive-technology commands.
- *Moving the Actions column to the left.* Rejected: Revoke is the only focusable element in each
  row, so column position does not change the Tab sequence; it would only reorder an
  established table.
- *Removing the page's View Activity action to save one Tab stop.* Rejected: it is the route
  from Grants to Activity required by A2.
- *Removing the confirmation dialog.* Rejected: it protects against accidental revocation.

**Selected change and proportionality.** Two changes, each addressing one measured cost:

1. a *Skip to main content* link as the first Tab stop of every Console page, which removes the
   sidebar and account menu from the path;
2. a background highlight on the Grants row whose control has keyboard focus, which ties the
   focused Revoke visually to the application, Context and status in the same row.

Both are established interface patterns. Neither adds a control to the Grants page or changes
what Revoke does.

**Behaviour that must remain unchanged.** Confirmation before revocation; operation by keyboard
and by pointer; Escape and Cancel close the dialog without revoking; textual status (*Active* /
*Revoked*, each with an icon); the revocation endpoint and its behaviour on repeated requests;
PrymeCab's loss of access after revocation.

### A2 — Activity ↔ Grants relationship

**Observed problem.** Participants looked for history in Grants and for current access in
Activity.

**Why a change was justified.** The confusion occurred in both directions and on two different
tasks (T8 and T9), so it reflects the relationship between the surfaces rather than one
ambiguous label.

**Alternative interpretations and options considered.**

- *Combine the two surfaces.* Rejected: Activity is an append-only audit record and Grants is the
  current authorization state. Combining them would blur exactly the distinction participants
  needed to learn.
- *Rename Grants to Permissions throughout the product.* Rejected: *Grants* is the established
  term in the Console navigation, page titles, API and documentation. "Current permissions" is
  used as explanatory wording on the Grants page instead.
- *A per-event link from each Activity entry to its Grant.* The data model would support
  deriving the relationship: a Grant is unique per owner, application and Context, and each
  audit event records the application and Context. It was not implemented, because (1) the
  Grants page has no addressable per-Grant state, so a deep link would need new routing and
  focus behaviour; (2) Activity lists every profile read, so a link per event would add one Tab
  stop per entry to the surface used in the T8-type task, working against the keyboard-effort
  objective of A1; and (3) the observed confusion concerned which surface holds which kind of
  information, which page-level wording and links address directly. It can be reconsidered if
  the focused verification shows persisting confusion.

**Selected change and proportionality.** Each page's existing description now opens by naming
its responsibility ("Current permissions: …" on Grants; "A record of what has happened: …" on
Activity) and names the other surface. The existing *View Activity* action on Grants is kept,
and Activity gains the reciprocal *Manage current Grants* action. The changes consist of two
descriptions and one link; no data, route or component structure changes.

**Behaviour that must remain unchanged.** The content, ordering and filtering of Activity;
audit-event generation; the Grants list; the absence of any state change caused by navigation.

### A3 — Language-variant discoverability

**Observed problem.** Participants did not find, or did not correctly interpret, the place where
Spanish wording belongs, and some began to create a second Professional Context.

**Why a change was justified.** Beginning a second Context is a misreading of the data model,
not only a delay, and it recurred across participants.

**Alternative interpretations and options considered.**

- *A page-level or account-level language selector.* Rejected: it would suggest a global
  language setting, which is the misreading observed (participants looked for language settings
  elsewhere).
- *Showing English and Spanish fields side by side.* Rejected as disproportionate: it doubles the
  localisable fields on the form and changes the layout more than the finding requires.
- *Moving the language controls to the top of the form.* Rejected: it would separate localisable
  fields from the other details of the same Context and reorder the form beyond the finding.

**Selected change and proportionality.** The existing English/Español tabs are grouped, in the
same position, in a bordered section headed *Language variants*. A short explanation directly
under the heading states that English and Spanish are language variants of this same Context,
that adding a language does not create a separate Context or permission, and which fields have
language variants. The heading and border make the section recognisable while scrolling, and the
explanation states the model where the controls are.

**Behaviour that must remain unchanged.** The fields that are localisable for each category;
language-independent fields; the stored representation of language variants; Accept-Language
resolution and fallback; the Context category allow-lists.

### A4 — Explicit non-disclosure on Consent

**Observed problem.** Participants understood what would be shared but were not certain what
would not be, especially the account email.

**Why a change was justified.** Uncertainty about disclosure at the point of consent concerns
SecuriSelf's central promise, even though no critical misunderstanding occurred.

**Alternative interpretations and options considered.**

- *Show the account email with a "not shared" marker.* Rejected: it would display a hidden value
  merely to say that it is hidden. The consent screen does not display the account email, and
  this refinement does not introduce it.
- *Reuse the Context form's privacy matrix rows on the consent screen.* Rejected: the matrix uses
  developer-oriented wording (*Blocked from API*) and one row per field. The same matrix is also
  used by the Developer Docs, so its labels were not changed.
- *A static, hand-written list.* Rejected: it could diverge from the category rules. The list is
  derived from the same category rules as the Context form.

**Selected change and proportionality.** After a Context is selected, a short *Not shared with
{application}* section lists, by label, the notable information that the selected Context's
category never discloses, plus *Your other Contexts*. It is worded as notable exclusions, and
the payload preview remains the statement of what *is* shared. The existing generic consent
notice was also corrected, because its claim that Vault data remains private did not hold for
Legal Contexts, which disclose the legal name held in the Vault.

**Behaviour that must remain unchanged.** The profile privacy filter; the payload preview; the
authorization request and decision; the Context bound to the authorization code, access token
and Grant.

## 4. Implementation

All changes are in the SecuriSelf Platform front end (`apps/securiself-platform`). No API,
database schema or PrymeCab simulator file was changed.

### A1 — Keyboard revocation / row action

| Aspect | Record |
| --- | --- |
| Files | `src/components/layout/console-shell.tsx`; `src/features/grants/components/grants-list.tsx` |
| Surface | All `/console/*` routes (skip link); `/console/grants` (row highlight) |
| Previous behaviour | Revoke was the 11th Tab stop from the top of the Grants page (8 sidebar links, account menu, *View Activity*, Revoke). No visual link between the focused Revoke and its row other than position. |
| New behaviour | The first Tab stop is *Skip to main content*. It is visually hidden until focused, then shown at the top left with the Console focus ring. Activating it moves focus to `<main>`; from there Revoke is 2 Tab stops away (*View Activity*, Revoke). The path becomes 1 Tab, 1 Enter and 2 Tabs, instead of 11 Tabs. While any control in a Grants row (desktop table) or Grant card (narrow layout) has keyboard focus, the row is highlighted with the same muted background used for pointer hover. |
| Technical mechanism | `<a href="#main-content">` styled `sr-only focus:not-sr-only …`; `<main id="main-content" tabIndex={-1}>` so that the browser moves focus to the target. The row class `has-[:focus-visible]:bg-muted/50` uses the CSS `:has()` and `:focus-visible` selectors, so the highlight follows keyboard focus and does not persist after pointer clicks. |
| Accessibility considerations | Visible text and accessible name of Revoke unchanged. The button's own focus ring is kept; the row highlight is additional. Status continues to be conveyed by text and icon, not colour. The skip link is a native link and keyboard-operable. Focus on `<main>` itself is not outlined; the next Tab moves visible focus to the first control inside the page. |
| Privacy / security considerations | None affected: presentation only. |

### A2 — Activity ↔ Grants relationship

| Aspect | Record |
| --- | --- |
| Files | `src/features/grants/components/grants-page.tsx`; `app/console/activity/page.tsx` |
| Surface | `/console/grants`; `/console/activity` |
| Previous behaviour | Grants: "Applications authorised to access one of your identity Contexts. Revoke a Grant to stop active access for that application–Context permission." plus *View Activity*. Activity: "An append-only audit log of every grant, profile read and anomaly, newest first." plus the action filter; no route to Grants except the sidebar. |
| New behaviour | Grants: "Current permissions: the applications that can access one of your identity Contexts now. Revoke a Grant to stop active access for that application–Context permission. What has already happened, such as profile reads and revocations, is recorded in Activity." *View Activity* kept. Activity: "A record of what has happened: an append-only audit log of every grant, profile read, revocation and anomaly, newest first. Activity does not change access; to see or revoke what applications can access now, open Grants." New *Manage current Grants* action next to the filter. |
| Technical mechanism | Existing `PageHeader` component. The new action is a `Link` to the existing `routes.console.grants`, styled with the existing outline `Button`. The filter and link are wrapped in a `flex-wrap` container so that they wrap at narrow widths. |
| Accessibility considerations | Link text names its destination. The link adds one Tab stop after the filter and before the event list. |
| Privacy / security considerations | Navigation only. Neither page writes data. The audit endpoint is read-only and does not record reads of itself. |

### A3 — Language-variant discoverability

| Aspect | Record |
| --- | --- |
| Files | `src/features/contexts/components/context-form.tsx` |
| Surface | `/console/contexts/new` and `/console/contexts/{id}` (both use `ContextForm`), for categories with localisable fields (Professional, Social, Private) |
| Previous behaviour | English/Español tabs directly below the stable fields, with no heading; tablist named "Localisable field language"; one note below about Accept-Language fallback. |
| New behaviour | The tabs are placed in a bordered `<section>` labelled by the heading *Language variants* (decorative language icon). Directly beneath it: "English and Spanish are language variants of this same Context. Adding another language does not create a separate Context or permission. Only {fields} have language variants; other fields are the same in every language." Tablist renamed "Language variant of this Context" and described by that explanation. Tab names, field identifiers and the Accept-Language note are unchanged. |
| Technical mechanism | The field list is derived from the existing `CATEGORY_LOCALISABLE_FIELDS` and `FIELD_LABELS` and joined with `Intl.ListFormat` (for example, Professional: "pronouns, job title, and short bio"; Social: "pronouns"; Private: "pronouns and short bio"). The section is not rendered for Legal Contexts, which have no localisable fields, as before. |
| Accessibility considerations | The `<section>` with `aria-labelledby` is exposed as a named region. The explanation is the tablist's accessible description, so it is announced when focus enters the language tabs. The icon is `aria-hidden`. |
| Privacy / security considerations | No change to the form schema, submitted payload (`pronounsEs`, `jobTitleEs`, `shortBioEs` → `*I18n`), API validation or `Accept-Language` resolution. |

### A4 — Explicit non-disclosure on Consent

| Aspect | Record |
| --- | --- |
| Files | `src/features/contexts/context-rules.ts` (`getNotSharedLabels`); `src/features/oauth/components/consent-not-shared.tsx` (new); `src/features/oauth/components/oauth-consent.tsx` |
| Surface | `/oauth/authorize` (consent screen), after a Context is selected |
| Previous behaviour | Payload preview *What {application} will receive*, and a generic notice: "Only the selected context payload will be shared. Your Vault data and other contexts remain private." |
| New behaviour | Below the preview, a region *Not shared with {application}*: "Approving this Context does not give {application} the following. Only the fields in the preview above are shared." followed by the category's labels (table below). It updates when another Context is selected. The generic notice now reads: "Only the selected context payload will be shared. Your other contexts, and Vault data not included in that payload, remain private." |
| Technical mechanism | `getNotSharedLabels(category)` takes the entries of the existing `getPrivacyMatrix(category)` marked as not exposed, shows *Root email* as *Account email* on this screen, and appends *Your other Contexts*. `ConsentNotShared` receives only the application name and the selected category. |
| Accessibility considerations | Named region (`<section aria-labelledby>`) containing a list. Each item has a decorative icon; its meaning is carried by the region label, not by colour or icon. |
| Privacy / security considerations | The component receives no user record and no identity value, so it cannot render one; only fixed category labels are displayed. No data is fetched for it. |

Labels shown per category:

| Selected Context category | *Not shared* labels |
| --- | --- |
| Social | Legal name · Document ID · Account email · Gender · Your other Contexts |
| Professional | Document ID · Account email · Gender · Legal name · Your other Contexts |
| Legal | Account email · Gender · Your other Contexts |
| Private | Account email · Legal name · Document ID · Gender · Your other Contexts |

**Correspondence with system rules.** The authoritative rule is the API's profile filter
(`apps/api-backend/src/modules/profiles/profiles.service.ts`, `filterProfile`). It never returns
the account email or gender for any category, and it returns the legal name and document ID only
for Legal Contexts. The authorization code, access token and Grant each reference exactly one
Context, so no other Context is reachable through an approval. The front-end privacy matrix from
which the labels are derived encodes the same exclusions. The unit tests check that no label
names a field present in that category's payload.

## 5. Privacy and Security Preservation

The following invariants were not changed. No file implementing them was modified, and the
suites that exercise them passed after the refinements (see
[`cohort-a-refinement-validation.md`](cohort-a-refinement-validation.md)).

| Invariant | Implementation location (unchanged) |
| --- | --- |
| Vault privacy; root email excluded from `/profiles/me` | `profiles.service.ts` (`filterProfile`) |
| Context ownership | `contexts.service.ts` (`getOwnedContext`) |
| Context-bound access; category field allow-lists; Legal-only data | `profiles.service.ts`; `contextRules.ts` |
| OAuth-like authorization flow; authorization-code and access-token behaviour | `oauth.service.ts` |
| Audit-event generation | `audit.service.ts` and its callers |
| Grant revocation semantics, including repeated revocation | `grants.service.ts` |
| PrymeCab access-loss behaviour | PrymeCab simulator (not modified) |
| Accept-Language semantics | `lib/locale.ts`; `profiles.service.ts` |

The only front-end change that touches privacy-related logic is the new read-only function
`getNotSharedLabels`, which derives display labels from the existing privacy matrix and does not
affect the payload preview (`buildProfilePayload`) or any request.

## 6. Scope Boundaries

- These are targeted refinements of four surfaces. No other screen was redesigned, and the
  Developer Docs (Cohort B) were not modified. The Console skip link is rendered by the shared
  Console layout and is therefore also present on Developer Docs pages; no Developer Docs
  content or navigation was changed.
- The refinements have been implemented and technically verified. No claim is made that they
  improve usability for Identity Owners, that participants would prefer them, that SEQ or other
  measures improve, or that any accessibility standard is met.
- Such claims require the focused participant verification defined in
  [`cohort-a-final-verification-plan.md`](cohort-a-final-verification-plan.md), which has not yet
  been conducted.
