# Sprint 2 — Post-Evaluation Implementation Changes

## 1. Purpose

This document records the **implementation changes made after the Sprint 2 external user evaluation**.

The original Sprint 2 Grants UI already allowed an identity owner to inspect a third-party application's permission to a SecuriSelf Context and revoke that permission. The external evaluation showed that the revocation itself was generally understood, but identified several points where the complete verification journey could be clearer for users.

The resulting work therefore did **not redesign the permission model or rebuild the Grants feature**. It introduced a small set of targeted interface and presentation changes intended to reduce navigation friction and make the outcome of revocation easier to interpret.

This document explains:

- which evaluation findings led to implementation changes;
- what was changed in the code;
- how each change affects the user-visible flow;
- which components are responsible for the revised behaviour;
- which lower-impact observations were deliberately left unchanged.

Technical validation of these changes is documented separately.

---

## 2. Implementation scope

The revision addressed four findings from the external evaluation:

1. **Post-revocation navigation continuity** — some participants were unsure where to go after revoking access.
2. **Context-name consistency** — Grants and Activity could present different names for the same Context.
3. **PrymeCab access-loss wording** — the rejected-access message could be interpreted as a temporary technical failure.
4. **Authorisation timestamp meaning** — the date displayed on a re-authorised Grant could be mistaken for the latest approval time.

Two lower-impact observations were not implemented:

- stronger visual separation between Grant status and timestamp;
- additional repetition of the application and Context near the final confirmation action.

The changes remained limited to presentation, navigation continuity and semantic clarity. The underlying Grant ownership rules, revocation transaction, token invalidation, audit creation and Context binding were not changed.

---

## 3. Change 1 — Post-revocation continuation

### Evaluation finding

The external evaluation showed that the main difficulty was not performing the revocation itself, but understanding **what to do next**.

The complete task required the user to move through:

`Grants → Activity → PrymeCab`

Two participants required procedural assistance to complete that sequence, and other participants independently suggested a clearer connection between the revoked Grant and its Activity record.

### Implemented change

After a successful revocation, the Grants page now keeps the revoked permission visible and displays an inline continuation message.

The continuation:

- confirms that access for the selected application and Context has been revoked;
- provides a clear **View Activity** action;
- directs the user to verify the practical consequence in PrymeCab;
- does not automatically redirect away from Grants;
- appears only after a successful revoke operation.

Keeping the user on the Grants page is important because the user can immediately inspect the changed **Revoked** state before deciding to continue.

### Main implementation components

The change is primarily implemented through:

- `apps/securiself-platform/src/features/grants/components/grants-page.tsx`
- `apps/securiself-platform/src/features/grants/components/revoke-continuation.tsx`
- `apps/securiself-platform/src/features/grants/components/revoke-grant-dialog.tsx`

`RevokeGrantDialog` reports the successful revoke back to `GrantsPage`. The page stores the application and Context needed for the continuation message, then renders `RevokeContinuation`.

### Key code

`apps/securiself-platform/src/features/grants/components/grants-page.tsx`

```ts
const handleRevoked = (grant: Grant) => {
  setContinuation({
    applicationName: grant.application.name,
    contextLabel: grantContextLabel(grant.context),
  });
};
```

The handler receives the Grant that was successfully revoked and retains only the user-facing information required for the next-step message: the application name and the Context label.

This avoids replacing the current page with a redirect. Instead, the interface can simultaneously show:

- the Grant's new revoked state;
- the application and Context affected;
- the next available verification action.

The `RevokeContinuation` component then presents **View Activity** as an explicit navigation action and explains that PrymeCab should be checked afterwards.

---

## 4. Change 2 — Consistent Context naming across Grants and Activity

### Evaluation finding

One participant hesitated when the Context name displayed in Activity did not match the name previously shown in Grants.

The underlying Context was correct, but the inconsistent presentation made the participant verify the event using the application name and timestamp instead.

For a revocation journey, this matters because the user should be able to recognise that the Activity record refers to the **same permission** that was just revoked.

### Implemented change

The user-facing Context label was standardised across Grants and Activity.

The revised rule is:

- use the Context `displayName` as the primary label;
- show a distinct `internalName` only as secondary information where needed;
- if an older Activity record cannot resolve its Context, display `Context unavailable` instead of failing the page.

The change affects presentation only. Context identifiers, stored audit rows, permission bindings and ownership rules remain unchanged.

### Main implementation components

The relevant logic is located in:

- `apps/securiself-platform/src/features/grants/grant-labels.ts`
- `apps/securiself-platform/src/features/activity/context-label.ts`
- `apps/securiself-platform/app/console/activity/page.tsx`

Activity now resolves its primary Context label using the same user-facing naming rule used by Grants.

The result is a simpler visual relationship:

`Grant: Professional Profile`

`Activity: Professional Profile`

rather than requiring the user to understand that a separate internal name refers to the same Context.

---

## 5. Change 3 — Plain-language access-loss state in PrymeCab

### Evaluation finding

PrymeCab already rejected access after revocation, but one participant initially could not determine whether the message represented:

- the expected consequence of revoked permission; or
- an unrelated temporary technical error.

The system behaviour was correct, but the presentation did not clearly explain **why** access had been lost.

### Implemented change

PrymeCab now distinguishes a known rejected-access condition from a generic application error.

The response state `access_rejected` is mapped to a dedicated `access_lost` presentation.

In that state, the interface explains that:

- the previously authorised SecuriSelf access is no longer available;
- PrymeCab cannot continue using that previous permission;
- a new authorisation is required before access can be restored.

Generic network or server failures continue to use a separate error state. They are not incorrectly described as revoked access.

The access-lost state also avoids displaying previously retrieved profile information as though it were still currently authorised.

### Main implementation components

The change is centred on:

- `apps/prymecab-simulator/lib/access-state.ts`
- `apps/prymecab-simulator/app/page.tsx`

`resolveAccessFromUserResponse` is responsible for interpreting the application response and converting the known rejection reason into the user-facing `access_lost` state.

The backend token-validation policy was not modified. This change translates an existing technical rejection into a clearer user-facing explanation.

---

## 6. Change 4 — Accurate authorisation timestamp wording

### Evaluation finding

Two participants noticed that a Grant which had been revoked and later authorised again continued to display its original date.

The problem was not incorrect stored data. The problem was the meaning implied by the interface label.

### Implementation investigation

The Grant data model shows that:

| Value | Meaning |
|---|---|
| `Grant.createdAt` | Time when the Grant row was first created |
| `Grant.revokedAt` | Time of revocation; cleared when the same Grant is re-authorised |
| Latest `ACCESS_GRANTED` timestamp | Time of a later approval, stored in Activity rather than projected as a Grant field |

Re-authorisation reuses the existing Grant for the same user, application and Context. It does not create a new `createdAt` value.

Therefore, presenting `createdAt` simply as **Authorised** could incorrectly suggest that it represented the latest approval.

### Implemented change

The Grants UI now labels `createdAt` as:

**First authorised**

This makes the visible wording consistent with the actual data source.

A new "Last authorised" value was not introduced because the Grants response does not currently expose a reliable latest-authorisation field. Relabelling `createdAt` as "Last authorised" would therefore have been factually incorrect.

No schema migration or permission-model change was required.

---

## 7. Resulting user flow

After the evaluation-driven changes, the revocation journey is presented as follows:

1. The owner opens **Grants** and identifies PrymeCab's active permission.
2. The owner revokes the intended Grant.
3. The same Grant remains visible with **Revoked** status.
4. A continuation message identifies the affected application and Context.
5. The user can select **View Activity** to inspect the recorded revocation.
6. Grants and Activity use the same primary Context name.
7. The user checks PrymeCab.
8. PrymeCab explains that the previous SecuriSelf access is no longer available and that re-authorisation is required.

The technical revocation sequence underneath this journey remains unchanged:

`revoke Grant → invalidate matching active access tokens → create ACCESS_REVOKED → reject later profile access`

The revision therefore improves the explanation and continuity surrounding the existing enforcement behaviour rather than changing that enforcement mechanism.

---

## 8. Principal code areas affected

Only the implementation areas directly relevant to the evaluation findings are important for understanding this revision.

| Area | Responsibility after the revision |
|---|---|
| `grants-page.tsx` | Stores the successfully revoked Grant information and activates the post-revocation continuation state |
| `revoke-continuation.tsx` | Presents the next-step Activity action and PrymeCab verification guidance |
| `revoke-grant-dialog.tsx` | Reports successful revocation back to the parent Grants page |
| `grant-labels.ts` | Provides the primary user-facing Context label used by Grants |
| `activity/context-label.ts` | Applies the same Context naming rule to Activity and handles unavailable historical Contexts |
| `activity/page.tsx` | Displays Activity records using the revised Context labels |
| `prymecab-simulator/lib/access-state.ts` | Distinguishes revoked/rejected access from generic technical errors |
| `prymecab-simulator/app/page.tsx` | Displays the plain-language access-lost state |
| `grants-list.tsx` | Presents the corrected **First authorised** timestamp label |

This is not intended as a complete changed-file inventory. It identifies only the code areas that explain the implemented feedback response.

---

## 9. Changes deliberately not implemented

The external evaluation also produced two lower-impact observations.

### Grant status and timestamp hierarchy

One participant found that status and date competed visually while scanning the Grant.

No broader visual redesign was introduced because the participant recovered independently, selected the correct Grant and completed the task without assistance.

### Additional confirmation wording

One participant suggested repeating the exact application and Context closer to the final confirmation control.

The existing confirmation already allowed the participant to verify the correct target, and no participant revoked the wrong Grant. The suggestion was therefore retained as a possible future refinement rather than expanding this revision.

These decisions kept the implementation proportional to the observed evidence.

---

## 10. Implementation boundary

The post-evaluation revision did **not** change:

- Grant ownership enforcement;
- the `(user, application, Context)` permission relationship;
- the revoke API contract;
- token invalidation rules;
- `ACCESS_REVOKED` creation;
- Context identifiers;
- OAuth-like authorisation semantics;
- re-authorisation behaviour;
- the underlying privacy-filtering rules.

The changes were deliberately concentrated on **navigation continuity, naming consistency, state explanation and timestamp accuracy**.

---

## 11. Conclusion

The external evaluation showed that users generally understood the Grants revocation concept, while the main weaknesses appeared when they had to verify the result across Grants, Activity and PrymeCab.

The subsequent implementation therefore preserved the existing permission and revocation mechanism and changed only the parts of the interface that contributed to that friction.

The resulting revision:

- provides an explicit continuation after revocation;
- keeps Context identification consistent between Grants and Activity;
- explains lost PrymeCab access in plain language;
- labels the Grant creation timestamp according to its actual meaning.

The lower-impact observations that did not cause incorrect actions or task failure were not used to justify a wider redesign.

For the evidence and results showing how these revised behaviours were technically verified, refer to the separate Sprint 2 validation documentation.
