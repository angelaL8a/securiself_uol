# SecuriSelf API Backend

API-first contextual identity and privacy platform. A user owns a private root
identity (the "vault"), creates multiple contextual identities
(`PROFESSIONAL`, `LEGAL`, `SOCIAL`, `PRIVATE`), registers third-party client
applications, authorizes them through an OAuth-like authorization-code flow, and
exposes only the attributes allowed by the selected context through a protected
REST API.

## Tech stack

Node.js, Express 5, TypeScript, Prisma 7 (PostgreSQL via the `pg` driver
adapter), JWT (session auth), bcrypt, zod, helmet, cors, morgan, and Vitest +
supertest for tests.

## Setup

```bash
# from the repo root or apps/api-backend
pnpm install

# copy the example env and fill in the values
cp .env.example .env

# generate the Prisma client
pnpm prisma:generate

# sync the database schema (prisma db push)
pnpm prisma:push
```

You need a running PostgreSQL instance. The connection string lives in
`DATABASE_URL`. Prisma 7 reads it from [`prisma.config.ts`](./prisma.config.ts)
(not from `schema.prisma`).

This repository has no `prisma/migrations/` history: schema changes are applied
with `prisma db push`, the same way the test global setup and the E2E prepare
step sync their databases. Do not use `prisma:migrate` / `prisma:deploy`.

Google sign-in is optional. To enable it, set `GOOGLE_CLIENT_ID` to a Google
OAuth 2.0 "Web application" client ID; it must be the same value as
`NEXT_PUBLIC_GOOGLE_CLIENT_ID` in the platform app. When it is unset,
`POST /api/v1/auth/google` responds `503` and email/password auth is unaffected.

## Environment variables

| Variable                | Description                                            | Example                                             |
| ----------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string                           | `postgresql://postgres:postgres@localhost:5432/securiself` |
| `PORT`                  | HTTP port                                              | `8080`                                              |
| `NODE_ENV`              | `development` \| `test` \| `production`                | `development`                                       |
| `JWT_SECRET`            | Secret used to sign session JWTs                       | `change-me`                                         |
| `JWT_EXPIRES_IN`        | Session JWT lifetime                                   | `30d`                                               |
| `AUTH_CODE_TTL_MINUTES` | Authorization-code lifetime in minutes                 | `5`                                                 |
| `ACCESS_TOKEN_TTL_HOURS` | Access-token lifetime in hours                        | `1`                                                 |
| `GOOGLE_CLIENT_ID`      | Optional Google OAuth 2.0 Web client ID used to verify Google ID tokens; must match the platform's `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. Unset disables Google sign-in | `<id>.apps.googleusercontent.com` |
| `CORS_ORIGIN`           | Comma-separated list of allowed origins                | `http://localhost:3000,http://localhost:3001`       |
| `TEST_DATABASE_URL`     | Separate database used by the test suite               | `postgresql://postgres:postgres@localhost:5432/securiself_test` |

## Commands

```bash
pnpm dev               # start the dev server with hot reload (port 8080)
pnpm build             # generate the Prisma client and compile TypeScript
pnpm start             # run the compiled server (dist/index.js)

pnpm prisma:generate   # generate the Prisma client
pnpm prisma:push       # prisma db push (sync the schema; the project's workflow)

pnpm test              # run the Vitest suite (uses TEST_DATABASE_URL)
pnpm test:watch        # run Vitest in watch mode
```

From the monorepo root you can also run `pnpm test:backend`, `pnpm test:e2e`,
and `pnpm test:all`. See [`TESTING.md`](../../TESTING.md) for the full
three-layer testing baseline (backend, Playwright E2E, accessibility).

The test runner uses `TEST_DATABASE_URL`. The global setup creates that
database if it does not exist and pushes the Prisma schema into it, then each
test truncates all tables.

## API endpoints

Base path: `/api/v1` (the OAuth-like endpoints live at the root, `/oauth`).

### Health

- `GET /health` -> `{ "status": "ok" }`

### Auth

- `POST /api/v1/auth/register` - create a user, returns the user (no password hash) + session JWT
- `POST /api/v1/auth/login` - returns the user + session JWT
- `POST /api/v1/auth/google` - body `{ "credential": "<Google ID token>" }` (the
  credential issued to the SecuriSelf platform by Google Identity Services).
  Verifies the token (audience `GOOGLE_CLIENT_ID`), requires a verified Google
  email, then
  returns the same user + session JWT shape as `/login`. Resolves the account by
  Google account id, then by email (linking Google to the existing account),
  otherwise creates a new account. `503` if `GOOGLE_CLIENT_ID` is unset, `401`
  for an invalid credential or unverified email. This is identity-owner sign-in
  to SecuriSelf only; third-party clients still use the OAuth-like flow below.
- `GET /api/v1/auth/me` - current authenticated user (session JWT required)

### Vault (root identity)

- `GET /api/v1/vault` - read root identity fields
- `PUT /api/v1/vault` - update root identity fields

### Contexts

- `POST /api/v1/contexts` - create a context
- `GET /api/v1/contexts` - list the current user's contexts
- `GET /api/v1/contexts/:id` - read one owned context
- `PUT /api/v1/contexts/:id` - update one owned context
- `DELETE /api/v1/contexts/:id` - delete one owned context

### Clients (third-party applications)

- `POST /api/v1/clients` - register a client; returns `clientSecret` **once**
- `GET /api/v1/clients` - list owned clients (no secrets)
- `GET /api/v1/clients/:id` - read one owned client
- `POST /api/v1/clients/:id/rotate-secret` - rotate the secret; returns the new `clientSecret` **once**

### OAuth-like flow

- `GET /oauth/authorize` - consent-screen data (session JWT required)
- `POST /oauth/authorize/decision` - approve/deny; on approval returns `{ redirectTo }`
- `POST /oauth/token` - exchange an authorization code for a context-bound access token

### Profiles (third-party consumption)

- `GET /api/v1/profiles/me` - filtered profile for the authorized context (Bearer access token required). Optional `Accept-Language` selects `en` or `es` for the localisable fields; see [Localization](#localization-accept-language).

### Audit & grants

- `GET /api/v1/audit-logs` - the current user's audit logs (newest first)
- `GET /api/v1/grants` - the current user's app/context permissions
- `POST /api/v1/grants/:id/revoke` - revoke a grant and its active access tokens

## Status codes

`400` validation error, `401` unauthenticated/invalid token, `403` ownership or
context mismatch, `404` not found, `409` conflict, `500` internal error.

## Context filtering rules

| Context        | Exposed fields                                                        |
| -------------- | --------------------------------------------------------------------- |
| `SOCIAL`       | `display_name`, `username`, `pronouns` (default `hidden`), `avatar_url` |
| `PROFESSIONAL` | `display_name`, `pronouns`, `job_title`, `company`, `short_bio`, `avatar_url` |
| `LEGAL`        | `legal_first_name`, `legal_last_name`, `document_id`, `avatar_url`    |
| `PRIVATE`      | `display_name`, `pronouns`, `avatar_url`                              |

The root email is never returned by `/api/v1/profiles/me`. Legal identity and
`document_id` are only exposed by the `LEGAL` context.

## Localization (Accept-Language)

`Accept-Language` is read only by `GET /api/v1/profiles/me`. It affects only
the values of these localisable fields, which contexts can store as `en`/`es`
variants (`pronounsI18n`, `jobTitleI18n`, `shortBioI18n`):

- `pronouns` (`SOCIAL`, `PROFESSIONAL`, `PRIVATE`)
- `job_title` and `short_bio` (`PROFESSIONAL`)

Resolution: tags are tried in `q` order and matched on their primary subtag,
so `es-MX` resolves to `es` and `en-GB` to `en`; `*` and unsupported languages
are ignored. For each field the value is: the requested variant, else the
English variant (or the field's base value), else the Spanish variant. A missing
header, an unsupported language or a missing translation never fails the
request; `pronouns` still defaults to `hidden` when empty.

Language only changes which variant of an already-disclosed field is returned.
It never changes the authorized context or adds fields to the filtered payload.

## Example flow (curl)

```bash
BASE=http://localhost:8080

# 1. Register (returns a session JWT)
curl -s -X POST $BASE/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"angela@example.com","password":"password123","legalFirstName":"Angela Paola","legalLastName":"Lozano Ochoa"}'

# 2. Login
curl -s -X POST $BASE/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"angela@example.com","password":"password123"}'

# Save the session token from the response:
TOKEN=<session-jwt>

# 3. Create a context
curl -s -X POST $BASE/api/v1/contexts \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"category":"SOCIAL","internalName":"Gaming Community","displayName":"AngelaTech","username":"AngelaTech","pronouns":"hidden","avatarUrl":"https://example.com/a.png"}'

# Save the context id:
CONTEXT_ID=<context-id>

# 4. Register a client (clientSecret is shown only once)
curl -s -X POST $BASE/api/v1/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"PrymeCab Luxury Client","redirectUri":"http://localhost:3001/api/callback"}'

# Save the values:
CLIENT_ID=<client-id>
CLIENT_SECRET=<client-secret>
REDIRECT_URI=http://localhost:3001/api/callback

# 5. Authorize the context (consent decision) -> returns redirectTo with ?code=
curl -s -X POST $BASE/oauth/authorize/decision \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"clientId\":\"$CLIENT_ID\",\"redirectUri\":\"$REDIRECT_URI\",\"contextId\":\"$CONTEXT_ID\",\"approved\":true}"

# Extract the code from redirectTo:
CODE=<authorization-code>

# 6. Exchange the code for an access token
curl -s -X POST $BASE/oauth/token \
  -H 'Content-Type: application/json' \
  -d "{\"grant_type\":\"authorization_code\",\"code\":\"$CODE\",\"client_id\":\"$CLIENT_ID\",\"client_secret\":\"$CLIENT_SECRET\",\"redirect_uri\":\"$REDIRECT_URI\"}"

# Save the access token:
ACCESS_TOKEN=<access-token>

# 7. Read the filtered profile (optional Accept-Language: en | es)
curl -s $BASE/api/v1/profiles/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Accept-Language: es"
```

## Project structure

```
apps/api-backend/
  prisma/
    schema.prisma          # data model (User, Context, Application, ...)
  prisma.config.ts         # Prisma 7 config (datasource URL lives here)
  src/
    index.ts               # server bootstrap (listens on PORT)
    app.ts                 # express app factory (helmet, cors, routes)
    routes.ts              # /api/v1 router composition
    config/env.ts          # zod-validated environment
    lib/                   # prisma, crypto, jwt, errors, serializers, request
    middleware/            # authUser, requireBearerToken, errorHandler
    modules/
      auth/ vault/ contexts/ clients/ oauth/ profiles/ audit/ grants/
  tests/                   # vitest + supertest integration tests
```

## Notes

- Passwords, client secrets and access tokens are never stored in plaintext
  (bcrypt for passwords/secrets, SHA-256 for opaque tokens/codes).
- Each access token is bound to exactly one application and one context.
- This is an academic OAuth-like simulation, not a certified OAuth/OIDC server.
- Google sign-in copies no Google profile claims onto the user; auth responses
  never include `passwordHash` or `googleId`, and `/profiles/me` output is
  unaffected by how the owner signed in.
```
