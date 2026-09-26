# SecuriSelf testing guide

This repository uses a three-layer automated testing baseline for the academic
contextual-identity platform.

## Architecture

| Layer | Tooling | What it proves |
| --- | --- | --- |
| Backend correctness | Vitest + Supertest + PostgreSQL | Auth, vault, contexts, OAuth-like decision/token exchange, privacy filters, grants, audit |
| Browser-to-browser E2E | Playwright | PrymeCab → Platform consent → callback → filtered profile → Activity |
| Accessibility | `@axe-core/playwright` + keyboard/semantic checks | Core pages remain operable and free of critical/serious violations |

### Why Vitest + Supertest

Backend enforcement (filtering, ownership, code replay, secret rotation, audit)
must be proven against a real PostgreSQL schema. Supertest exercises the Express
app without mocking Prisma, so privacy and security invariants are checked at
the API boundary.

### Why Playwright

The primary disclosure path spans three apps and a browser redirect. Unit tests
cannot prove that PrymeCab never receives root email, that consent denial leaves
no usable code, or that Activity shows `PROFILE_READ` / `ACCESS_REVOKED` after
real browser flows.

### Why Axe is not enough alone

Axe catches many WCAG issues automatically, but cannot prove that Approve/Deny
and context radios are keyboard operable, that focus remains visible, or that
privacy meaning is not communicated by color alone. Those checks are explicit in
`tests/e2e/specs/accessibility.spec.ts`.

## Environment

1. Copy [`.env.e2e.example`](./.env.e2e.example) to `.env.e2e`.
2. Point `E2E_DATABASE_URL` / `TEST_DATABASE_URL` at an **isolated** PostgreSQL
   database (never development/production).
3. Keep `ALLOW_E2E_DB_RESET=true` and `SECURISELF_E2E=true` / `NODE_ENV=test`.

Backend integration tests also require `TEST_DATABASE_URL` in
`apps/api-backend/.env`.

### Safe database preparation

`tests/e2e/setup/prepare-e2e.ts` refuses to truncate/seed unless:

- the process identifies as test/E2E (`NODE_ENV=test` or `SECURISELF_E2E=true`);
- `ALLOW_E2E_DB_RESET=true`;
- the target URL is not the development `DATABASE_URL`.

It then syncs the Prisma schema (unless `E2E_SKIP_SCHEMA_SYNC=true`), truncates
only the isolated database, and seeds a deterministic owner, four contexts, and
the PrymeCab client (`clientId` + hashed secret).

## Commands

From the monorepo root:

| Command | Purpose |
| --- | --- |
| `pnpm test:backend` | Backend Vitest/Supertest suite |
| `pnpm test:platform` | Platform unit tests |
| `pnpm test:e2e` | Prepare E2E DB, build Next apps, run mandatory Playwright browser tests (`next start`) |
| `pnpm test:e2e:headed` | Playwright headed |
| `pnpm test:e2e:ui` | Playwright UI mode |
| `pnpm test:e2e:report` | Open the last HTML report |
| `pnpm test:a11y` | Accessibility-tagged Playwright specs |
| `pnpm test:quality` | Lint + TypeScript checks |
| `pnpm test:all` | Backend, platform, E2E, a11y, quality (stable order) |

## Scenario matrix

| Scenario | Layer | Evidence |
| --- | --- | --- |
| Register / login / vault / contexts / token / profile / health | Backend | `functional.test.ts` |
| SOCIAL / PROFESSIONAL / LEGAL / PRIVATE filtering | Backend | `privacy.test.ts`, `lifecycle.test.ts` |
| Expired/replayed code, wrong secret/URI, revoked/manipulated token | Backend | `security.test.ts` |
| Cross-user ownership | Backend | `ownership.test.ts` |
| Consent denial, secret rotation, context lifecycle | Backend | `lifecycle.test.ts` |
| Audit actions + PROFILE_READ metadata | Backend | `audit.test.ts` |
| SOCIAL browser disclosure + Activity | E2E | `social-disclosure.spec.ts` |
| LEGAL browser disclosure | E2E | `legal-disclosure.spec.ts` |
| Consent denial (no code / no profile) | E2E | `consent-denial.spec.ts` |
| Grant revocation invalidates token | E2E | `grant-revocation.spec.ts` |
| Vault email never reaches PrymeCab | E2E | `privacy-boundary.spec.ts` |
| PROFESSIONAL `short_bio` via `Accept-Language` | Backend + E2E | `localization.test.ts`, `localization.spec.ts` |
| Axe + keyboard/semantic checks | A11y | `accessibility.spec.ts` |

## Generated evidence

Playwright writes (gitignored):

- `playwright-report/` HTML report
- `test-results/` failure screenshots, videos, and traces

Do not commit reports, dumps, session files, raw secrets, or access tokens.

## Limitations

- Academic OAuth-like subset (not certified OAuth 2.0 / OIDC).
- Local evaluation workload; not a production security certification.
- Automated accessibility does not replace user testing with assistive tech.
- Grants UI is out of v1 scope; revocation E2E uses the real Grants API plus
  browser verification of token invalidation and Activity.
