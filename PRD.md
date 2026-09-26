# SecuriSelf — Product Requirements Document (PRD)

| Field | Value |
| --- | --- |
| **Product** | SecuriSelf |
| **Document type** | Product Requirements Document |
| **Status** | Living document (aligned with current monorepo implementation) |
| **Version** | 1.5 |
| **Last updated** | 2026-09-12 |
| **Owner** | SecuriSelf product / engineering |
| **Audience** | Product, engineering, academic reviewers, stakeholders |
| **Related apps** | `apps/api-backend`, `apps/securiself-platform`, `apps/prymecab-simulator` |
| **Sprint 2 product source** | Candidate B `6cb9016014a4a1165c34cfad51f50bdd4b787c07` (`sprint2-final` archival package is documentation-only) |

---

## 1. Executive summary

**SecuriSelf** is an API-first **contextual identity and privacy** platform. Users keep a private root identity (the **Vault**) and create purpose-bound **Contexts** (`PROFESSIONAL`, `LEGAL`, `SOCIAL`, `PRIVATE`). Third-party applications request access through an **OAuth-like authorization-code** flow; after consent, they receive a **context-bound access token** and a **filtered profile payload** that exposes only the attributes allowed by the approved context.

The product is intentionally framed as an **academic OAuth-like simulation**, not a certified OAuth 2.0 / OpenID Connect provider. It demonstrates data minimization, consent, grant revocation, and auditability for identity sharing.

### 1.1 One-sentence pitch

> Share the right slice of your identity with each app — never the whole vault.

### 1.2 Product pillars

1. **Ownership** — The user controls the root identity and every contextual projection.
2. **Minimization** — Apps receive only fields allowed by the consented context.
3. **Consent** — Access requires an explicit approve/deny decision.
4. **Accountability** — Grants, profile reads, revocations, and failed exchanges are audited.
5. **API-first** — The console and demo clients are consumers of a versioned REST API.

---

## 2. Problem statement

### 2.1 Problem

Most applications request or store broad identity profiles. Once shared, users rarely control *which attributes* each app can see, or *for which purpose*. That creates over-collection, weak purpose binding, and poor audit trails when access should be revoked.

### 2.2 Opportunity

Provide a clear mental model and working system where:

- Root identity stays private.
- Contextual identities are purpose-scoped.
- Third parties authenticate via a familiar consent + token flow.
- Profile responses are filtered by context rules.
- Users can inspect activity and revoke access.

### 2.3 Target outcome

A demonstrable, testable platform that proves contextual identity sharing end-to-end: from vault and context management, through client registration and consent, to filtered profile consumption by a third-party app (PrymeCab simulator).

---

## 3. Goals and non-goals

### 3.1 Goals (in scope for v1)

| ID | Goal | Success signal |
| --- | --- | --- |
| G1 | Users can register, sign in, and manage a private Vault | Auth + vault APIs and console screens work |
| G2 | Users can create, update, and delete contextual identities with category rules | Context CRUD + validation enforced |
| G3 | Users can register third-party clients and rotate secrets | Client APIs return secrets once; rotation works |
| G4 | Users can approve/deny OAuth-like consent for a specific context | Authorize + decision endpoints + consent UI |
| G5 | Clients can exchange a code for a context-bound access token | Token endpoint issues opaque tokens |
| G6 | Clients receive only context-allowed profile fields | Privacy filter verified by tests |
| G7 | Users can view audit activity for grants, reads, revokes, failures | Audit log API + Activity UI |
| G8 | Users can revoke grants (and active tokens) via console UI and API | `/console/grants` + revoke endpoint; repeated revoke is idempotent |
| G9 | A third-party simulator (PrymeCab) demonstrates the consumer path | Login → consent → filtered profile |
| G10 | Three-layer automated evaluation: backend integration, browser E2E, accessibility | Root scripts `test:backend`, `test:e2e`, `test:a11y` pass |
| G11 | Users can sign in / sign up with Google as an alternative front door to the same account | `POST /api/v1/auth/google` issues the standard session; one `User` row per person |
| G12 | Third-party developers can integrate from in-product documentation, without SecuriSelf or PrymeCab source access | Authenticated `/console/docs` covers registration → profile read, including failure and revocation paths |

### 3.2 Non-goals (explicitly out of scope for v1)

| ID | Non-goal | Notes |
| --- | --- | --- |
| NG1 | Certified OAuth 2.0 / OIDC compliance | Academic simulation only |
| NG2 | Federated IdP other than Google (Apple, GitHub, enterprise SSO) | Google Sign-In is in scope (FR-AUTH-10…16); no other provider in v1 |
| NG3 | Public (unauthenticated) developer docs site | In-console Developer Docs at `/console/docs` are in scope (FR-DOC-01…08); a public portal is not |
| NG5 | Webhooks / event delivery | Deferred |
| NG6 | Platform / PrymeCab chrome i18n | UI chrome stays English; localisable field variants (`pronouns`, `jobTitle`, `shortBio`) are in scope (FR-CTX-08) |
| NG7 | Payments, billing, or marketplace | Not part of the product |
| NG8 | SMS / email verification / password reset | Not implemented |
| NG9 | Admin / multi-tenant RBAC | Single end-user role model |
| NG10 | Production hardening at hyperscale | Local / academic deployment focus |
| NG11 | Certified WCAG / assistive-technology user studies | Automated axe + targeted keyboard/semantic checks only |
| NG12 | Multi-browser E2E matrix (Firefox/WebKit) | Chromium Playwright project in v1 |

---

## 4. Personas and roles

SecuriSelf does not implement admin RBAC. Personas are product roles, not schema enums.

### 4.1 Identity owner (end user)

**Who:** A person who wants to share different facets of identity with different apps.

**Needs:**

- Keep legal/root data private by default.
- Maintain several contextual identities.
- Approve or deny app access with clear field preview.
- See what happened (audit) and cut off access (revoke).

**Primary surfaces:** SecuriSelf Platform console + consent screen.

### 4.2 Third-party application (client developer)

**Who:** An app (e.g. PrymeCab) that needs a minimal identity profile for a specific purpose.

**Needs:**

- Register (or be registered) with `client_id`, secret, and redirect URI.
- Run authorization-code exchange.
- Call `/api/v1/profiles/me` with a Bearer access token.
- Rely on stable, context-filtered JSON fields.

**Primary surfaces:** Console Developer Docs (`/console/docs`); client credentials + API; PrymeCab simulator as reference consumer.

### 4.3 Operator / developer

**Who:** Person running the monorepo locally or deploying for demos/evaluation.

**Needs:** Env config, Prisma schema sync, tests against PostgreSQL, clear ports and CORS.

---

## 5. Product overview

### 5.1 System context

```text
┌─────────────────────┐     session JWT      ┌──────────────────────┐
│ securiself-platform │ ───────────────────► │     api-backend      │
│  (Next.js console)  │                      │  Express + Prisma    │
│  :3000              │ ◄── REST /api/v1 ─── │  PostgreSQL          │
└──────────┬──────────┘                      │  :8080               │
           │                                 └──────────▲───────────┘
           │ consent UI (/oauth/authorize)              │
           │                                            │ opaque access token
           ▼                                            │
┌─────────────────────┐                                 │
│ prymecab-simulator  │ ── code exchange / profile ─────┘
│  (third-party demo) │
│  :3001              │
└─────────────────────┘
```

**Google front door (optional).** Google Identity Services runs browser-side on the platform sign-in/sign-up screens (popup `ux_mode`, no server-side redirect URI) and returns an OIDC ID token. The platform posts it to `POST /api/v1/auth/google`; the API verifies it against Google's public certificates and returns the **same** session JWT as password login. Google is never contacted by the simulator, and no Google claim reaches the disclosure path.

### 5.2 Monorepo structure

| Path | Product responsibility |
| --- | --- |
| `apps/api-backend` | Source of truth: identity, OAuth-like flow, profiles, grants, audit |
| `apps/securiself-platform` | User console, marketing landing, consent UI |
| `apps/prymecab-simulator` | Third-party consumer demo (“luxury rides” + Login with SecuriSelf) |
| `packages/*` | Reserved for shared libraries (currently empty) |

**Tooling:** pnpm workspaces + Turborepo; Node.js `>=18`; TypeScript across apps.

### 5.3 Core domain concepts

| Concept | Definition |
| --- | --- |
| **Vault** | Private root identity on the `User` record (email, legal names, display name, gender, avatar). Never returned wholesale via profile API. |
| **Context** | Purpose-bound identity projection with category-specific fields and validation rules. |
| **Application (client)** | Registered third-party app with `clientId`, hashed secret, and redirect URI. |
| **Grant** | Permission binding `(user, application, context)` with default scope `identity_context`. |
| **Authorization code** | Short-lived, single-use code issued after consent approval. |
| **Access token** | Opaque token bound to exactly one application and one context. |
| **Audit log** | Append-only-style record of security-relevant identity events. |

### 5.4 Context categories

| Category | Intent | Required fields (create/update) | Fields exposed via `/profiles/me` |
| --- | --- | --- | --- |
| `SOCIAL` | Community / social presence | `displayName` **or** `username` | `display_name`, `username`, `pronouns` (default `hidden`), `avatar_url` |
| `PROFESSIONAL` | Work identity | `displayName` | `display_name`, `pronouns`, `job_title`, `company`, `short_bio`, `avatar_url` |
| `LEGAL` | Legal / KYC-style identity | `documentId` | `legal_first_name`, `legal_last_name`, `document_id`, `avatar_url` |
| `PRIVATE` | Minimal / conservative identity | *(none beyond category)* | `display_name`, `pronouns`, `avatar_url` |

**Localisable fields:** `pronouns`, `jobTitle`, and `shortBio` store an English/default scalar plus optional `*I18n` JSON `{ en?, es? }`. PROFESSIONAL discloses all three; SOCIAL discloses `pronouns`; PRIVATE discloses `pronouns` (`shortBio` may be stored, not disclosed); LEGAL has none. `internalName`, `displayName`, `username`, `company`, `documentId`, and `avatarUrl` are language-independent. `GET /profiles/me` substitutes already-allowed localisable values from `Accept-Language` (`en` / `es`; region tags collapse to the primary subtag) without changing the category allow-list or the authorised context. Per-field fallback: requested variant → English/default → remaining available variant.

**Hard privacy rules:**

- Root **email** is never returned by `/api/v1/profiles/me`.
- Legal names and `document_id` are only exposed under the `LEGAL` context.
- Access tokens cannot read a different context than the one bound at issuance.

---

## 6. User journeys

### 6.1 Journey A — Create and shape identity

1. User signs up with email/password (and optional legal name fields), or with **Sign up with Google** when a Google client ID is configured (Journey F).
2. User updates Vault root fields.
3. User creates one or more Contexts (e.g. Social for community apps, Professional for work tools).
4. For categories with localisable fields, the user can enter English and Spanish variants (`English | Español`) without changing language-independent fields.
5. User reviews contexts in the console.

**Acceptance:** Context category rules reject invalid payloads; vault updates persist; session remains authenticated.

### 6.2 Journey B — Register a client application

1. User opens Clients → Register.
2. Submits name + redirect URI.
3. System shows `clientId` and one-time `clientSecret`.
4. User can later rotate the secret (new secret shown once).

**Acceptance:** Secrets are never listed on subsequent GETs; only bcrypt hashes are stored.

### 6.3 Journey C — Consent and filtered access (happy path)

1. Third-party app redirects user to SecuriSelf authorize URL with `client_id`, `redirect_uri`, and (via consent UI) a chosen `contextId`.
2. Authenticated user reviews consent and approves or denies.
3. On approve: authorization code is issued; browser redirects to client callback.
4. Client exchanges code + secret for access token.
5. Client calls `/api/v1/profiles/me` and receives filtered JSON.
6. Audit log records grant and subsequent profile reads.

**Acceptance:** Deny produces no usable code; approve binds token to that context only.

### 6.4 Journey D — Revoke and audit

1. Authenticated owner opens `/console/grants` and identifies the application–Context Grant (application, Context, active/revoked state).
2. Owner confirms revocation in the console UI (API `POST /api/v1/grants/:id/revoke` remains available).
3. Active access tokens for that application–Context permission become unusable.
4. Grants remains on the revoked Grant and presents an accessible post-revocation continuation with **View Activity** plus guidance to verify PrymeCab (no automatic redirect).
5. Activity view shows `ACCESS_REVOKED`; Grants and Activity use the same primary Context `displayName` (distinct internal name is secondary only).
6. Owner checks PrymeCab and sees that previous SecuriSelf access is no longer available and that re-authorisation is required.
7. A repeated revoke of the same Grant succeeds without creating another `ACCESS_REVOKED` or changing the original `revokedAt`.

### 6.5 Journey E — PrymeCab demo

1. User opens PrymeCab simulator landing page.
2. Clicks “Login with SecuriSelf”.
3. Completes consent on the platform for a chosen context.
4. Callback exchanges code; PrymeCab shows the filtered profile only.
5. User can switch **EN** / **ES**; PrymeCab forwards `Accept-Language` and shows matching localised values for fields already allowed by the authorised context.
6. After Journey D revocation, PrymeCab shows a plain-language **access-lost** state for confirmed `access_rejected` (not labelled as a generic temporary error).

### 6.6 Journey F — Google sign-in front door

1. User reaches `/sign-in` or `/sign-up` — directly, or redirected from PrymeCab's consent link with a `returnTo` query parameter carrying the full `/oauth/authorize?...` URL.
2. User clicks the Google-rendered button and picks an account in the Google popup.
3. The platform posts the returned ID token to `POST /api/v1/auth/google`.
4. The API verifies the token (signature, `iss`, `aud`, `exp`, `email_verified`) and resolves the account: existing `googleId` → same account; verified-email match → link `googleId` to the existing account; otherwise create a new account with `email` + `googleId` only.
5. The API returns the standard `{ user, token }`; the platform stores the session exactly as for password login and redirects to `returnTo` (validated) or `/console`.

**Acceptance:** No duplicate `User` row is ever created; a linked account keeps its Vault, Contexts, Clients, Grants and Activity; a new Google account starts with zero Contexts and an empty Vault; a failed verification creates no account; `returnTo` resumes the consent journey unchanged.

### 6.7 Journey G — Integrate from the Developer Docs

1. Signed-in developer opens **Developer Docs** from the Console sidebar (between Clients and Grants).
2. Overview area presents the end-to-end authorization sequence and the credential / authorization-artifact lifecycle table.
3. Developer registers an application (one click from the docs) and follows the areas in order: Application Setup → Authorization → Token Exchange → Profile API.
4. Developer consults Contexts & Localization, Grants & Revocation, Errors and the PrymeCab reference integration for payload shapes and failure handling.

**Acceptance:** Every integration stage — registration, authorization request, callback, server-side token exchange, profile read, localisation, revocation and errors — is documented in the Console; no stage requires reading repository source; only placeholder credentials are rendered.

---

## 7. Functional requirements

Requirements use MoSCoW priority: **M**ust / **S**hould / **C**ould / **W**on’t (v1).

### 7.1 Authentication and session

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| FR-AUTH-01 | Users can register with email + password | M | Returns user (no password hash) + session JWT |
| FR-AUTH-02 | Users can log in with email + password | M | Same session shape as register |
| FR-AUTH-03 | Authenticated users can fetch `/auth/me` | M | Session JWT required |
| FR-AUTH-04 | Passwords are stored hashed (bcrypt) | M | Never plaintext |
| FR-AUTH-05 | Session JWT secret and TTL are configurable | M | `JWT_SECRET`, `JWT_EXPIRES_IN` |
| FR-AUTH-06 | Platform persists session in client store | M | Zustand + `localStorage` |
| FR-AUTH-07 | Console routes are guarded when unauthenticated | M | Auth guard redirects to sign-in |
| FR-AUTH-08 | Password reset / email verification | W | Out of scope v1 |
| FR-AUTH-09 | Federated login providers other than Google (Apple, GitHub, SSO) | W | Out of scope v1 (NG2) |
| FR-AUTH-10 | Users can sign in / sign up with Google | M | `POST /api/v1/auth/google` with a Google Identity Services ID token (`{ credential }`); same `{ user, token }` shape as login |
| FR-AUTH-11 | Google ID tokens are verified before any account action | M | Signature against Google certs, `iss`, `aud` = `GOOGLE_CLIENT_ID`, `exp`, plus explicit `email_verified === true`; failure → `401` and no user row created |
| FR-AUTH-12 | Google sign-in never creates a duplicate account | M | Resolve by `googleId`; else link `googleId` onto the existing verified-email account; else create. Vault/Contexts/Clients/Grants/Activity stay on one `User` |
| FR-AUTH-13 | Google sign-in issues the existing session, not a second session mechanism | M | Same signing helper and `authUser` middleware; no server-side callback route |
| FR-AUTH-14 | Google sign-in is optional per environment | M | Unset `GOOGLE_CLIENT_ID` → API `503`; unset `NEXT_PUBLIC_GOOGLE_CLIENT_ID` → button not rendered; email/password unaffected |
| FR-AUTH-15 | `returnTo` is preserved identically across both auth paths | M | Shared `resolveReturnTo`; internal absolute paths only — absolute URLs, `//host` and `/\host` fall back to `/console` |
| FR-AUTH-16 | Google cancellation / unavailability degrade safely | S | Cancelled callback → toast; GIS script failure → inline `role="alert"` pointing to email/password |

### 7.2 Vault (root identity)

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| FR-VLT-01 | User can read vault fields | M | `GET /api/v1/vault` |
| FR-VLT-02 | User can update vault fields | M | `PUT /api/v1/vault` |
| FR-VLT-03 | Vault is never exposed as a whole via profile API | M | Privacy invariant |
| FR-VLT-04 | Platform provides a vault management form | M | `/console/vault` |

### 7.3 Contexts

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| FR-CTX-01 | User can create a context with a category | M | Categories enum enforced |
| FR-CTX-02 | User can list, read, update, delete own contexts | M | Ownership checks → 403/404 as appropriate |
| FR-CTX-03 | Category validation rules are enforced | M | See §5.4 |
| FR-CTX-04 | Contexts support optional fields: username, pronouns, avatar, job, company, bio, documentId | M | Schema fields |
| FR-CTX-05 | Platform UI for list/create/edit/delete | M | Console routes |
| FR-CTX-06 | Landing page previews sample payloads per category | S | Marketing education |
| FR-CTX-07 | Multiple contexts of the same category | S | Allowed unless product later constrains |
| FR-CTX-08 | Localisable context fields (`pronouns`, `jobTitle`, `shortBio`) | M | Scalar English/default plus `*I18n` `{ en?, es? }`; console English/Español tabs; `Accept-Language` on `/profiles/me` with per-field fallback; language does not change the category allow-list |

### 7.4 Clients (applications)

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| FR-CLT-01 | User can register a client with name + redirect URI | M | Returns secret once |
| FR-CLT-02 | User can list and view owned clients without secrets | M | |
| FR-CLT-03 | User can rotate client secret | M | New secret shown once |
| FR-CLT-04 | Client secrets stored as bcrypt hashes | M | |
| FR-CLT-05 | Platform UI for register/detail/credentials | M | |
| FR-CLT-06 | Redirect URI must match on authorize and token exchange | M | Security |

### 7.5 OAuth-like authorization

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| FR-OAU-01 | `GET /oauth/authorize` returns consent-screen data for authenticated user | M | Session JWT |
| FR-OAU-02 | `POST /oauth/authorize/decision` supports approve/deny | M | Approve → `redirectTo` with code |
| FR-OAU-03 | Authorization codes are single-use and TTL-bound | M | `AUTH_CODE_TTL_MINUTES` |
| FR-OAU-04 | Codes stored hashed (SHA-256), not plaintext | M | |
| FR-OAU-05 | `POST /oauth/token` exchanges code for access token with client credentials | M | `grant_type=authorization_code` |
| FR-OAU-06 | Access tokens are opaque, hashed at rest, TTL-bound | M | `ACCESS_TOKEN_TTL_HOURS` |
| FR-OAU-07 | Each access token is bound to one application and one context | M | Core invariant |
| FR-OAU-08 | Platform hosts consent UI at `/oauth/authorize` | M | |
| FR-OAU-09 | Failed token exchanges are auditable | M | `TOKEN_EXCHANGE_FAILED` |
| FR-OAU-10 | Full OIDC discovery, PKCE, refresh tokens, scopes beyond `identity_context` | W | Academic subset only |

### 7.6 Profiles (third-party consumption)

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| FR-PRF-01 | `GET /api/v1/profiles/me` requires Bearer access token | M | Not session JWT |
| FR-PRF-02 | Response includes only fields allowed for the token’s context category | M | Filter table §5.4 |
| FR-PRF-03 | Email never appears in profile responses | M | |
| FR-PRF-04 | Legal identity fields only for `LEGAL` | M | |
| FR-PRF-05 | Successful reads produce audit `PROFILE_READ` | M | |
| FR-PRF-06 | Invalid/revoked/expired tokens rejected | M | 401 |
| FR-PRF-07 | Optional `Accept-Language` selects among already-allowed localisable fields | M | `en`/`es`; missing, `*`, or unsupported → English/default then remaining variant; does not change authorised context or allow-list |

### 7.7 Grants

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| FR-GRN-01 | System creates/updates grant on successful authorization | M | Unique `(user, application, context)`; re-authorisation clears `revokedAt` |
| FR-GRN-02 | User can list grants | M | `GET /api/v1/grants` (includes application/context display fields) |
| FR-GRN-03 | User can revoke a grant | M | Also revokes active tokens; repeated revoke is idempotent (`200`, no duplicate audit) |
| FR-GRN-04 | Revocation produces audit `ACCESS_REVOKED` | M | Exactly one event on first transition to revoked |
| FR-GRN-05 | Console Grants UI | M | `/console/grants`: inspect active/revoked Grants and revoke through the UI |
| FR-GRN-06 | Post-revocation continuation | M | After successful UI revoke: accessible **View Activity** action and concise PrymeCab verification guidance; revoked Grant remains inspectable; no auto-redirect |
| FR-GRN-07 | Consistent Context labelling (Grants ↔ Activity) | M | Primary user-facing Context label is `displayName`; distinct `internalName` is secondary metadata only |
| FR-GRN-08 | Grant timestamp label semantics | M | UI labels `Grant.createdAt` as **First authorised** (first authorisation only; not a latest/re-authorisation timestamp) |

### 7.8 Audit

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| FR-AUD-01 | Record `ACCESS_GRANTED` on successful consent | M | |
| FR-AUD-02 | Record `PROFILE_READ` on profile access | M | |
| FR-AUD-03 | Record `ACCESS_REVOKED` on grant revoke | M | |
| FR-AUD-04 | Record `TOKEN_EXCHANGE_FAILED` on failed exchange | M | |
| FR-AUD-05 | Support `BLOCKED_ANOMALY` action type in schema | C | Reserved for future anomaly blocking |
| FR-AUD-06 | User can list own audit logs newest-first | M | `GET /api/v1/audit-logs` |
| FR-AUD-07 | Logs may include IP, user agent, metadata JSON | S | When available |
| FR-AUD-08 | Platform Activity page displays audit events | M | `/console/activity` |
| FR-AUD-09 | Activity Context labels match Grants primary naming | M | Same `displayName` primary rule as FR-GRN-07 for Context-bearing events |

### 7.9 Platform (console & marketing)

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| FR-PLT-01 | Public landing explaining Vault → Contexts → Consent → Payload | M | `/` |
| FR-PLT-02 | Sign-in and sign-up pages | M | |
| FR-PLT-03 | Console overview dashboard | M | `/console` |
| FR-PLT-04 | Settings for account email + logout | M | `/console/settings` |
| FR-PLT-05 | Typed API client + TanStack Query hooks | M | Architecture constraint |
| FR-PLT-06 | Public (unauthenticated) docs site | W | In-console Developer Docs are §7.12 |
| FR-PLT-07 | Chrome i18n | W | UI chrome stays English (NG6); field variants are FR-CTX-08 |
| FR-PLT-08 | Google sign-in button on both auth screens | M | Rendered by Google Identity Services; hidden entirely when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is unset (FR-AUTH-14) |

### 7.10 PrymeCab simulator

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| FR-PRY-01 | Marketing-style third-party landing | M | Demo narrative |
| FR-PRY-02 | “Login with SecuriSelf” starts authorize flow | M | |
| FR-PRY-03 | Callback exchanges code and stores access token (cookie) | M | BFF pattern |
| FR-PRY-04 | Authenticated view shows filtered profile from API | M | |
| FR-PRY-05 | Logout clears session cookie | M | |
| FR-PRY-06 | Configurable client id/secret/redirect/authorize URL | M | Env vars |
| FR-PRY-07 | Plain-language access-lost state | M | Confirmed `access_rejected` maps to access-lost copy (previous access unavailable; re-authorisation required); network/generic failures are not labelled as revocation |
| FR-PRY-08 | EN/ES profile language control | M | Forwards `Accept-Language` on `/api/user`; default English |

### 7.12 Developer documentation

Documentation adds no runtime behaviour: the API backend (`filterProfile`, OAuth service, `requireBearerToken`) remains the enforcement point, and the docs describe it.

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| FR-DOC-01 | Authenticated Developer Docs in the Console | M | `/console/docs` behind the Console `AuthGuard`; sidebar entry **Developer Docs** between Clients and Grants |
| FR-DOC-02 | Nine route-backed documentation areas | M | Overview, Application Setup, Authorization, Token Exchange, Profile API, Contexts & Localization, Grants & Revocation, Errors, Reference Integration (§8.4); statically prerendered; unknown area → 404 |
| FR-DOC-03 | Full integration contract documented | M | Registration and secret rotation, browser/server credential boundary, authorize parameters, callback, JSON token exchange, `/profiles/me` envelope, per-category payloads, `Accept-Language`, Grants/revocation, error tables per stage, PrymeCab reference |
| FR-DOC-04 | Persistent docs navigation | M | Sticky area bar (`aria-current="page"` plus non-colour active marker); sticky per-area section list for multi-section areas; Previous/Next sequence links |
| FR-DOC-05 | Credential and authorization-artifact lifecycle | M | Table of session credential, `client_id`, `client_secret`, authorization code, `access_token`: holder, browser exposure, stage, purpose; server-only values stated in text ("Never"), not colour alone |
| FR-DOC-06 | Explicit code → token causality | M | Nine-step sequence naming the actor and carried artifact per step; states that `/profiles/me` rejects an authorization code |
| FR-DOC-07 | Context payload examples computed, not transcribed | M | Built with `buildProfilePayload` / `getPrivacyMatrix` over `CONTEXT_CATEGORIES`, the same functions as the consent preview |
| FR-DOC-08 | Safe, accessible code samples | M | Placeholder credentials only (`scs_client_example`, `<SECURISELF_CLIENT_SECRET>`); every copy button has a distinct accessible name; wide code regions keyboard-scrollable |

### 7.11 Platform health and operations

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| FR-OPS-01 | `GET /health` returns `{ "status": "ok" }` | M | |
| FR-OPS-02 | Env validated at startup (zod) | M | Backend |
| FR-OPS-03 | CORS restricted to configured origins | M | `CORS_ORIGIN` |
| FR-OPS-04 | Security headers via helmet | M | |
| FR-OPS-05 | Structured HTTP error codes: 400, 401, 403, 404, 409, 500 | M | |

---

## 8. API requirements

### 8.1 Base URLs and versioning

| Item | Value |
| --- | --- |
| API default | `http://localhost:8080` |
| Versioned REST | `/api/v1/*` |
| OAuth-like | `/oauth/*` (unversioned root path) |
| Platform default | `http://localhost:3000` |
| Simulator default | `http://localhost:3001` |

### 8.2 Auth models

| Credential | Used by | Endpoints |
| --- | --- | --- |
| Session JWT (`Authorization: Bearer <jwt>`) | Identity owner / console | Auth me, vault, contexts, clients, authorize, grants, audit |
| Opaque access token (`Authorization: Bearer <token>`) | Third-party client | `GET /api/v1/profiles/me` |
| Client id + secret (body) | Third-party client | `POST /oauth/token` |
| Google ID token (`credential` in body) | Platform sign-in / sign-up screens | `POST /api/v1/auth/google` |

### 8.3 Endpoint catalogue

#### Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | None | Liveness |

#### Auth

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | None | Create user + session |
| POST | `/api/v1/auth/login` | None | Login + session |
| POST | `/api/v1/auth/google` | None | Verify Google ID token → link or create user + session |
| GET | `/api/v1/auth/me` | Session JWT | Current user |

#### Vault

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/vault` | Session JWT | Read root identity |
| PUT | `/api/v1/vault` | Session JWT | Update root identity |

#### Contexts

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/v1/contexts` | Session JWT | Create |
| GET | `/api/v1/contexts` | Session JWT | List |
| GET | `/api/v1/contexts/:id` | Session JWT | Read owned |
| PUT | `/api/v1/contexts/:id` | Session JWT | Update owned |
| DELETE | `/api/v1/contexts/:id` | Session JWT | Delete owned |

#### Clients

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/v1/clients` | Session JWT | Register (secret once) |
| GET | `/api/v1/clients` | Session JWT | List (no secrets) |
| GET | `/api/v1/clients/:id` | Session JWT | Detail |
| POST | `/api/v1/clients/:id/rotate-secret` | Session JWT | Rotate (secret once) |

#### OAuth-like

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/oauth/authorize` | Session JWT | Consent data |
| POST | `/oauth/authorize/decision` | Session JWT | Approve/deny |
| POST | `/oauth/token` | Client credentials | Code → access token |

#### Profiles

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/profiles/me` | Access token | Filtered profile; optional `Accept-Language` (`en`/`es`) |

#### Grants & audit

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/v1/grants` | Session JWT | List grants (active and revoked) |
| POST | `/api/v1/grants/:id/revoke` | Session JWT | Revoke grant + tokens; idempotent if already revoked |
| GET | `/api/v1/audit-logs` | Session JWT | List audit events |

### 8.4 Platform routes (UI)

| Route | Purpose |
| --- | --- |
| `/` | Landing |
| `/sign-in`, `/sign-up` | Auth |
| `/console` | Dashboard |
| `/console/vault` | Vault |
| `/console/contexts`, `/new`, `/[contextId]` | Contexts |
| `/console/clients`, `/new`, `/[clientId]`, `/credentials` | Clients |
| `/console/docs`, `/setup`, `/authorization`, `/token-exchange`, `/profile-api`, `/contexts`, `/grants`, `/errors`, `/reference-integration` | Developer Docs areas |
| `/console/grants` | Inspect and revoke application–Context Grants |
| `/console/activity` | Audit |
| `/console/settings` | Account / logout |
| `/oauth/authorize` | Consent |

### 8.5 Simulator routes

| Route | Purpose |
| --- | --- |
| `/` | PrymeCab landing, profile view, or access-lost state |
| `/api/auth/callback` | OAuth code exchange |
| `/api/auth/logout` | Clear cookie session |
| `/api/user` | Proxy filtered profile; forwards `Accept-Language`; `401` with `missing_token` or `access_rejected` |

---

## 9. Data model requirements

Source of truth: `apps/api-backend/prisma/schema.prisma` (PostgreSQL via Prisma 7).

### 9.1 Entities

| Entity | Key fields | Relationships |
| --- | --- | --- |
| **User** | email (unique), passwordHash (nullable), `googleId` (nullable, unique — the Google `sub`), legal names, displayName, gender, avatarUrl | owns contexts, applications, codes, tokens, grants, audits |
| **Context** | category, internalName, identity fields, `pronounsI18n` / `jobTitleI18n` / `shortBioI18n`, `isStrictRead` | belongs to user; used by codes/tokens/grants |
| **Application** | name, clientId (unique), clientSecretHash, redirectUri | belongs to user |
| **AuthorizationCode** | code (unique), expiresAt, consumedAt, redirectUri | user + application + context |
| **AccessToken** | tokenHash (unique), expiresAt, revokedAt | user + application + context |
| **Grant** | scope default `identity_context`, expiresAt?, revokedAt? | unique `(userId, applicationId, contextId)` |
| **AuditLog** | action enum, ipAddress?, userAgent?, metadata?, timestamp | user; optional application/context |

### 9.2 Enums

**ContextCategory:** `PROFESSIONAL` | `LEGAL` | `SOCIAL` | `PRIVATE`

**AuditAction:** `ACCESS_GRANTED` | `PROFILE_READ` | `ACCESS_REVOKED` | `BLOCKED_ANOMALY` | `TOKEN_EXCHANGE_FAILED`

### 9.3 Integrity rules

- Cascading deletes from `User` remove owned identity artifacts.
- Grant uniqueness prevents duplicate active bindings for the same triple.
- Codes and tokens are single-purpose and time-bounded.
- Ownership checks must prevent cross-user reads/writes.
- `googleId` is unique and nullable: an account may have a password, a Google link, or both; a Google-only account has `passwordHash = null`.
- Linking Google **updates** the existing `User` row, so no foreign key is re-pointed and no owned artifact can be orphaned.

> Schema note: this repository has no `prisma/migrations/` history. Schema changes are applied with `prisma db push` (`pnpm --filter api-backend prisma:push`), and both backend and E2E setups synchronise the schema the same way.

---

## 10. Non-functional requirements

### 10.1 Security

| ID | Requirement | Priority |
| --- | --- | --- |
| NFR-SEC-01 | Passwords and client secrets hashed with bcrypt | M |
| NFR-SEC-02 | Authorization codes and access tokens stored as SHA-256 hashes | M |
| NFR-SEC-03 | Helmet + CORS on API | M |
| NFR-SEC-04 | Ownership enforcement on all user-scoped resources | M |
| NFR-SEC-05 | Context mismatch / wrong credential paths return safe errors (401/403) | M |
| NFR-SEC-06 | Secrets never returned on list/detail after initial creation/rotation | M |
| NFR-SEC-07 | Separate test database URL from development | M |
| NFR-SEC-08 | Google ID tokens verified for signature, issuer, audience and expiry, **and** `email_verified`, before account resolution | M |
| NFR-SEC-09 | `googleId` is stripped by the user serializer and never appears in any API response | M |
| NFR-SEC-10 | Post-auth `returnTo` accepts internal absolute paths only (open-redirect protection) | M |

### 10.2 Privacy

| ID | Requirement | Priority |
| --- | --- | --- |
| NFR-PRI-01 | Data minimization at profile read time by context category | M |
| NFR-PRI-02 | Email excluded from third-party profile payloads | M |
| NFR-PRI-03 | Legal identifiers restricted to `LEGAL` context | M |
| NFR-PRI-04 | Auditability of access and revocation | M |
| NFR-PRI-05 | Only `sub` and `email` are read from the Google ID token; `name` / `given_name` / `family_name` / `picture` are discarded and never populate LEGAL-disclosable vault fields | M |

### 10.3 Reliability & quality

| ID | Requirement | Priority |
| --- | --- | --- |
| NFR-QUA-01 | Backend integration tests covering functional, privacy, security, ownership, lifecycle, audit, localisation and Google authentication | M |
| NFR-QUA-02 | Platform unit tests for auth store, context rules/schemas, API client | S |
| NFR-QUA-03 | Type-safe TypeScript across apps | M |
| NFR-QUA-04 | Request validation via zod | M |
| NFR-QUA-05 | Browser-to-browser Playwright E2E across PrymeCab → Platform → API → PostgreSQL | M |
| NFR-QUA-06 | Isolated E2E database with explicit reset guards (`ALLOW_E2E_DB_RESET`, refuse when target equals development `DATABASE_URL`) | M |
| NFR-QUA-07 | Accessibility automation with `@axe-core/playwright` (fail on critical/serious) plus explicit keyboard/semantic checks on core paths | M |
| NFR-QUA-08 | Monorepo quality scripts: lint, typecheck, and aggregate `test:all` | S |

### 10.4 Performance (v1 expectations)

| ID | Requirement | Priority |
| --- | --- | --- |
| NFR-PER-01 | Suitable for local demo and academic evaluation workloads | M |
| NFR-PER-02 | No hard SLA for production multi-region latency | W |

### 10.5 Usability

| ID | Requirement | Priority |
| --- | --- | --- |
| NFR-UX-01 | Console explains contexts with category badges and field rules | M |
| NFR-UX-02 | Consent screen makes approved context and implications understandable | M |
| NFR-UX-03 | One-time secret display is explicit (copy-now warning) | M |

### 10.6 Compatibility

| ID | Requirement | Priority |
| --- | --- | --- |
| NFR-CMP-01 | Node.js >= 18 | M |
| NFR-CMP-02 | PostgreSQL as system of record | M |
| NFR-CMP-03 | Modern evergreen browsers for console/simulator | M |

---

## 11. UX / UI requirements

### 11.1 Design principles

- **Privacy-first language:** Emphasize that the vault is private and apps see slices.
- **Category clarity:** Always show context category (Professional / Legal / Social / Private).
- **Credential safety:** One-time secrets are visually distinct and not re-shown.
- **Consent clarity:** User must choose/confirm the context before approve.
- **Activity transparency:** Audit events should be readable to non-experts.
- **Revocation continuity:** After revoke, the next verification steps (Activity, then third-party access check) are discoverable without forcing an automatic redirect.

### 11.2 Console information architecture

1. Overview  
2. Vault  
3. Contexts  
4. Clients  
5. Developer Docs  
6. Grants  
7. Activity  
8. Settings  

### 11.3 Landing education

Landing should teach the four-step model (Vault → Contexts → Client authorization → Context-bound payload) and preview example filtered payloads per category.

### 11.4 Accessibility (v1 baseline)

- Semantic forms and labels on auth/vault/context/client flows.
- Keyboard-reachable primary actions (consent radios, Approve/Deny, sign-in).
- Prefer existing shadcn/ui primitives for consistent focus/ARIA behavior.
- Automated gate: `@axe-core/playwright` scans tagged `wcag2a` / `wcag2aa` / `wcag21a` / `wcag21aa`; critical and serious violations fail the suite.
- Explicit keyboard/semantic assertions in `tests/e2e/specs/accessibility.spec.ts` (focus, roles, labels, `aria-checked`).
- Dialog text must meet contrast from its first rendered frame, not only once an opening animation settles (the revoke dialog opens at full opacity — F1, §14.4).
- Automated accessibility does **not** claim full WCAG certification or AT user-study coverage (see NG11).

---

## 12. Environment and configuration

### 12.1 API (`apps/api-backend`)

| Variable | Purpose | Example |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://.../securiself` |
| `TEST_DATABASE_URL` | Isolated test DB | `postgresql://.../securiself_test` |
| `PORT` | HTTP port | `8080` |
| `NODE_ENV` | `development` \| `test` \| `production` | `development` |
| `JWT_SECRET` | Session signing secret | *(secret)* |
| `JWT_EXPIRES_IN` | Session lifetime | `30d` |
| `AUTH_CODE_TTL_MINUTES` | Auth code TTL | `5` |
| `ACCESS_TOKEN_TTL_HOURS` | Access token TTL | `1` |
| `CORS_ORIGIN` | Allowed origins | `http://localhost:3000,http://localhost:3001` |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 **Web application** client ID; optional — unset disables `/auth/google` (`503`) | `…apps.googleusercontent.com` |

> Prisma 7 reads the datasource URL from `prisma.config.ts`, not `schema.prisma`.

### 12.2 Platform (`apps/securiself-platform`)

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | API base URL | `http://localhost:8080` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Same client ID as the API's `GOOGLE_CLIENT_ID`; empty hides the Google button | *(empty)* |

> The two client IDs must match exactly — the browser requests the token with it and the API verifies `aud` against it. Google Cloud needs `http://localhost:3000` as an authorised **JavaScript origin** and **no** authorised redirect URI. Restart the Next dev server after changing `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

### 12.3 Simulator (`apps/prymecab-simulator`)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CLIENT_ID` | Registered client id |
| `CLIENT_SECRET` | Client secret (server-side) |
| `NEXT_PUBLIC_REDIRECT_URI` | Callback URL |
| `NEXT_PUBLIC_SECURISELF_AUTHORIZE_URL` | Consent URL (default platform `/oauth/authorize`) |

### 12.4 E2E / Playwright (repo root `.env.e2e`)

Copy from `.env.e2e.example`. Values must never point at development or production data stores.

| Variable | Purpose |
| --- | --- |
| `E2E_DATABASE_URL` | Preferred isolated PostgreSQL URL for E2E prepare/seed |
| `TEST_DATABASE_URL` | Accepted fallback for E2E URL selection |
| `ALLOW_E2E_DB_RESET` | Must be `true` to permit truncate/seed |
| `SECURISELF_E2E` | Marks the process as E2E (`true`) |
| `NODE_ENV` | Use `test` for E2E preparation |
| `JWT_SECRET` / TTL vars | Same semantics as API; E2E-only secrets |
| `CORS_ORIGIN` | Must include Platform and PrymeCab origins |
| `NEXT_PUBLIC_*` / `CLIENT_SECRET` | Wired into Playwright `webServer` env for all three apps |
| `E2E_REUSE_SERVERS` | Optional; reuse already-running local servers |
| `E2E_SKIP_SCHEMA_SYNC` | Optional; skip `prisma db push` between reseeds |

Operational detail: see `TESTING.md`.

---

## 13. Technical architecture requirements

### 13.1 Backend

- Express 5 application factory with helmet, cors, morgan.
- Modular domains under `src/modules/*`: auth, vault, contexts, clients, oauth, profiles, grants, audit.
- Middleware: session user auth, bearer access-token auth, centralized error handler.
- Prisma Client with PostgreSQL adapter (`pg`).
- Google ID-token verification isolated in `src/lib/googleIdToken.ts` using `google-auth-library`; it is the single stubbable boundary in tests.

### 13.2 Platform

- Next.js App Router + React.
- Feature folders: `api`, `hooks`, `schemas`, `types`, components.
- Server state: TanStack Query; session: Zustand.
- UI: Tailwind CSS v4 + shadcn/ui.
- Google Identity Services loaded client-side (`ux_mode: "popup"`, `auto_select: false`); no server-side callback route, authorised JavaScript origin only.
- Developer Docs are static TSX in `src/features/developer-docs/` (no MDX/docs framework); one optional catch-all route `app/console/docs/[[...area]]` driven by `DOCS_AREAS`, which also feeds the area nav, section nav and headings.
- Single dark theme (fixed `dark` class on the root layout); no theme toggle.

### 13.3 Simulator

- Next.js minimal BFF: cookie-stored access token; server routes proxy API.

### 13.4 Deployment (v1)

- Local development is the primary target.
- Production-shaped scripts exist (`build`, `start`, `prisma:deploy`).
- No mandatory Docker/CI/hosting contract in v1; hosting may vary (e.g. Neon for Postgres, Node host for API, Vercel-style for Next apps).

---

## 14. Testing and acceptance criteria

SecuriSelf v1 uses a **three-layer automated testing baseline**. Operator guide: `TESTING.md`. Academic/engineering evidence artefacts may be stored under `writeup-evidence/` (logs, reports, screenshots); do not commit secrets, session files, or live credentials.

### 14.1 Backend test suite (gate)

The API suite (Vitest + Supertest against real PostgreSQL via `TEST_DATABASE_URL`) must cover:

| Suite | Focus | Primary files |
| --- | --- | --- |
| Functional | Auth, vault, contexts, OAuth, profile, health | `functional.test.ts` |
| Privacy | SOCIAL / PROFESSIONAL / LEGAL / PRIVATE filtering; no root email | `privacy.test.ts`, `lifecycle.test.ts` |
| Security | Expired/replayed code, wrong secret/URI, missing/manipulated/revoked token, context binding | `security.test.ts` |
| Ownership | Cross-user context/client/grant rejection | `ownership.test.ts` |
| Lifecycle | Context update/delete, consent denial, client-secret rotation | `lifecycle.test.ts` |
| Audit | ACCESS_GRANTED / PROFILE_READ / ACCESS_REVOKED ordering and associations | `audit.test.ts` |
| Grants idempotency | Repeated revoke returns a stable result and no duplicate audit noise | `grants-idempotent.test.ts` |
| Localisation | Localisable field variants and `Accept-Language` resolution / per-field fallback | `localization.test.ts`, `locale.test.ts` |
| Google auth | New / returning Google user, account linking (no duplicates), invalid or missing credential, session interop with `authUser`, unchanged disclosure through the full consent flow | `google-auth.test.ts`, `google-id-token.test.ts` |

**Isolation:** Single Vitest worker; truncate tables before each test; Prisma schema sync in global setup.

**Gate:** `pnpm test:backend` — all integration tests pass on an isolated `TEST_DATABASE_URL`.

### 14.2 Platform tests

Unit coverage for auth store, context rules/schemas, and API client helpers must pass via `pnpm test:platform`, together with `resolveReturnTo` open-redirect rules, the Google sign-in button (GIS initialisation, credential hand-off to the session mutation, `returnTo` forwarding, cancellation without a backend call), and Developer Docs (`developer-docs.test.tsx`: every area resolves content, section anchors match navigation, single `aria-current`, lifecycle and sequence content, fourteen contract markers, placeholder-only credentials, distinct copy-button names).

### 14.3 Browser-to-browser E2E (Playwright)

Root Playwright config (`playwright.config.ts`) orchestrates:

1. Safe DB prepare/seed (`tests/e2e/setup/prepare-e2e.ts`) with reset guards.
2. Production builds of Platform and PrymeCab; `webServer` starts API (`tsx`) + both Next apps (`next start`).
3. Chromium scenarios under `tests/e2e/specs/` (excluding `@a11y` and `@evidence` tags from the default suite).

| Scenario | Expected result | Spec |
| --- | --- | --- |
| SOCIAL disclosure | Filtered SOCIAL profile in PrymeCab; Activity shows Profile read | `social-disclosure.spec.ts` |
| LEGAL disclosure | Legal fields present; root email never appears | `legal-disclosure.spec.ts` |
| Consent denial | No usable code; no PROFILE_READ | `consent-denial.spec.ts` |
| Grant revocation | Access token invalidated after revoke | `grant-revocation.spec.ts` |
| Vault vs profile boundary | Vault retains email; third-party profile never exposes it | `privacy-boundary.spec.ts` |
| PROFESSIONAL localisation | Same grant: English vs Spanish localisable fields; editor persist; per-field fallback | `localization.spec.ts` |
| Developer Docs | Auth boundary into `/console/docs`; sidebar navigation; nine areas reachable; sticky navigation stays in viewport; no live credentials rendered | `developer-docs.spec.ts` |

**Gate:** `pnpm test:e2e` passes. Visual evidence capture (optional): `pnpm test:evidence:screenshots` → `writeup-evidence/screenshots/`.

### 14.4 Accessibility automation

| Requirement | Detail |
| --- | --- |
| Tooling | `@axe-core/playwright` + Playwright keyboard/semantic assertions |
| Command | `pnpm test:a11y` (`@a11y` grep) |
| Gate | No critical or serious axe violations on scanned pages/states |
| Explicit checks | Focus on primary controls; context radio `Enter` + `aria-checked`; labeled email/password fields |
| Scanned surfaces | 24 route/state scans, including all nine Developer Docs areas and the open revoke dialog; 24 of 24 pass with 0 critical / 0 serious |
| Resolved finding (F1) | `/console/grants-revoke-dialog` `color-contrast` (serious, down to 2.76:1) was caused by the shared dialog's 200 ms fade-in being scanned mid-transition. The revoke dialog now opens at full opacity (`data-[state=open]:fade-in-100`); formerly failing nodes measure 6.47:1–19.06:1 at every sampled offset (0–200 ms). Evidence: `docs/tech-evaluation/f1/` |
| Not yet evaluated | Other dialogs using the shared fade-in primitive (rotate secret, delete Context, secret reveal); the revoke dialog's pending (*Revoking…*) state |
| Limitation | Does not replace assistive-technology user testing or claim full WCAG certification |

### 14.5 Quality aggregate commands

| Command | Purpose |
| --- | --- |
| `pnpm test:backend` | Backend Vitest/Supertest |
| `pnpm test:platform` | Platform unit tests |
| `pnpm test:e2e` | Playwright browser E2E (mandatory scenarios) |
| `pnpm test:a11y` | Accessibility-tagged Playwright specs |
| `pnpm test:evidence:screenshots` | Deterministic write-up screenshots |
| `pnpm test:quality` | Lint + TypeScript checks |
| `pnpm test:all` | Backend → platform → E2E → a11y → quality |

### 14.6 Manual / deferred acceptance notes

| Scenario | Expected result | Automation status |
| --- | --- | --- |
| Register → create SOCIAL context → register client → approve → token → profile | Profile contains only SOCIAL fields | Covered by backend + E2E (seeded owner path) |
| Reuse consumed auth code | Token exchange fails; auditable | Backend automated |
| Wrong client secret | Token exchange fails | Backend automated |
| Grants management UI revoke | User revokes from `/console/grants`, continues to Activity, verifies PrymeCab access loss | Covered by Playwright `grant-revocation.spec.ts` (UI-driven; not API fixture); Candidate B continuation/access-lost covered by platform/PrymeCab unit tests + structured review |
| Google front door against the real provider (Journey F, incl. `returnTo` into consent and a first-time Google account) | Session issued, `returnTo` resumed, linked account keeps its Contexts, new account starts empty | **Manual** — Playwright cannot drive Google's account chooser; evidence in `docs/sprint4/` (§7 walkthrough + 8 screenshots). Verification logic itself is automated in `google-auth.test.ts` with the token verifier stubbed |
| Developer integration from the docs alone (Journey G) | Developers complete registration → profile read without source access | **Manual** — five external developers, 40/40 guided tasks, 0 critical omissions (`docs/sprint5/sprint5-external-evaluation.md`). Measured on the pre-refinement single page; the nine-area refinement has not been re-evaluated with developers |

### 14.7 Definition of Done (feature)

A feature is done when:

1. API contract is implemented and validated with zod.
2. Ownership/privacy/security rules are enforced.
3. Relevant automated tests pass (backend and/or E2E/a11y as applicable).
4. Console (or simulator) UX exists if the feature is user-facing in v1 scope.
5. Audit events fire where specified.
6. Accessibility regressions on touched consent/auth surfaces are covered by `test:a11y` when relevant.

---

## 15. Risks, constraints, and assumptions

### 15.1 Constraints

- Academic OAuth-like subset — not a drop-in replacement for Auth0/Okta/OIDC.
- Single-region / single-DB mental model for v1.
- No shared packages yet; cross-app types may be duplicated carefully.

### 15.2 Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Users confuse session JWT with access tokens | Broken integrations | Clear docs + distinct middleware + simulator example |
| Secret shown-once UX loss | Client lockout | Rotate-secret flow |
| Redirect URI mismatch | Failed demos | Env examples + validation errors |
| Overstating OAuth compliance | Academic/legal confusion | Explicit non-certified framing in README/PRD |
| Accidental truncate of non-test DB | Data loss | E2E reset guards + dedicated `E2E_DATABASE_URL` / `TEST_DATABASE_URL` |
| Developer Docs drift from backend behaviour | Integrators follow stale instructions | Payload examples computed from shared builders; quoted error strings/TTLs pinned by backend tests; `LOCALISABLE_RESPONSE_FIELDS` values remain a manual mirror |
| Overclaiming accessibility from axe alone | Misleading evaluation claims | Pair axe with keyboard/semantic checks; document NG11 limits |

### 15.3 Assumptions

- Users run PostgreSQL (local or hosted) before using the API.
- Demo clients use confidential-client style secrets (simulator holds secret server-side).
- English-only copy is acceptable for v1 evaluation.

---

## 16. Roadmap (post-v1)

Prioritized candidates after current scope:

| Priority | Item | Rationale |
| --- | --- | --- |
| P1 | PKCE support for public clients | Broader client types |
| P2 | Refresh tokens / token introspection | Longer-lived client sessions |
| P2 | Webhooks for grant/revoke events | Integrator automation |
| P2 | Password reset + email verification | Account lifecycle |
| P2 | Automated E2E coverage for the Google front door | Journey F is validated manually against the real provider (§14.6) |
| P3 | Evaluate other dialogs sharing the fade-in primitive | F1 fix is local to the revoke dialog (§14.4) |
| P2 | True latest-authorisation timestamp on Grants | Sprint 2 deferred (CB04 Outcomes A/B); `createdAt` remains first authorisation only |
| P3 | Grant-card status/timestamp visual hierarchy | Sprint 2 deferred finding F05 |
| P3 | Richer revoke-confirmation application/Context restatement | Sprint 2 deferred finding F06 |
| P3 | Public (unauthenticated) developer portal | Adoption; in-console docs require an account (NG3) |
| P3 | Generate docs reference from zod schemas / `filterProfile` | Removes the manual-mirror drift class (§15.2) |
| P3 | Post-refinement developer usability evaluation | Nine-area docs structure is unmeasured (§14.6) |
| P3 | Optional light theme | Deferred Sprint 5 feedback (one participant); needs a Console-wide theme system |
| P3 | Shared packages for types/client SDK | Monorepo maturity |
| P3 | Anomaly blocking using `BLOCKED_ANOMALY` | Stronger security story |
| P3 | Chrome i18n | Broader audience; field variants already shipped (FR-CTX-08) |
| P3 | Additional identity providers (Apple, GitHub) | NG2; the Google pattern generalises to a second provider |
| P4 | Real OIDC federation options | Interop (only if product direction changes) |

---

## 17. Success metrics

Because v1 is primarily academic/demo-oriented, success is measured by capability completeness and test evidence rather than growth KPIs.

| Metric | Target |
| --- | --- |
| Core journeys A–G completable locally | 100% (Journey F requires a configured Google client ID) |
| Backend integration tests passing | 100% of suite (`pnpm test:backend`) |
| Playwright browser E2E (mandatory scenarios) | 100% of suite (`pnpm test:e2e`) |
| Accessibility `@a11y` suite | 100% of suite; zero critical/serious axe violations — met: 24/24 scanned routes/states after the F1 remediation (§14.4) |
| Privacy invariants (email / legal leakage) | Zero violations in backend + E2E privacy assertions |
| Time for a new developer to run API + platform + simulator | Documented in READMEs; ideally < 30 minutes with Postgres ready |
| Stakeholder understanding of contextual identity | Landing + consent UI explain without external slides |

---

## 18. Open questions

| # | Question | Current stance |
| --- | --- | --- |
| Q1 | Should multiple active grants per client (different contexts) be first-class in UI? | Supported in data model; UI not yet optimized |
| Q2 | Should `PRIVATE` require any identity field? | Currently no required fields |
| Q3 | Will SecuriSelf pursue formal OAuth/OIDC compliance later? | Not committed; v1 explicitly academic |
| Q4 | Hosting standard for demos (Vercel + Neon + Fly/Railway)? | Flexible; not locked in repo |
| Q5 | Should clients be registered by a separate developer tenant vs end user? | v1: end user registers clients they own |

---

## 19. Appendix

### A. Example filtered payloads (illustrative)

**SOCIAL**

```json
{
  "display_name": "Countess of Code",
  "username": "countess_of_code",
  "pronouns": "she/her",
  "avatar_url": "https://cdn.example.com/ada-social.png"
}
```

**PROFESSIONAL**

```json
{
  "display_name": "Ada Lovelace",
  "pronouns": "she/her",
  "job_title": "Principal Engineer",
  "company": "Analytical Engines",
  "short_bio": "Building computational systems.",
  "avatar_url": "https://cdn.example.com/ada-pro.png"
}
```

**LEGAL**

```json
{
  "legal_first_name": "Ada",
  "legal_last_name": "Lovelace",
  "document_id": "ID-4421-9087",
  "avatar_url": "https://cdn.example.com/ada-legal.png"
}
```

**PRIVATE**

```json
{
  "display_name": "A.",
  "pronouns": "she/her",
  "avatar_url": null
}
```

### B. Reference documentation in repo

| Document | Path |
| --- | --- |
| API README | `apps/api-backend/README.md` |
| Platform README | `apps/securiself-platform/README.md` |
| Prisma schema | `apps/api-backend/prisma/schema.prisma` |
| Testing guide (three-layer baseline) | `TESTING.md` |
| E2E env example | `.env.e2e.example` |
| Playwright config | `playwright.config.ts` |
| Backend test evidence | `apps/api-backend/TEST_EVIDENCE.md` |
| Sprint 1 implementation / validation / summary | `docs/sprint1/SPRINT1-*.md` |
| Sprint 2 implementation / validation / evaluation / summary | `docs/sprint2/SPRINT2-*.md` |
| Sprint 2 visual evidence | `docs/sprint2/images/` |
| Sprint 3 multilingual automated validation | `docs/sprint3/multilanguage-automated-validation.md` |
| Sprint 3 multilingual E2E evidence | `docs/sprint3/multilanguage-e2e-evidence.md` |
| Sprint 3 multilingual E2E screenshots | `docs/sprint3/images/multilanguage-e2e/` |
| Sprint 3 final summary / external test pack | `docs/sprint3/sprint3-final-summary.md`, `docs/sprint3/SecuriSelf_Sprint3_External_Test_Pack/` |
| Sprint 4 Google authentication implementation | `docs/sprint4/sprint4-implementation.md` |
| Sprint 4 validation and evidence package | `docs/sprint4/sprint4-validation.md` |
| Sprint 4 final summary | `docs/sprint4/sprint4-final-summary.md` |
| Sprint 4 manual visual evidence | `docs/sprint4/images/` |
| Sprint 5 Developer Docs implementation / refinement | `docs/sprint5/sprint5-implementation.md`, `docs/sprint5/sprint5-post-evaluation-refinement.md` |
| Sprint 5 external developer evaluation | `docs/sprint5/sprint5-external-evaluation.md` |
| Sprint 5 validation / post-validation / final summary | `docs/sprint5/sprint5-validation.md`, `docs/sprint5/sprint5-post-validation.md`, `docs/sprint5/sprint5-final-summary.md` |
| Sprint 5 visual evidence | `docs/sprint5/images/` |
| Baseline technical evaluation | `docs/tech-evaluation/baseline-report.md` |
| F1 accessibility remediation and verification | `docs/tech-evaluation/f1/f1-remediation-report.md` |
| Accessibility scan summary (committed report) | `writeup-evidence/reports/accessibility-summary.json` |
| Visual evidence screenshots (generated by `pnpm test:evidence:screenshots`) | `writeup-evidence/screenshots/` |

### C. Glossary

| Term | Meaning |
| --- | --- |
| Vault | Private root identity |
| Context | Purpose-bound identity projection |
| Client / Application | Third-party app registered to request access |
| Grant | User permission binding app ↔ context |
| Access token | Opaque credential for filtered profile reads |
| Consent | User approve/deny decision on authorize screen |
| PrymeCab | Reference third-party simulator app |
| Google ID token | Short-lived OIDC token signed by Google, presented once to `/auth/google`; never stored |
| Account linking | Attaching a Google `sub` to an existing SecuriSelf `User` instead of creating a second account |

---

## Document history

| Version | Date | Notes |
| --- | --- | --- |
| 1.0 | 2026-07-17 | Initial complete PRD derived from monorepo implementation and app READMEs |
| 1.1 | 2026-07-17 | Aligned §10–§14 and metrics with three-layer testing (Vitest/Supertest, Playwright E2E, axe + keyboard/semantic); E2E env; `TESTING.md` / evidence paths |
| 1.2 | 2026-08-07 | Sprint 2 Candidate B alignment: Journey D/E verification continuity; FR-GRN-06–08; FR-AUD-09; FR-PRY-07; Grants in console IA; deferred F05/F06 and last-authorised timestamp on roadmap; Sprint 2 evidence paths |
| 1.3 | 2026-08-17 | Sprint 3 multilingual alignment: localisable `pronouns`/`jobTitle`/`shortBio`; `Accept-Language` on `/profiles/me`; PrymeCab EN/ES; FR-PRF-07; FR-PRY-08; Sprint 3 evidence paths |
| 1.4 | 2026-08-26 | Sprint 4 Google authentication alignment: G11; NG2 narrowed; Journey F; FR-AUTH-10–16; FR-PLT-08; `POST /api/v1/auth/google`; `User.googleId`; NFR-SEC-08–10; NFR-PRI-05; `GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; Google/localisation/grants-idempotency backend suites; manual Journey F acceptance note; Sprint 4 evidence paths |
| 1.5 | 2026-09-12 | Sprint 5 Developer Docs and F1 alignment: G12; NG3 narrowed to public docs; Journey G; FR-DOC-01–08; `/console/docs` areas in routes and console IA; docs E2E/unit coverage; F1 revoke-dialog contrast resolved (24/24 a11y scans); docs-drift risk; roadmap updated; Sprint 5 and tech-evaluation evidence paths |
