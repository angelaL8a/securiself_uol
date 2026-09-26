# PrymeCab simulator

Third-party consumer demo for SecuriSelf. Demonstrates the academic OAuth-like
authorization-code flow and context-filtered profile consumption.

## Ports and env

- App URL: `http://localhost:3001`
- API: `http://localhost:8080`
- Consent UI: `http://localhost:3000/oauth/authorize`

Required environment variables (see root [`.env.e2e.example`](../../.env.e2e.example)):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CLIENT_ID` | Registered PrymeCab client id |
| `CLIENT_SECRET` | Server-only client secret (never exposed to the browser) |
| `NEXT_PUBLIC_REDIRECT_URI` | Must be `http://localhost:3001/api/auth/callback` |
| `NEXT_PUBLIC_SECURISELF_AUTHORIZE_URL` | Platform authorize URL |
| `NEXT_PUBLIC_API_URL` | API base URL |

Token exchange stays server-side in `app/api/auth/callback/route.ts`.

## Commands

```bash
pnpm --filter prymecab-simulator dev
pnpm --filter prymecab-simulator build
pnpm --filter prymecab-simulator lint
```

End-to-end disclosure tests that drive this app live in the monorepo root.
See [`TESTING.md`](../../TESTING.md).
