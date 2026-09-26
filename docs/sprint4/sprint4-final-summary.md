# Sprint 4 — Final Consolidated Summary

**Subject:** Federated Google authentication for SecuriSelf identity owners
**Scope of this document:** the implemented system, its technical rationale, the
evidence produced for it, and the boundaries of that evidence.
**Primary sources:** the repository at its current state,
`sprint4-implementation.md`, `sprint4-validation.md`, and the eight manual
screenshots in `docs/sprint4/images/`.

---

## 1. Sprint 4 Objective

Sprint 4 added a second authentication mechanism — "Sign in with Google" — to an
identity platform whose function begins only *after* an account exists. Every
capability SecuriSelf offers (Vault → Contexts → consent → context-filtered
disclosure to a third-party application) presupposes an authenticated identity
owner. Until this Sprint the only way to become one was
`POST /api/v1/auth/register` or `POST /api/v1/auth/login` with an email address
and a password.

Google authentication was introduced at this stage, rather than earlier, because
the contextual identity model it has to leave intact had to exist first. Sprints
1–3 established the root identity (`User` + Vault), the Context model, the
OAuth-like authorization journey with the PrymeCab simulator, grant revocation
and multilingual disclosure. Only once those were in place could the Sprint pose
its question in a form that admits a falsifiable answer.

The technical question Sprint 4 addresses is therefore not "does Google sign-in
work". It is:

> **Can an external identity provider authenticate a SecuriSelf identity owner
> without changing who that owner is inside SecuriSelf, or what a third-party
> application can see of them?**

The distinction the Sprint preserves throughout is:

> **Google authenticates the SecuriSelf identity owner; SecuriSelf determines
> which Context a third-party application may receive.**

These are two different decisions at two different layers. Google establishes
*who is at the keyboard* and hands SecuriSelf a signed assertion of that fact.
SecuriSelf alone decides what that person's identity consists of, which Contexts
exist, which one is disclosed to a given application, and which fields of it
leave the system. Sprint 4 extends the first layer and is required to leave the
second byte-for-byte unchanged. It adds an entry point; it does not add an
identity model.

Five properties of the pre-existing system had to survive the change, and they
structure everything that follows:

| # | Property | Why it is load-bearing |
| --- | --- | --- |
| P1 | The existing SecuriSelf account is preserved | `Context`, `Application`, `Grant`, `AccessToken` and `AuditLog` rows are all keyed on `User.id`. A second account for the same person silently orphans all of it. |
| P2 | The existing session model is preserved | Google must produce the same `JWT_SECRET`-signed bearer token that the `authUser` middleware already validates, not a parallel session mechanism. |
| P3 | Vault and Context ownership is preserved | The owner's data must remain attached to the same `User` row and be readable through a Google-issued session. |
| P4 | `returnTo` behaviour is preserved | The PrymeCab → SecuriSelf journey parks the full `/oauth/authorize?…` request in `returnTo`. If authentication drops it, third-party integration breaks silently. |
| P5 | Contextual disclosure and privacy rules are unchanged | Google profile claims must not become third-party-visible data, and `/api/v1/profiles/me` filtering must behave identically. |

A sixth, negative property completes the objective: **an invalid or unverified
Google credential must authenticate nobody and create nothing.**

---

## 2. Why This Implementation Was Needed

**Password-only access is a structural dependency, not a preference.** With a
single credential type, the platform's entire population is gated behind a
secret that SecuriSelf itself must store, hash, and be trusted with. Adding a
federated provider means an identity owner can reach their account without
SecuriSelf holding a password for them at all: `User.passwordHash` was already
nullable, so a Google-only account is a first-class account rather than a
special case.

**Familiarity lowers the cost of the onboarding step that precedes all value.**
An identity platform asks for effort before it returns anything — an account
must exist, a Vault must be filled, a Context must be created — and requiring a
new password at the very first step compounds that. A provider the user already
holds credentials for removes one barrier from the path to the first Context.

**One account, not a parallel identity model.** The design decision that carries
the most weight is negative: Google identities are *not* modelled separately. No
`GoogleUser` table, no provider-scoped account, no second session type. A Google
identity is a nullable, unique `googleId` column on the existing `User` row.
Consequently a person who signs in with Google after having registered with a
password reaches the same row, keeps the same `User.id`, and therefore keeps
every Context, Application, Grant and audit record attached to it. Had Google
identities been modelled independently, the platform would have had to reconcile
two identities later — precisely the fragmentation SecuriSelf exists to oppose.

**Authentication and disclosure remain separate concerns.** SecuriSelf's premise
is that a third party should receive a *context*, never a person. Federation
touches only the question of who the person is; it must not become a new source
of data about them. This is why the implementation reads exactly two claims from
the Google ID token (`sub` and `email`) and discards `name`, `given_name`,
`family_name` and `picture`. Any of those, if persisted, would enter a data model
whose fields are disclosable — and would do so without the owner ever choosing
it.

---

## 3. What Was Implemented

### 3.1 Persistence

| Change | Location |
| --- | --- |
| `User.googleId String? @unique` — the Google `sub` claim; nullable so password accounts are untouched, unique so one Google identity maps to at most one SecuriSelf account | `apps/api-backend/prisma/schema.prisma` |

`User.passwordHash` was already nullable, so no further schema change was needed
for an account that exists without a password.

### 3.2 Backend

| Change | Location |
| --- | --- |
| `verifyGoogleIdToken()` — verifies the Google OIDC ID token via `google-auth-library` and additionally enforces `email_verified` | `src/lib/googleIdToken.ts` (new) |
| `loginWithGoogle()` — provider identity resolution, account linking or creation, session issuance | `src/modules/auth/auth.service.ts` |
| `POST /api/v1/auth/google` | `src/modules/auth/auth.routes.ts` |
| `googleAuthSchema` — `{ credential: string }`, minimum length 1 | `src/modules/auth/auth.schemas.ts` |
| `GOOGLE_CLIENT_ID`, optional, in the validated environment | `src/config/env.ts` |
| `serializeUser()` now strips `googleId` in addition to `passwordHash` | `src/lib/serializers.ts` |
| Dependency: `google-auth-library` (Google's official Node client) | `apps/api-backend/package.json` |

### 3.3 Frontend

| Change | Location |
| --- | --- |
| `<GoogleSignInButton>` — loads Google Identity Services, renders Google's own button, handles the credential, popup dismissal and script-load failure | `src/features/auth/components/google-sign-in-button.tsx` (new) |
| `signInWithGoogle(credential)` — unauthenticated `POST` to the Google endpoint | `src/features/auth/api.ts` |
| `useGoogleSignIn(returnTo)` — reuses the same success handler as password authentication | `src/features/auth/hooks.ts` |
| `resolveReturnTo()` — single shared implementation of post-authentication destination resolution | `src/features/auth/hooks.ts` |
| Button mounted on both authentication screens, with the GIS labels `signin_with` and `signup_with` respectively | `sign-in-form.tsx`, `sign-up-form.tsx` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `.env.example`, `.env.local` |

### 3.4 Behavioural surface

- **Successful authentication** issues the standard `AuthResult`
  (`{ user, token }`), stores the session under the existing `securiself.auth`
  key, primes the `auth.me` query cache, and navigates to the resolved
  destination.
- **Failed authentication** is differentiated by cause: a missing `credential`
  is rejected by Zod with `400` before the verifier is reached; an invalid,
  tampered or expired credential yields `401` and creates no user row; a Google
  account without a verified email yields `401`; an unconfigured
  `GOOGLE_CLIENT_ID` yields `503`.
- **Email/password authentication is untouched.** Both fields, the submit
  button and the register/login endpoints are unchanged; the Google control is
  added below an "or" divider as an alternative, not a replacement.
- **`returnTo` is preserved** identically for both authentication paths, because
  both call the same `resolveReturnTo()` through the same success handler.
- **Feature opt-in.** Without `NEXT_PUBLIC_GOOGLE_CLIENT_ID` the component
  renders `null`, so an unconfigured deployment presents exactly the
  pre-Sprint-4 sign-in screen; without `GOOGLE_CLIENT_ID` the backend endpoint
  answers `503` while every other route is unaffected.
- **No new route, no new state store, no server-side OAuth callback endpoint.**
  Google Identity Services runs in `ux_mode: "popup"` and returns the credential
  to a JavaScript callback, so the integration requires an authorised JavaScript
  origin but no authorised redirect URI.

---

## 4. How It Works

### 4.1 The complete causal chain

1. **Entry.** PrymeCab sends the browser to
   `/oauth/authorize?client_id=…&redirect_uri=…&response_type=code&scope=identity_context`.
   The consent component observes that no session token is hydrated and calls
   `router.replace(signInWithReturn(currentUrl))`, producing
   `/sign-in?returnTo=<URL-encoded authorize request>`. The consent request is
   parked, not discarded — and it is parked *before* any authentication occurs,
   which is why the mechanism is provider-agnostic.
2. **Google authentication.** `<GoogleSignInButton>` initialises Google Identity
   Services with the public client ID and renders Google's own button. The user
   selects an account in a Google-hosted popup served from
   `accounts.google.com`. Authentication happens entirely on Google's
   infrastructure; SecuriSelf never sees a Google password.
3. **Credential returned to SecuriSelf.** GIS invokes the callback with
   `{ credential }` — a Google-signed OIDC ID token. The frontend posts it to
   `POST /api/v1/auth/google` as `{ credential }`, deliberately without an
   `Authorization` header.
4. **Backend verification.** `verifyGoogleIdToken()` validates the token against
   Google's public certificates: signature, issuer, expiry, and audience — `aud`
   must equal the configured `GOOGLE_CLIENT_ID`, which is what prevents a token
   minted for a different application from being replayed here. It then enforces
   `email_verified === true`, a check `verifyIdToken` does not perform, and
   returns only `{ sub, email }`.
5. **User resolved or created.** `loginWithGoogle()` lower-cases the email and
   resolves the account in a fixed order: an existing `googleId` match is a
   returning Google identity; otherwise a verified-email match is an existing
   SecuriSelf account, which is **updated** to carry the `googleId`; otherwise a
   new `User` is created with `email` and `googleId` only.
6. **Existing session issued.** The resolved row is passed to
   `signSessionToken(user.id)` — the same helper used by `/auth/login` — and
   serialised by the same `serializeUser()`. The response shape is identical to
   password authentication, so the token is indistinguishable from a
   password-issued one and is validated by the unchanged `authUser` middleware.
7. **`returnTo` restored.** `useGoogleSignIn` shares `useAuthSuccessHandler`
   with `useLogin` and `useRegister`: the session is written to the auth store
   and `localStorage`, the `auth.me` cache is primed, and the router replaces
   the current URL with `resolveReturnTo(returnTo)` — the parked authorize
   request when present, `/console` otherwise.
8. **The existing authorization flow resumes.** The browser lands back on
   `/oauth/authorize`, now authenticated. From this point the code path is
   entirely pre-Sprint-4: the consent screen loads the owner's Contexts, the
   owner selects one and approves, a single-use authorization code is issued,
   PrymeCab exchanges it server-side at `POST /api/v1/oauth/token` using its
   `client_id` and `client_secret`, and calls
   `GET /api/v1/profiles/me` with the resulting context-bound access token.
9. **Filtered disclosure.** PrymeCab receives only the allow-listed fields of
   the selected Context's category.

### 4.2 What Google authentication does *not* change

The following are untouched by Sprint 4, by construction rather than by
convention — no file in the disclosure path was modified:

- **Context ownership.** Contexts remain rows keyed on `User.id`. Because
  linking updates the existing row rather than inserting a new one, every
  foreign key continues to reference the same record.
- **Grants.** Grant issuance, listing and revocation are unchanged, and are
  driven by the session, not by how it was obtained.
- **The `/api/v1/profiles/me` allow-list.** Category filtering is performed by
  the same unmodified profile service; no Google-derived field was added to any
  category.
- **Context-bound access tokens.** A third party still receives a token scoped
  to one grant and one Context, exchanged server-side against its client
  credentials.
- **Root-email privacy.** The root `User.email` — which for a Google-created
  account *is* the Google address — is never part of a context payload.
- **Third-party disclosure rules.** No client application can observe how a
  session was authenticated. `serializeUser()` strips `googleId` from every
  response, so the Google subject is invisible even to the identity owner's own
  API calls.

The system therefore has one new way in and no new way out.

---

## 5. Important Implementation Code

### 5.1 Google credential verification — `apps/api-backend/src/lib/googleIdToken.ts`

```ts
export async function verifyGoogleIdToken(
  credential: string,
): Promise<GoogleIdentity> {
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new ApiError(503, "Google sign-in is not configured");
  }

  client ??= new OAuth2Client(clientId);

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    payload = ticket.getPayload();
  } catch {
    throw unauthorized("Invalid Google credential");
  }

  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw unauthorized("Google account has no verified email");
  }

  return { sub: payload.sub, email: payload.email };
}
```

- **Purpose:** convert an untrusted string from the browser into a trusted
  provider identity, or refuse.
- **Input:** the raw `credential` produced by Google Identity Services.
- **Validation:** signature against Google's rotating public certificates,
  issuer, expiry, and `aud === GOOGLE_CLIENT_ID`; then an explicit
  `email_verified` check.
- **Output:** `{ sub, email }` — the only two claims the rest of the system ever
  sees; every other Google claim is discarded at this boundary.
- **Why it matters:** the next step matches an existing SecuriSelf account **by
  email**, so accepting an unverified Google email would be an account-takeover
  path. `verifyIdToken` does not check `email_verified`, which makes the
  explicit check the security hinge of the feature. Confining verification to
  one module also gives the system a single, narrow trust boundary.

### 5.2 Account resolution and session issuance — `apps/api-backend/src/modules/auth/auth.service.ts`

```ts
export async function loginWithGoogle(
  input: GoogleAuthInput,
): Promise<AuthResult> {
  const identity = await verifyGoogleIdToken(input.credential);
  const email = identity.email.toLowerCase();

  let user = await prisma.user.findUnique({
    where: { googleId: identity.sub },
  });

  if (!user) {
    const existing = await prisma.user.findUnique({ where: { email } });
    user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { googleId: identity.sub },
        })
      : await prisma.user.create({ data: { email, googleId: identity.sub } });
  }

  return { user: serializeUser(user), token: signSessionToken(user.id) };
}
```

- **Purpose:** map a verified provider identity onto exactly one SecuriSelf
  `User`, and issue the platform's standard session for it.
- **Input:** a verified `{ sub, email }`.
- **Transformation:** email normalised to lower case (matching registration
  behaviour, so case differences cannot fork an account); resolution attempted
  by `googleId` first, then by email; linking performed as an `update` on the
  existing row; creation limited to `email` and `googleId`.
- **Output:** the standard `AuthResult` — a `serializeUser()` projection plus a
  `signSessionToken(user.id)` bearer token.
- **Why it matters:** this is where P1, P2 and P3 are either preserved or lost.
  The `update` branch is the reason an existing owner keeps their `User.id`, and
  therefore their Vault, Contexts, Applications, Grants and audit history; the
  `create` branch is the reason a new Google-backed account begins empty, with
  `passwordHash`, `legalFirstName` and `legalLastName` all `null`. Returning
  `signSessionToken()` rather than a new session type is what makes Google a
  third producer of an existing contract instead of a parallel mechanism.

### 5.3 Provider identity is never disclosed — `apps/api-backend/src/lib/serializers.ts`

```ts
export type PublicUser = Omit<User, "passwordHash" | "googleId">;

/** Strips credentials (password hash, Google subject) before a user is returned. */
export function serializeUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, googleId: _googleId, ...rest } = user;
  return rest;
}
```

- **Purpose:** guarantee at the type level that credential-bearing fields cannot
  leave the backend.
- **Input:** a full Prisma `User` row.
- **Transformation:** structural removal of `passwordHash` and `googleId`.
- **Output:** `PublicUser`, the only user shape any response carries.
- **Why it matters:** the Google subject is a stable cross-service identifier.
  Because every authentication response, `/auth/me` response and consent-screen
  payload passes through this one function, the linkage between a SecuriSelf
  account and a Google account is not observable through the API at all —
  neither by a third-party application nor by the owner's own client. Enforcing
  it as an `Omit<>` type rather than a deletion at each call site means a future
  response cannot reintroduce the field without a compile error.

### 5.4 Shared session and destination handling — `apps/securiself-platform/src/features/auth/hooks.ts`

```ts
export function resolveReturnTo(returnTo?: string | null): string {
  if (!returnTo) return routes.console.root;
  // Reject "//host" and "/\host", which browsers treat as protocol-relative.
  if (!returnTo.startsWith("/") || /^\/[/\\]/.test(returnTo)) {
    return routes.console.root;
  }
  return returnTo;
}

function useAuthSuccessHandler() {
  /* … */
  return useCallback(
    (result: AuthResponse, returnTo?: string | null) => {
      setSession(result.token, result.user);
      queryClient.setQueryData(queryKeys.auth.me, result.user);
      router.replace(resolveReturnTo(returnTo));
    },
    [setSession, queryClient, router],
  );
}

export function useGoogleSignIn(returnTo?: string | null) {
  const onSuccess = useAuthSuccessHandler();
  return useMutation({
    mutationFn: (credential: string) => signInWithGoogle(credential),
    onSuccess: (result) => onSuccess(result, returnTo),
  });
}
```

- **Purpose:** make the post-authentication behaviour of the Google path
  identical to the password path by construction.
- **Input:** the backend `AuthResponse`, plus the `returnTo` query parameter
  read from the sign-in URL.
- **Validation:** only internal absolute paths are honoured; anything else —
  including absolute external URLs and the protocol-relative `//host` and
  `/\host` forms — collapses to `/console`.
- **Output:** a persisted session, a primed `auth.me` cache, and a navigation to
  either the parked authorize request or the console fallback.
- **Why it matters:** P4 is a purely client-side property — the `returnTo` value
  never reaches the backend. Sharing one handler between `useLogin`,
  `useRegister` and `useGoogleSignIn` means the consent journey cannot survive
  one authentication path and break on the other, and the open-redirect guard
  cannot protect one path while leaving the other exposed.

### 5.5 Obtaining the credential — `apps/securiself-platform/src/features/auth/components/google-sign-in-button.tsx`

```ts
window.google.accounts.id.initialize({
  client_id: clientId,
  ux_mode: "popup",
  auto_select: false,
  cancel_on_tap_outside: true,
  callback: ({ credential }) => {
    if (!credential) { /* dismissal is surfaced, backend is not called */ return; }
    mutate(credential, {
      onError: (error) => {
        toast.error(
          error instanceof ApiError ? error.message : "Unable to sign in with Google",
        );
      },
    });
  },
});

container.replaceChildren();
window.google.accounts.id.renderButton(container, { /* … */ text, width: 320 });
...
if (!clientId) return null;
```

- **Purpose:** render Google's own button and hand the resulting credential to
  the SecuriSelf session mutation.
- **Input:** the build-time public client ID and the `returnTo` prop forwarded
  from the sign-in screen.
- **Transformation:** GIS is initialised in popup mode; the callback forwards
  the credential and only the credential.
- **Output:** either a SecuriSelf session mutation, or a user-visible error with
  no request issued.
- **Why it matters:** three properties are load-bearing. `ux_mode: "popup"` with
  a callback means **no server-side redirect URI is required**, which is why the
  Sprint added no callback route. `container.replaceChildren()` prevents a
  duplicated button under React StrictMode's double effect, since Google — not
  React — owns those DOM children. `if (!clientId) return null` makes the entire
  feature opt-in, which is what allows an unconfigured build to present the
  unchanged pre-Sprint-4 authentication screen.

---

## 6. Validation Strategy

Sprint 4 was validated with four layers of evidence. They are not
interchangeable: each proves something the others structurally cannot, and each
has a boundary it cannot cross. **No end-to-end browser automation is part of
Sprint 4's evidence.**

### 6.1 Backend integration tests (Vitest + supertest + real PostgreSQL)

Run the real Express application, real Prisma against a real Neon PostgreSQL
database, real bcrypt and real JWTs. *Appropriate because* P1, P3 and P5 are
database-shaped claims: "no duplicate account" is meaningful only as an
assertion on `user.count()` against a real unique index, and "the payload
contains no root email" is meaningful only against a real serialised response.
*Bounded by* the single narrow point that requires live Google infrastructure —
`verifyGoogleIdToken` is stubbed in the account-behaviour suite so that account
resolution can be exercised deterministically.

### 6.2 Frontend unit and component tests (Vitest + Testing Library + jsdom)

*Appropriate because* P4 is a client-side property: the `returnTo` value never
reaches the backend, so no backend test can cover it. These tests establish that
the credential is posted to the correct endpoint with the correct body, that the
resulting session is written to the same store and the same `localStorage` key
as password authentication, and that the destination is resolved by the same
guarded function. *Bounded by* the environment: `fetch` and `next/navigation`
are stubbed, and nothing here involves real Google Identity Services or real
rendering.

### 6.3 Regression suites and static quality

The pre-existing backend privacy, security, ownership, lifecycle, audit,
localization, locale, functional and grants suites, plus the platform
`auth-store`, `api-client`, `context-rules`, `schemas`, `context-label` and
grants suites, were executed unmodified. *Appropriate because* their value is
precisely that they are the **unchanged** pre-Sprint-4 behaviour: they are the
direct evidence that the disclosure path did not move. Accessibility (axe), ESLint
and `tsc --noEmit` complete the static and non-functional picture.

### 6.4 Manual runtime validation with real Google authentication

Executed by hand against the running application with a real Google Cloud OAuth
client configured in both `apps/api-backend/.env` and
`apps/securiself-platform/.env.local`. *Appropriate — and necessary — because*
it is the only layer that crosses the boundary the others cannot: Google's own
account chooser, a genuinely Google-signed ID token, and its acceptance by the
backend after signature and `aud` verification against a real client. *Bounded
by* observability: row counts, what `serializeUser` omits and what the database
actually stored are not visible on a screen and are never claimed from one.

### 6.5 Automated evidence versus manual evidence

The two classes answer different questions and must not be conflated:

- **Automated evidence is asserted.** It states machine-checked propositions
  about row counts, status codes, payload contents and forbidden strings; it is
  repeatable, and it is what will detect a future regression.
- **Manual runtime evidence is observed.** It establishes that the composed
  system behaves as intended with the real provider, and it is limited to what
  appeared on screen in one hand-executed session. It cannot run in CI and it
  will not catch a regression.

Each covers the other's blind spot: only the automated layer can assert what the
database and the payloads contain; only the manual layer reaches Google.

During validation, two coverage gaps in the delivered suites were identified and
closed with additional automated tests — Vault preservation across account
linking (backend), and the composition of credential exchange, session storage
and `returnTo` restoration (platform). Both are part of the results below.

---

## 7. What the Tests Covered

The following describes the properties each group of tests establishes, not the
files it lives in.

**Valid Google authentication produces a usable SecuriSelf session.** The
backend suite drives `POST /api/v1/auth/google` and then uses the returned token
against `GET /api/v1/auth/me` and an authenticated `PUT /api/v1/vault`. Both
succeed, establishing P2: the token is accepted by the unchanged session
middleware and authorises a write, so it is the platform's ordinary session and
not a restricted variant.

**Invalid authentication authenticates nobody and creates nothing.** Three
distinct failure modes are asserted, which matters because they fail at three
different layers. A request with no `credential` is rejected by schema
validation with `400` and never reaches the verifier. A credential the verifier
rejects yields `401` *and* `user.count() === 0`, establishing that failure
occurs before any persistence. Against the **real** `google-auth-library`
verifier with no mock in place, a string that is not a Google-signed ID token
yields a `401` `ApiError`, and an unconfigured `GOOGLE_CLIENT_ID` yields `503` —
so the rejection path is verified against Google's real implementation, not a
stub.

**A new Google identity creates an empty account.** The account is created with
the email lower-cased exactly as registration does, and with `passwordHash`,
`legalFirstName` and `legalLastName` all `null`. The last two are the
significant assertions: they are the only root `User` fields any Context
category (LEGAL) can disclose to a third party, so the test establishes that
Google profile data does not enter the disclosable surface.

**A returning Google identity resolves to the same account.** Two consecutive
sign-ins with the same `sub` return an identical `user.id` and leave
`user.count() === 1`, establishing that resolution is idempotent and that repeat
authentication is not an account-creation path.

**Duplicate accounts are prevented and existing accounts preserved.** A password
account is registered and given a Context; Google then signs in on the same
email in a different letter case. The test asserts the same `user.id`,
`user.count() === 1`, that the Context is still listed through the
Google-issued token, and that the original password login still returns `200`.
This single test carries P1 and a large part of P3, and its case-difference
detail is what proves normalisation rather than coincidence.

**Vault contents survive account linking.** A password account writes a full
Vault; Google then signs in on the same email; `GET /api/v1/vault` **through the
Google-issued token** returns the same field values, and `googleId` is absent
from the response. This completes P3 — linking updates one row and replaces no
data — and simultaneously confirms the serialisation guarantee of §5.3.

**Contextual disclosure is unchanged for Google accounts.** A Google-created
account builds a Vault and SOCIAL and LEGAL Contexts, then runs the full
authorize → code → token → `/api/v1/profiles/me` chain. The category allow-lists
are honoured and the root email string is absent from the payload. Combined with
the unmodified privacy, security and ownership suites, this is the evidence for
P5: the disclosure model behaves identically regardless of how the session was
obtained.

**Existing authentication is unaffected.** The full backend and platform suites
run unmodified, and the linking test contains an explicit password-login
assertion after Google has been linked to the account — so the second front door
demonstrably did not close the first.

**Frontend authentication behaviour.** `resolveReturnTo()` returns a full
PrymeCab consent URL verbatim, falls back to `/console` for `null`, `undefined`
and `""`, and collapses `https://evil.test/…`, `//evil.test/…` and
`/\evil.test/…` to `/console`; because both authentication paths call it, this
covers both. The button component initialises Google Identity Services with the
configured client ID, forwards `returnTo`, and hands the callback credential to
the SecuriSelf session mutation. The composition test then closes the gap
between those halves without mocking the intermediate layers: the request goes
to `/api/v1/auth/google` as a `POST` with body `{ credential }` and **no**
`Authorization` header; the token and user land in the auth store, in
`localStorage` under `securiself.auth` and in the `auth.me` cache; and
`router.replace` is called with the full consent URL verbatim. Its two companion
cases establish the fallback to `/console` when no `returnTo` was present, and
that a backend `401` leaves no token in the store, nothing in `localStorage`,
and triggers no navigation.

---

## 8. Results

All results are those recorded in `sprint4-validation.md` for the execution of
**2026-08-23**, run from the repository root against the project's isolated Neon
PostgreSQL test database.

| Evidence | Command | Result |
| --- | --- | --- |
| Backend integration | `pnpm test:backend` | **67/67 passed** (11 files, 204.15s) |
| Platform unit/component | `pnpm test:platform` | **55/55 passed** (14 files, 2.87s) |
| Accessibility | `pnpm test:a11y` | **2/3 passed, 1 failed** (31.5s) — pre-existing |
| Lint | `pnpm lint` | **3/3 workspaces successful** |
| Type check | `pnpm check-types` | **3/3 workspaces successful** |
| Manual runtime validation | executed by hand, real Google client | 8 screenshots, both journeys observed |

**Skipped tests: 0** across every suite executed.

**Backend.** The pre-Sprint-4 baseline was 9 test files; Sprint 4 contributes
`google-auth.test.ts` (9 tests) and `google-id-token.test.ts` (2 tests). Every
pre-existing suite — privacy, security, ownership, lifecycle, audit,
localization, locale, functional, grants-idempotent — passes unchanged. The
interpretation is twofold: the Google-specific behaviour holds against a real
database, and the disclosure and privacy behaviour that the Sprint was required
to leave alone is demonstrably unchanged.

**Platform.** The baseline was 11 test files; Sprint 4 contributes
`return-to.test.ts` (3 tests) and the Google button component suite, and
validation adds `google-session.test.tsx` (3 tests). The interpretation is that
the client-side half of the journey — credential exchange, session persistence,
cache priming and guarded navigation — is asserted rather than assumed, which
matters because `returnTo` is never visible to the backend.

**Accessibility, and the bound on it.** One `serious` `color-contrast` violation
on `/console/grants-revoke-dialog` fails the gate. This is **not** a Sprint 4
defect, and that is verified rather than asserted: the scan summary produced by
this run was compared field by field against the summary recorded before the
Sprint (generated `2026-08-19T01:22:38Z`). All 15 routes are present in both; for
every route, `critical`, `serious`, `moderate`, `minor`, `incomplete`,
`testResult` and `blockingRuleIds` are identical; the only difference between the
two files is `generatedAt`. The two routes Sprint 4 modified — `sign-in` and
`sign-up` — scan `pass` with 0 serious and 0 critical both before and after. The
bound: this scan ran against a build with no Google client ID, so the Google
button area was not present on the page and these passes say nothing about it.

**Static quality.** ESLint and `tsc --noEmit` succeed across all three
workspaces, so the new backend module, the new component and the modified hooks
are type-checked and lint-clean.

**Manual runtime validation.** Both journeys were executed against the real
provider and recorded as eight screenshots (§9, §10). This result is
observational and is reported as such: it establishes that the composed system
works with a genuine Google credential, and it asserts nothing about state that
was not on screen.

**Overall.** Every executed automated test passes. The single failure is a
pre-existing accessibility violation on a route this Sprint did not touch,
proven identical to the pre-Sprint baseline.

---

## 9. Manual Runtime Validation

The manual session was run against the real application with a real Google Cloud
OAuth 2.0 Web client — authorised JavaScript origin `http://localhost:3000`, no
authorised redirect URI — with the same client ID configured in both the backend
and the platform environment. Two journeys were executed.

**Journey A — an existing SecuriSelf owner authenticating with Google inside the
PrymeCab consent flow.** The prerequisite was an email/password account whose
address matched the Google account, already holding at least one Context, so
that account linking and Context preservation would be distinguishable from
account creation. The following was observed, in one unbroken browser session:

- PrymeCab, unauthenticated, offering **Login with SecuriSelf** and displaying
  no profile.
- After clicking it, the SecuriSelf `/sign-in` page with the email field, the
  password field, the submit button, an **or** divider and Google's own rendered
  button — with the address bar showing
  `localhost:3000/sign-in?returnTo=%2Foauth%2Fauthorize%3Fclient_id%3D…`, so the
  authorization request was parked before authentication.
- The Google-hosted account chooser at
  `accounts.google.com/v3/signin/accountchooser?…`, headed *Choose an account —
  to continue to Securiself*, presented as a popup rather than a full-page
  redirect.
- After account selection, the browser on `localhost:3000/oauth/authorize?…` —
  the original request — showing the consent screen with the account's
  **pre-existing** Context, the redirect target
  `http://localhost:3001/api/auth/callback`, and the Deny / Approve controls. The
  application chose this destination; the browser was not navigated by hand.
- With the Context selected, the **What PrymeCab will receive** preview showing
  the SOCIAL allow-list only: `display_name`, `username`, `pronouns`,
  `avatar_url`.
- After approval, PrymeCab rendering that context-bound profile, with the
  **Login with SecuriSelf** button gone.

Two inferences are warranted from Journey A, and only two. First, `returnTo`
survived a full round trip through a real external provider — the destination
after authentication was the original `/oauth/authorize` request, not `/console`
(**P4**). Second, the Contexts offered on the consent screen were those that
existed *before* Google was ever used, which is consistent with the account
having been linked rather than duplicated (**P1**, **P3**) and inconsistent with
a freshly created account, which would have presented an empty list. The
authoritative evidence for non-duplication remains the `user.count() === 1`
assertion in the backend suite: a row count is not visually observable.

**Journey B — a Google identity SecuriSelf had never seen.** Signed out, and
navigating **directly** to `/sign-in` with no `returnTo`, a second Google account
was used. The observed result was the authenticated Console at
`localhost:3000/console` reporting **Identity completion 0%** ("0 of 5 vault
fields set"), **Contexts 0** and **Clients 0**, and a Vault whose legal first
name, legal last name, display name, gender and avatar URL fields were all empty.

Journey B supports two claims. The destination was `/console`, confirming the
fallback branch of `resolveReturnTo` under real conditions and forming the
counterpart to Journey A. And the empty legal-name fields are the visible
consequence of the decision not to persist Google profile claims: the Google
account certainly carries a name, and it is not in the Vault. Since
`legalFirstName` and `legalLastName` are the only root fields the LEGAL category
can disclose, this is the observable half of P5 — the disclosable surface
remains owner-controlled. The corresponding database-level fact (that the row
was created with those columns `null`) is established by the backend assertion,
not by the screenshot.

No session token, authorization code, client secret, password field or
environment variable is visible in any capture.

---

## 10. Visual Evidence

The eight figures below are the manual runtime evidence for Sprint 4, captured
by hand from the running application. They are observations, not test output;
none is generated by any automated suite. Capture conditions and the states
deliberately left uncaptured are documented in `docs/sprint4/images/README.md`.

**Figure 1 — `images/01-prymecab-login-entry.png`.**
*The PrymeCab simulator in its unauthenticated state, before any authentication.*
The reader should observe that the third-party application offers only **Login
with SecuriSelf** and displays no profile card. This figure supplies provenance
for Figures 2–6: it establishes that the journey originates in the third-party
application, so the `returnTo` visible in Figure 2 was produced by the
application rather than typed by hand.

**Figure 2 — `images/02-securiself-signin-google-option.png`.**
*The SecuriSelf sign-in page reached by redirect, showing Google's rendered button
alongside the unchanged email/password form, with the parked authorization
request visible in the address bar.*
Three things are simultaneously observable: the button carries Google's own mark
and typography, so Google Identity Services loaded and rendered it in the real
application; the email and password fields remain unchanged beside it, so Google
was added as an alternative rather than a replacement; and the address bar
carries `returnTo=` containing the encoded `/oauth/authorize` request with
PrymeCab's `client_id`. This supports the claim that the consent request is
captured *before* authentication (**P4**) and that email/password access is
untouched.

**Figure 3 — `images/03-google-account-chooser.png`.**
*Google's own account chooser, served from `accounts.google.com`, in a popup
window.*
The reader should observe the origin and the popup presentation. This is the only
evidence in the package that the provider is genuinely Google rather than a local
stand-in, and the popup form is the visible consequence of `ux_mode: "popup"` —
which is why the integration requires an authorised JavaScript origin but no
authorised redirect URI.

**Figure 4 — `images/04-returnto-consent-restored.png`.**
*The original authorization request, restored after real Google authentication,
listing the account's pre-existing Context.*
The address bar reads `/oauth/authorize?…`, not `/console`: `returnTo` survived a
real round trip through Google (**P4**), and the session issued from a Google
credential was accepted by the unchanged consent screen (**P2**). The Context
shown existed before Google was used, which is consistent with linking rather
than duplication (**P1**, **P3**); the authoritative non-duplication evidence is
the backend row-count assertion, since a row count cannot be seen.

**Figure 5 — `images/05-context-selection-payload-preview.png`.**
*The consent screen with a SOCIAL Context selected and the outgoing payload
preview expanded.*
The preview contains only `display_name`, `username`, `pronouns` and
`avatar_url`. The reader should observe what is absent: no root email, no
`legal_first_name`, no `legal_last_name`, no `document_id`, and nothing
Google-derived — neither the Google display name visible in Figure 3 nor the
Google profile picture. This supports the claim that contextual disclosure is
identical regardless of how the session was obtained (**P5**).

**Figure 6 — `images/06-prymecab-context-disclosure.png`.**
*PrymeCab rendering the context-filtered profile at the end of the journey.*
Compared directly against Figure 1, the same application now holds exactly one
context-bound profile — display name, category badge and allow-listed fields —
and the **Login with SecuriSelf** button is gone. The reader should observe that
PrymeCab displays the *context*, never the person. This supports the central
Sprint claim: a session established from a real Google credential drives the
unchanged consent → grant → filtered-disclosure chain, and the third party
receives the same payload it would under password authentication (**P2**,
**P5**).

**Figure 7 — `images/07-new-google-user-console.png`.**
*The Console of an account just created from a Google identity SecuriSelf had
never seen, reached with no `returnTo` present.*
Two observations: the destination is `/console`, the fallback branch and the
counterpart to Figure 4 (**P4**); and the summary tiles read **Identity
completion 0%**, **Contexts 0**, **Clients 0**. A Google-created account
therefore begins with nothing it could disclose.

**Figure 8 — `images/08-new-google-user-empty-vault.png`.**
*The Vault of that newly created account, with every root field unset.*
The legal first name and legal last name fields are empty although the Google
account carries a name. Because those two fields are the only root `User` fields
the LEGAL category can disclose to a third party, their emptiness is the visible
evidence that Google profile claims did not become third-party-disclosable data
(**P5**). That the columns are literally `null` in the database is established by
the backend assertion, not by this image.

---

## 11. Sprint Outcome

**The Sprint 4 objective is supported by the evidence.**

Everything SecuriSelf itself does with a Google identity — verify the credential
against Google's certificates and the configured audience, enforce
`email_verified`, resolve it to exactly one account, link rather than duplicate,
preserve the Vault and Contexts across that link, issue the existing session
token, restore `returnTo` into the PrymeCab consent journey, and disclose nothing
beyond the selected Context — is demonstrated by executed automated tests at the
backend and platform layers, against a real database and with the rejection path
verified against Google's real verifier implementation.

The one boundary those layers structurally cannot cross — a genuinely
Google-signed credential obtained from Google's own account chooser and accepted
by the backend — was executed by hand against the running application and
recorded as eight screenshots. That evidence is observational and stands
alongside the automated assertions rather than replacing them.

Taken together, the two classes support the following conclusion: **Google
authentication can be introduced as an upstream authentication mechanism while
SecuriSelf continues to operate its existing account model, its existing session
model and its existing contextual disclosure architecture unchanged.** The
platform now has a second way in and no new way out. The account remains a single
`User` row; the session remains one `JWT_SECRET`-signed bearer token validated by
one middleware; the third party still receives a context-filtered payload
obtained through consent, an authorization code, a server-side token exchange and
a context-bound access token — and cannot determine how the owner authenticated.

This conclusion is scoped to what was evaluated. It is **not** a claim of
production readiness, of certified OAuth 2.0 / OpenID Connect compliance, of
complete security or privacy assurance, or of full accessibility compliance.
None of those was assessed.

---

## 12. Boundaries and Remaining Gaps

### 12.1 Validation boundaries

These are limits of the evidence, not known defects.

- **Automated tests cannot accept a real Google token.** Minting a
  Google-signed ID token requires live Google infrastructure, so the acceptance
  path is stubbed at `verifyGoogleIdToken` in the automated suites. The
  rejection path *is* verified against the real `google-auth-library`. The
  acceptance path is covered only by observation (§9).
- **The manual evidence is not reproducible in CI.** It is a single
  hand-executed session, by one operator, against one Google Cloud client. It
  demonstrates the composed system with the real provider; it will not detect a
  future regression. Only the automated suites will.
- **Google credential edge cases are unexercised.** One valid credential was
  accepted end to end. Nothing tested an unverified Google email against the
  `email_verified` enforcement (the check exists in code but has no test), an
  expired or replayed ID token, or Google's certificate rotation.
- **Concurrency is unexercised.** Two simultaneous first-time sign-ins for the
  same email were not tested; the `email` and `googleId` unique indexes are the
  only protection on that path.
- **The Google sign-in area is not covered by the accessibility scan.** The axe
  run executed against a build without a Google client ID, so the button was not
  on the page. Google renders its button inside a cross-origin iframe, which axe
  cannot audit in any case; only the surrounding container, divider and status
  text belong to SecuriSelf.

### 12.2 Functional gaps

- **No account unlinking.** Once linked, `googleId` can only be cleared directly
  in the database; there is no "disconnect Google" endpoint or UI.
- **Google-side email changes are not synchronised.** After the first link, the
  SecuriSelf `email` remains authoritative and subsequent matching is by
  `googleId`.

### 12.3 Intentionally deferred

- **No Prisma migration file.** The repository has never carried a migration
  history — there is no `prisma/migrations/` directory and no
  `_prisma_migrations` table — and both the backend test setup and the
  environment preparation script synchronise the schema with `prisma db push`.
  Introducing a single migration here would create a partial history that
  `prisma migrate deploy` would fail to apply. The equivalent DDL for
  `User.googleId` is recorded in `sprint4-implementation.md` §2. Baselining the
  history is a deployment prerequisite, not a Sprint 4 defect.

### 12.4 Explicitly not a Sprint 4 defect

The `color-contrast` violation on `/console/grants-revoke-dialog` is
pre-existing. A route-by-route comparison against the accessibility summary
recorded before the Sprint shows identical results on all 15 routes, differing
only in the generation timestamp, and the two routes Sprint 4 modified pass with
0 serious and 0 critical findings both before and after.

---

## 13. Next Iteration — Developer Documentation

The next iteration should produce **SecuriSelf developer documentation** for
third-party integrators. This was part of the intended project scope, and it
follows logically from the state the system has now reached rather than being an
arbitrary next topic.

The reasoning is that the integration surface is now complete enough to be worth
documenting, and stable enough that documenting it will not immediately
invalidate the document. Application registration with one-time client secrets
exists; the authorization request, Context selection and consent decision exist;
authorization-code issuance and server-side token exchange exist; the
context-filtered profile endpoint exists; grant revocation exists; multilingual
disclosure with per-field fallback exists; and, as of this Sprint, the identity
owner can reach that entire chain through either of two authentication
mechanisms. PrymeCab already demonstrates the full integration in working code,
so the reference material has a validated example to describe. What is missing is
not capability but explanation: a third-party developer currently has to read the
simulator's source to learn the contract.

The next iteration should therefore document, at minimum and only where the
current system supports it:

- registering a third-party application and what the registration returns;
- the `client_id` and the **one-time** `client_secret`, including that the secret
  is stored only as a hash and is shown once, and the secret-rotation path;
- secure handling of client credentials, and why the token exchange is
  server-side only;
- redirect URI configuration and how it is matched;
- initiating the authorization request against `/oauth/authorize`, with its
  required parameters;
- what the identity owner sees: Context selection, the outgoing-payload preview,
  and approval or denial;
- authorization-code handling, including single use;
- the server-side token exchange at `POST /api/v1/oauth/token`;
- calling `GET /api/v1/profiles/me` with the context-bound access token;
- the shape of the context-filtered response and the per-category allow-lists,
  with an explicit statement of what is never returned;
- `Accept-Language` support and the per-field fallback behaviour;
- the relevant error responses and their meaning for an integrator;
- access revocation from the owner's Grants view, what the third party observes
  afterwards, and the re-authorization path;
- a complete, runnable PrymeCab-style integration example.

This is the logical next iteration. None of the documentation above exists yet,
and producing it is a documentation task rather than a change to the implemented
system.
