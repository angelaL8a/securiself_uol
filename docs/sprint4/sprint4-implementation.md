# Sprint 4 — Google Authentication

## 1. Sprint 4 objective

### Problem

Before this Sprint, the only way to reach a SecuriSelf root identity was
`POST /api/v1/auth/register` / `POST /api/v1/auth/login` with an email and a
password. That is a hard onboarding requirement for an identity platform whose
whole value starts *after* the account exists (Vault → Contexts → consent →
filtered disclosure), and it forces the identity owner to create yet another
password.

### Intent

Add "Sign in / Sign up with Google" as an **alternative front door** to the same
account model, under three constraints:

1. It must issue the **existing** SecuriSelf session (the `JWT_SECRET`-signed
   bearer token consumed by `authUser`), not a second session mechanism.
2. It must never produce a second account for a person who already has one, so
   Vault, Contexts, Applications, Grants and Activity stay attached to a single
   `User` row.
3. It must not touch the contextual disclosure model. Google profile data must
   not become third-party-visible data, and `/api/v1/profiles/me` filtering must
   be byte-for-byte unchanged.

---

## 2. What was implemented

### Persistence

| Change | File |
| --- | --- |
| `User.googleId String? @unique` — the Google `sub` claim, nullable so email/password accounts are untouched, unique so one Google account maps to at most one SecuriSelf account | `apps/api-backend/prisma/schema.prisma` |

`User.passwordHash` was already `String?`, so a Google-only account needs no
schema change to exist without a password.

**No migration folder was added.** This repository has never had one: there is
no `prisma/migrations/` directory and no `_prisma_migrations` table, and both
`apps/api-backend/tests/global-setup.ts` and `tests/e2e/setup/prepare-e2e.ts`
synchronise the schema with `prisma db push`. Introducing a single migration
here would create a partial history that `prisma migrate deploy` would fail to
apply against the existing databases. The schema change is applied with
`pnpm --filter api-backend prisma:push`; the equivalent DDL is:

```sql
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
```

### Backend

| Change | File |
| --- | --- |
| `verifyGoogleIdToken()` — verifies the Google OIDC ID token and additionally enforces `email_verified` | `src/lib/googleIdToken.ts` (new) |
| `loginWithGoogle()` — account resolution + linking, returns the standard `AuthResult` | `src/modules/auth/auth.service.ts` |
| `POST /api/v1/auth/google` | `src/modules/auth/auth.routes.ts` |
| `googleAuthSchema` (`{ credential: string }`) | `src/modules/auth/auth.schemas.ts` |
| `GOOGLE_CLIENT_ID` (optional) added to the validated env | `src/config/env.ts` |
| `serializeUser` now also strips `googleId` | `src/lib/serializers.ts` |
| dependency `google-auth-library` (Google's official Node client) | `package.json` |

### Frontend (`securiself-platform`)

| Change | File |
| --- | --- |
| `<GoogleSignInButton>` — loads Google Identity Services, renders the official button, handles credential / cancellation / script failure | `src/features/auth/components/google-sign-in-button.tsx` (new) |
| `signInWithGoogle(credential)` API call | `src/features/auth/api.ts` |
| `useGoogleSignIn(returnTo)` — reuses the *same* success handler as password auth | `src/features/auth/hooks.ts` |
| `resolveReturnTo()` — extracted from the inline `returnTo` logic so both auth paths share one implementation | `src/features/auth/hooks.ts` |
| Button mounted on both auth screens | `sign-in-form.tsx`, `sign-up-form.tsx` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `.env.example`, `.env.local` |

No new state store, no new session concept, no new route, no server-side
callback endpoint.

---

## 3. How it works

### End-to-end flow

```
/sign-in or /sign-up  (Google button rendered by accounts.google.com/gsi/client)
   │
   │ user picks a Google account in the Google popup
   ▼
GIS callback → { credential: <Google-signed OIDC ID token> }
   │
   │ POST http://localhost:8080/api/v1/auth/google  { credential }
   ▼
verifyGoogleIdToken(credential)
   ├─ signature verified against Google's public certs
   ├─ iss / aud (= GOOGLE_CLIENT_ID) / exp verified
   └─ email_verified === true enforced explicitly
   │
   ▼
loginWithGoogle → account resolution
   ├─ googleId match                → returning Google user
   ├─ verified-email match          → LINK googleId to the existing account
   └─ neither                       → create a new account (email + googleId only)
   │
   ▼
signSessionToken(user.id)           ← the SAME JWT helper used by /auth/login
   │
   ▼
{ status: "success", user, token }  ← the SAME response shape as /auth/login
   │
   ▼
useAuthSuccessHandler → auth-store.setSession() → localStorage "securiself.auth"
                      → queryClient.setQueryData(auth.me)
                      → router.replace(resolveReturnTo(returnTo))
```

### Connection to the existing session and account model

The Google endpoint is a *third producer* of the existing `AuthResult`
(`{ user: PublicUser, token: string }`) — the other two being register and
login. It calls `signSessionToken()`, so the token is indistinguishable from a
password-issued one and is validated by the unchanged `authUser` middleware.
Nothing downstream (Vault, Contexts, Clients, OAuth consent, Grants, Activity)
knows or cares how the session was obtained.

Account identity stays the `User` row. Because linking is done by **updating**
the existing row rather than creating a new one, every foreign key
(`Context.userId`, `Application.userId`, `Grant.userId`, `AccessToken.userId`,
`AuditLog.userId`) keeps pointing at the same record — there is no data
migration step and nothing can be orphaned.

### Why Contexts and third-party disclosure are unaffected

Three deliberate properties:

1. **Nothing in the disclosure path was modified.** `filterProfile()`,
   `contextRules.ts`, the Context allow-lists, the `/oauth/*` endpoints and
   `/api/v1/profiles/me` are untouched by this Sprint.
2. **No Google profile claim is persisted.** Only `sub` and `email` are read
   from the ID token. `name` / `given_name` / `family_name` / `picture` are
   discarded. This matters specifically because `user.legalFirstName` and
   `user.legalLastName` are the *only* root `User` fields any context category
   can disclose (LEGAL). Auto-filling them from Google would silently convert
   Google profile data into third-party disclosure data; they remain
   owner-controlled through the Vault.
3. **The Google subject never leaves the backend.** `serializeUser()` strips
   `googleId` alongside `passwordHash`, so it appears in no API response —
   neither to the identity owner nor to a client application.

A Google-authenticated account therefore starts with **zero** Contexts, exactly
like an email/password account, and discloses nothing until the owner creates a
Context and approves a consent request.

### Success, cancellation and failure states

| State | Behaviour |
| --- | --- |
| Success | Session stored, `auth.me` cache primed, redirect to `returnTo` or `/console` |
| Google popup dismissed | GIS fires no callback; the page stays usable. If a callback arrives without a `credential`, a "Google sign-in was cancelled" toast is shown |
| GIS script fails to load | Inline `role="alert"`: *"Google sign-in is unavailable right now. Use your email and password."* |
| Invalid / tampered / expired credential | Backend `401` → toast with the backend message; **no** user row is created |
| Missing `credential` in the request body | Zod → `400`; the verifier is never called |
| `GOOGLE_CLIENT_ID` not configured | Backend `503`; the frontend renders no Google button at all, so email/password is unaffected |

---

## 4. Important code

### 4.1 `apps/api-backend/src/lib/googleIdToken.ts`

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

- **Receives**: the raw `credential` string from Google Identity Services.
- **Validates**: signature against Google's rotating public certs, issuer,
  audience (`aud` must equal our client ID — this is what stops a token minted
  for a *different* application being replayed here), expiry, and then
  `email_verified`.
- **Produces**: `{ sub, email }` — deliberately the only two claims the rest of
  the system ever sees.
- **Why it matters**: `verifyIdToken` does **not** check `email_verified`. Since
  the next step matches an existing SecuriSelf account **by email**, accepting an
  unverified Google email would be an account-takeover path. The explicit check
  is the security hinge of the whole feature. Isolating verification in one
  module also makes it the single stubbable boundary in tests.

### 4.2 `apps/api-backend/src/modules/auth/auth.service.ts`

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

- **Receives**: `{ credential }` (already Zod-validated).
- **Changes**: at most one row — either a `googleId` set on an existing `User`,
  or one new `User`. Never a second row for the same person.
- **Produces**: the same `AuthResult` as `loginUser()`/`registerUser()`.
- **Why it matters**: this is the anti-duplication and data-preservation rule.
  Lookup by `googleId` first makes repeat sign-ins stable even if the person
  later changes their SecuriSelf email; the email fallback links rather than
  creates. `prisma.user.create` passes **only** `email` and `googleId` — the
  absence of `legalFirstName`/`legalLastName` here is the code-level guarantee
  that Google data cannot reach a LEGAL disclosure.

### 4.3 `apps/securiself-platform/src/features/auth/hooks.ts`

```ts
export function resolveReturnTo(returnTo?: string | null): string {
  if (!returnTo) return routes.console.root;
  // Reject "//host" and "/\host", which browsers treat as protocol-relative.
  if (!returnTo.startsWith("/") || /^\/[/\\]/.test(returnTo)) {
    return routes.console.root;
  }
  return returnTo;
}

export function useGoogleSignIn(returnTo?: string | null) {
  const onSuccess = useAuthSuccessHandler();
  return useMutation({
    mutationFn: (credential: string) => signInWithGoogle(credential),
    onSuccess: (result) => onSuccess(result, returnTo),
  });
}
```

- **Receives**: the `returnTo` query parameter, which the PrymeCab → SecuriSelf
  consent flow sets to the full `/oauth/authorize?client_id=…&redirect_uri=…`
  URL via `signInWithReturn()`.
- **Validates**: only internal absolute paths are honoured; external and
  protocol-relative targets fall back to `/console`.
- **Produces**: the post-auth destination, and a mutation that shares
  `useAuthSuccessHandler` with `useLogin`/`useRegister`.
- **Why it matters**: `returnTo` preservation is not re-implemented for Google —
  it is literally the same function and the same success handler, so the consent
  flow cannot drift between the two auth paths. Extracting `resolveReturnTo`
  from the previously inline expression also made the open-redirect rule
  directly unit-testable (and tightened it: the old `startsWith("/")` check
  accepted `//evil.test`).

### 4.4 `apps/securiself-platform/src/features/auth/components/google-sign-in-button.tsx`

```ts
const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
...
window.google.accounts.id.initialize({
  client_id: clientId,
  ux_mode: "popup",
  auto_select: false,
  cancel_on_tap_outside: true,
  callback: ({ credential }) => {
    if (!credential) {
      toast.error("Google sign-in was cancelled");
      return;
    }
    mutate(credential, { onError: (error) => { /* toast */ } });
  },
});

container.replaceChildren();
window.google.accounts.id.renderButton(container, { /* … */ });
...
if (!clientId) return null;
```

- **Receives**: `returnTo` and the button label variant; the client ID from the
  build-time public env var.
- **Produces**: the Google-rendered button, and on success the credential handed
  to `useGoogleSignIn`.
- **Why it matters**: three properties are load-bearing. `ux_mode: "popup"` with
  a `callback` means **no server-side redirect URI is required** — only an
  authorised JavaScript origin. `container.replaceChildren()` prevents a
  duplicated button under React StrictMode's double effect (Google owns those
  DOM children, React does not). `if (!clientId) return null` makes the whole
  feature opt-in: an unconfigured environment renders the unchanged
  email/password screen.

---

## 5. Testing and evidence

All results below were produced by executing the commands shown, on
`2026-08-23`, against the project's isolated Neon PostgreSQL test database.

### 5.1 Backend integration suite — `pnpm test:backend`

```
Test Files  11 passed (11)
     Tests  66 passed (66)
  Duration  185.28s
```

Baseline before Sprint 4 was 9 files / 56 tests; the 10 new tests are the two
files below. All pre-existing suites (`privacy`, `security`, `ownership`,
`lifecycle`, `audit`, `localization`, `functional`, `grants-idempotent`,
`locale`) still pass unchanged — this is the no-regression evidence for
contextual disclosure and privacy filtering.

**`tests/google-auth.test.ts` (8 tests, all passed).** Runs the real Express
app, real Prisma/PostgreSQL, real JWT and the real OAuth-like consent flow; only
`verifyGoogleIdToken` is stubbed, because it is the one component that requires
a live Google-signed token.

| Test | What it demonstrates |
| --- | --- |
| creates a SecuriSelf account for a new Google user | **New Google user auth.** Also asserts `passwordHash === null`, `legalFirstName === null`, `legalLastName === null` — i.e. Google profile data did not populate the LEGAL-disclosable fields — and that the email is lower-cased like registration |
| never returns the Google subject to the client | `googleId` and `passwordHash` are absent from the API response |
| returns the SAME account for a returning Google user | **Returning Google user auth**; asserts `user.count() === 1` after two sign-ins |
| links an existing email/password account instead of duplicating it | **Existing-account handling.** Registers a password user, creates a Context, signs in with Google on the same (differently-cased) email → same `user.id`, `user.count() === 1`, the Context is still listed via the Google-issued token, and the original password login still works |
| rejects an invalid Google credential | **Invalid authentication rejection** → `401`, and `user.count() === 0` (no account is created on a failed verification) |
| rejects a request without a credential | Zod `400`; the verifier is never reached |
| issues a session token accepted by the existing session middleware | **Session preservation**: the Google token authenticates `GET /api/v1/auth/me` and an authenticated `PUT /api/v1/vault` write |
| discloses only context fields through the full consent flow | **No disclosure/privacy regression for Google accounts**: full authorize → code → token exchange → `/api/v1/profiles/me` for a SOCIAL and a LEGAL context, asserting the category allow-lists and that the Google-derived root email string appears nowhere in the payload |

**`tests/google-id-token.test.ts` (2 tests, all passed).** Exercises the real
verifier with no mock: unconfigured `GOOGLE_CLIENT_ID` → `503`; a credential
that is not a Google-signed ID token → `401` `ApiError`. The second test
performs a real HTTPS fetch of Google's public certificates.

### 5.2 Platform unit/component suite — `pnpm test:platform`

```
Test Files  13 passed (13)
     Tests  49 passed (49)
```

Baseline before Sprint 4 was 11 files / 45 tests.

| Test file | What it demonstrates |
| --- | --- |
| `src/features/auth/return-to.test.ts` (3 tests) | **`returnTo` flow**: a full PrymeCab consent URL (`/oauth/authorize?client_id=…&redirect_uri=…&response_type=code&scope=identity_context`) survives verbatim; absent `returnTo` falls back to `/console`; `https://evil.test/…`, `//evil.test/…` and `/\evil.test/…` are all rejected. Because `useGoogleSignIn` and `useLogin` share this function, it covers both auth paths |
| `src/features/auth/components/google-sign-in-button.test.tsx` (4 tests) | The button initialises GIS with the configured client ID and renders; the credential from Google's callback is handed to the SecuriSelf session mutation; `returnTo` is forwarded to `useGoogleSignIn`; a callback with no credential shows the cancellation toast and does **not** call the backend |

### 5.3 Accessibility — `pnpm test:a11y`

```
  1 failed
  2 passed (26.6s)
```

The single failure is **pre-existing and unrelated to Sprint 4**: a `serious`
`color-contrast` violation on the Grants *revoke dialog*
(`#6b6b6b` on `#070709`, 3.77:1). This is verifiable rather than asserted —
the accessibility summary committed at `HEAD` (generated `2026-08-19`, before
this Sprint) records exactly the same result, and a route-by-route comparison of
the pre-Sprint and post-Sprint scans differs only in the `generatedAt`
timestamp:

| Route | Committed baseline (2026-08-19) | After Sprint 4 |
| --- | --- | --- |
| `sign-in` | pass, 0 serious | pass, 0 serious |
| `sign-up` | pass, 0 serious | pass, 0 serious |
| `/console/grants-revoke-dialog` | **fail**, 1 serious `color-contrast` | **fail**, 1 serious `color-contrast` |
| all 12 other routes | pass, 0 serious | pass, 0 serious |

The two routes this Sprint actually modified — `sign-in` and `sign-up` — still
scan clean.

### 5.4 Static quality — `pnpm test:quality`

```
Tasks:    3 successful, 3 total   (lint)
Tasks:    3 successful, 3 total   (check-types)
QUALITY EXIT=0
```

ESLint and `tsc --noEmit` pass across all three workspaces
(`api-backend`, `securiself-platform`, `prymecab-simulator`).

### 5.5 Automated vs. manual

**Automated** (executed, results above): everything in 5.1–5.4.

**Not covered by any automated suite:** nothing above touches real Google
infrastructure. Producing a genuine Google-signed ID token requires a real
Google Cloud OAuth client and an interactive Google account, so the following
fall outside every result on this page and are covered instead by the manual
runtime validation recorded in `sprint4-validation.md` §7:

- rendering of the real Google-hosted button and popup;
- signature/`aud` verification against a real Google token (the *rejection* path
  is verified in 5.1; the *acceptance* path is stubbed in automated tests).

Everything downstream of `verifyGoogleIdToken` — account resolution, linking,
session issuance, disclosure behaviour — is covered by real, executed tests.

---

## 6. Result

**Objective achieved, with one bounded validation gap.**

Evidenced by the executed suites:

- Google authentication exists end-to-end across persistence, backend and
  frontend, using Google's official mechanisms (Google Identity Services in the
  browser, `google-auth-library` on the server).
- Email/password authentication is unchanged and still passes its full suite.
- Google auth issues the existing SecuriSelf session JWT; no parallel session
  system was introduced.
- Duplicate accounts are prevented and existing user-owned data is preserved,
  proven by an assertion on `user.count()` plus a Context read through the
  Google-issued token.
- Invalid credentials are rejected with `401` and create nothing.
- `returnTo` — including the PrymeCab consent URL — is preserved through the
  same code path as password auth.
- The contextual disclosure model is provably unchanged: no file in the
  disclosure path was modified, and the full privacy/security/ownership suites
  plus a Google-account-specific consent-flow test all pass.

### Remaining limitations

1. **The Google-token acceptance path is stubbed in automated tests.** It cannot
   be automated without a real Google client ID and an interactive Google
   account; it is covered by the manual runtime validation recorded in
   `sprint4-validation.md` §7.
2. **No Prisma migration file.** The repository has no migration history and
   uses `prisma db push`; the schema change was applied that way and the
   equivalent DDL is recorded in §2. A deployment that expects
   `prisma migrate deploy` would need the history to be baselined first.
3. **The Google button is absent from the accessibility run**, because
   `.env.e2e` sets no `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. The axe scans of `sign-in`
   and `sign-up` therefore say nothing about the Google sign-in area.
4. **The button's internals are not auditable by axe.** Google renders it inside
   a cross-origin iframe; its accessibility is Google's implementation. Only the
   surrounding container, divider and status text are ours.
5. **No account unlinking.** Once linked, `googleId` can only be cleared
   directly in the database. There is no "disconnect Google" UI.
6. **Email changes on the Google side are not synchronised.** After the first
   link, the SecuriSelf `email` stays authoritative and matching is by
   `googleId`.

---

## 7. Required Google Cloud configuration

Nothing in this section is committed to the repository. All values are secrets
or environment-specific.

### 7.1 Credentials to create

In [Google Cloud Console](https://console.cloud.google.com/):

1. Create (or select) a project, e.g. `SecuriSelf`.
2. **APIs & Services → OAuth consent screen** (Google Auth Platform):
   - User type: **External**
   - App name: `SecuriSelf`, plus a support email and a developer contact email
   - Scopes: the defaults `openid`, `email`, `profile` are sufficient — no
     additional scope is requested by this implementation
   - While the app is in **Testing**, add your own Google account under
     **Test users**, otherwise sign-in is refused
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: e.g. `SecuriSelf Web (local)`

You need **only** the *Client ID*. The client secret is **not** used: this
implementation verifies an ID token rather than exchanging an authorisation
code, so no secret ever needs to exist in the repo or in any `.env`.

### 7.2 Authorised JavaScript origins

Add exactly these for local development (the SecuriSelf platform port):

```
http://localhost:3000
```

`http://localhost:3001` (the PrymeCab simulator) is **not** required — the
Google button is only mounted on the SecuriSelf sign-in and sign-up pages.

### 7.3 Authorised redirect URIs

**None.** The button uses `ux_mode: "popup"` with a JavaScript callback, so
Google never redirects the browser back to a server endpoint. Leave the
"Authorised redirect URIs" list empty.

### 7.4 Environment variables to fill

The client ID is a single value that must be written into **two** files, and the
two must match — the browser uses it to request the token and the backend uses
it as the expected `aud` when verifying that token.

| Variable | File | Example value |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | `apps/api-backend/.env` | `GOOGLE_CLIENT_ID="1234567890-abc123def456.apps.googleusercontent.com"` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `apps/securiself-platform/.env.local` | `NEXT_PUBLIC_GOOGLE_CLIENT_ID=1234567890-abc123def456.apps.googleusercontent.com` |

(The example above is a placeholder in Google's format, not a real credential.)

Both keys are already present, documented and empty in
`apps/api-backend/.env.example` and
`apps/securiself-platform/.env.example`.

Nothing else changes: `NEXT_PUBLIC_API_URL=http://localhost:8080`,
`CORS_ORIGIN=http://localhost:3000,http://localhost:3001` and `PORT=8080` are
already correct for this flow.

### 7.5 Applying the change and verifying

```bash
pnpm --filter api-backend exec prisma db push   # adds User.googleId
pnpm dev                                        # backend :8080, platform :3000, PrymeCab :3001
```

Then open `http://localhost:3000/sign-in`. If `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is
empty the Google button is intentionally hidden; the Next.js dev server must be
restarted after changing it, because `NEXT_PUBLIC_*` values are inlined at build
time.
