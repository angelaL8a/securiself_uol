# SecuriSelf Platform

The user-facing frontend for SecuriSelf, an API-first contextual identity and
privacy platform. Users manage a private root identity (Vault), create
context-bound identities, register third-party client applications, review audit
activity, and approve OAuth-like consent requests.

Built with Next.js (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, TanStack
Query, Zustand, zod and react-hook-form.

## Backend dependency

This app is a pure frontend and consumes the SecuriSelf API backend
(`apps/api-backend`). The backend must be running locally before you sign in.

- Default backend URL: `http://localhost:8080`
- All data fetching goes through a typed API client and TanStack Query hooks.

## Environment variables

Create `.env.local` (an `.env.example` is provided):

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
```

| Variable                       | Description                                                                                                   | Default                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `NEXT_PUBLIC_API_URL`          | Base URL of the SecuriSelf API                                                                                | `http://localhost:8080` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth 2.0 Web client ID; must match `GOOGLE_CLIENT_ID` in the API. Empty hides the Google button      | empty                   |

## Setup

From the repository root (pnpm workspace):

```bash
pnpm install
```

## Commands

Run from the repo root or this app directory.

```bash
# Start the dev server (http://localhost:3000)
pnpm --filter securiself-platform dev

# Production build
pnpm --filter securiself-platform build

# Start the production server
pnpm --filter securiself-platform start

# Type-check, lint and tests
pnpm --filter securiself-platform check-types
pnpm --filter securiself-platform lint
pnpm --filter securiself-platform test
```

Monorepo testing (backend + Playwright E2E + accessibility): see
[`TESTING.md`](../../TESTING.md) (`pnpm test:platform`, `pnpm test:e2e`,
`pnpm test:a11y`).

## Main routes

| Route                                     | Description                                   |
| ----------------------------------------- | --------------------------------------------- |
| `/`                                       | Public landing page                           |
| `/sign-in`, `/sign-up`                    | Email/password or Google sign-in              |
| `/console`                                | Overview dashboard                            |
| `/console/vault`                          | Root identity (Vault) management              |
| `/console/contexts`                       | Context list                                  |
| `/console/contexts/new`                   | Create a context                              |
| `/console/contexts/[contextId]`           | Context detail / edit / delete                |
| `/console/clients`                        | Registered client applications                |
| `/console/clients/new`                    | Register a client (one-time secret)           |
| `/console/clients/[clientId]`             | Client detail + credential management         |
| `/console/clients/[clientId]/credentials` | Client credentials + secret rotation          |
| `/console/activity`                       | Audit activity log                            |
| `/console/grants`                         | App/context permissions + revocation          |
| `/console/docs/[[...area]]`               | Developer Docs (optional area slug)           |
| `/console/settings`                       | Account / session settings                    |
| `/oauth/authorize`                        | OAuth-like consent screen                     |

## Architecture

- `app/` — App Router routes, layouts and providers.
- `src/lib/` — API client, query keys, query client, route helpers, utils.
- `src/features/<feature>/` — Per-feature `api`, `hooks`, `schemas`, `types`,
  and components (auth, vault, contexts, clients, activity, grants, oauth,
  developer-docs).
- `src/components/ui/` — shadcn/ui primitives.
- `src/components/shared/` and `src/components/layout/` — reusable building blocks.

Server state lives in TanStack Query; only the session token and authenticated
user snapshot live in a small Zustand store persisted to `localStorage`.

## Current scope exclusions

The following are intentionally **not** implemented in this iteration:

- No Webhooks.
- Platform chrome stays English. Context pronouns, job titles and short bios
  can store English and Spanish variants; third-party apps select a language
  via `Accept-Language` on `GET /api/v1/profiles/me` (see the API README).
- No production OAuth/OIDC provider UI beyond the academic OAuth-like consent
  screen. Google is only a sign-in option for identity owners; third-party apps
  authenticate against SecuriSelf, not Google.

The PrymeCab third-party simulator lives in its own app
(`apps/prymecab-simulator`).
