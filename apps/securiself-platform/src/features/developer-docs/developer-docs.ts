import type { ContextCategory } from "@/features/contexts/types";
import { routes } from "@/lib/routes";

/**
 * Section metadata. Single source for the in-page navigation and the section
 * headings so the two can never drift apart.
 */
export interface DocsSectionMeta {
  id: string;
  title: string;
}

/**
 * One focused documentation area, rendered as its own route under
 * `/console/docs`. Split out of the previous single continuous page after the
 * external developer evaluation (`docs/sprint5/sprint5-external-evaluation.md`,
 * findings 2 and 4): participants had the information they needed but paid a
 * scrolling cost every time they moved between integration stages.
 */
export interface DocsAreaMeta {
  /** Route segment under `/console/docs`. Empty string is the index route. */
  slug: string;
  /** Tab label. Understandable on its own, without colour or position. */
  label: string;
  /** Lead sentence rendered above the area content. */
  summary: string;
  sections: DocsSectionMeta[];
}

export const DOCS_AREAS: DocsAreaMeta[] = [
  {
    slug: "",
    label: "Overview",
    summary:
      "What SecuriSelf discloses, the end-to-end authorization sequence, and which value does what.",
    sections: [
      { id: "overview", title: "Overview" },
      { id: "flow", title: "End-to-end authorization sequence" },
      { id: "artifacts", title: "Credentials and authorization artifacts" },
    ],
  },
  {
    slug: "setup",
    label: "Application Setup",
    summary:
      "Registering an application, and where each credential is allowed to live.",
    sections: [
      { id: "register", title: "Register an application" },
      { id: "credentials", title: "Credentials and the security boundary" },
    ],
  },
  {
    slug: "authorization",
    label: "Authorization",
    summary:
      "Sending the identity owner to SecuriSelf, Context selection, and the authorization code that comes back.",
    sections: [
      { id: "authorize", title: "Authorization request" },
      { id: "callback", title: "Authorization code callback" },
    ],
  },
  {
    slug: "token-exchange",
    label: "Token Exchange",
    summary:
      "Turning the single-use authorization code into a Context-bound access token.",
    sections: [
      { id: "code-to-token", title: "From authorization code to access token" },
      { id: "token", title: "Server-side token exchange" },
    ],
  },
  {
    slug: "profile-api",
    label: "Profile API",
    summary: "Reading the Context-filtered profile with the access token.",
    sections: [
      { id: "profile", title: "Retrieve the context-bound profile" },
    ],
  },
  {
    slug: "contexts",
    label: "Contexts & Localization",
    summary:
      "What each Context category discloses, and how Accept-Language selects field values.",
    sections: [
      { id: "payloads", title: "Context payload reference" },
      { id: "localization", title: "Localization and Accept-Language" },
    ],
  },
  {
    slug: "grants",
    label: "Grants & Revocation",
    summary:
      "The standing authorization record, and what your application sees when it is withdrawn.",
    sections: [{ id: "grants", title: "Grants and revocation" }],
  },
  {
    slug: "errors",
    label: "Errors",
    summary: "Every documented rejection, by endpoint.",
    sections: [{ id: "errors", title: "Error reference" }],
  },
  {
    slug: "reference-integration",
    label: "Reference Integration",
    summary:
      "PrymeCab: a working third-party integration built on the contract above.",
    sections: [
      { id: "reference-integration", title: "PrymeCab reference integration" },
    ],
  },
];

/** Every section across every area, in reading order. */
const DOCS_SECTIONS: DocsSectionMeta[] = DOCS_AREAS.flatMap(
  (area) => area.sections,
);

/** Section title lookup, so a heading and its nav entry cannot drift apart. */
export const SECTION_TITLE: Record<string, string> = Object.fromEntries(
  DOCS_SECTIONS.map((section) => [section.id, section.title]),
);

/** `/console/docs` for the index area, `/console/docs/<slug>` otherwise. */
export function docsAreaHref(slug: string): string {
  return slug ? `${routes.console.docs}/${slug}` : routes.console.docs;
}

export function findDocsArea(slug: string): DocsAreaMeta | undefined {
  return DOCS_AREAS.find((area) => area.slug === slug);
}

/** Placeholder credentials. Never render a real client's values here. */
export const PLACEHOLDERS = {
  clientId: "scs_client_example",
  clientSecret: "<SECURISELF_CLIENT_SECRET>",
  authorizationCode: "<AUTHORIZATION_CODE>",
  accessToken: "<ACCESS_TOKEN>",
  redirectUri: "https://your-app.example/callback",
  platformUrl: "https://securiself.example",
  apiUrl: "https://api.securiself.example",
} as const;

/** Which side of the security boundary a value or a step lives on. */
export type BoundaryKind = "browser" | "server" | "securiself";

export interface CredentialLifecycleRow {
  value: string;
  /** Ordered holders. Two entries mean the value is handed over. */
  holder: BoundaryKind[];
  exposure: string;
  /** True when the value must never reach browser-executed code. */
  serverOnly: boolean;
  stage: string;
  purpose: string;
}

/**
 * Credential and authorization-artifact lifecycle. Answers the questions the
 * external evaluation showed participants re-reading for (finding 5): who holds
 * each value, whether a browser may ever see it, when it is used and what it
 * authorises. Wording is derived from the API backend's OAuth and profiles
 * modules and from the Platform session store (`securiself.auth`).
 */
export const CREDENTIAL_LIFECYCLE: CredentialLifecycleRow[] = [
  {
    value: "SecuriSelf session credential",
    holder: ["securiself"],
    exposure:
      "Held by the SecuriSelf Platform in the identity owner's own browser session. Never sent to your application.",
    serverOnly: false,
    stage: "Sign-in and consent, on SecuriSelf",
    purpose:
      "Authenticates the identity owner to SecuriSelf so they can manage Contexts and approve or deny your authorization request. It is not an API credential for your application and is not accepted by /api/v1/profiles/me.",
  },
  {
    value: "client_id",
    holder: ["browser"],
    exposure:
      "Public. Sent as a query parameter on the authorization URL, so browser-readable by design.",
    serverOnly: false,
    stage: "Authorization request",
    purpose:
      "Identifies your registered application to SecuriSelf and to the identity owner on the consent screen.",
  },
  {
    value: "client_secret",
    holder: ["server"],
    exposure:
      "Never. Not in bundles, not in NEXT_PUBLIC_* variables, not in inline scripts.",
    serverOnly: true,
    stage: "Token exchange only",
    purpose:
      "Authenticates your application at POST /oauth/token. Shown once at registration; stored by SecuriSelf only as a bcrypt hash.",
  },
  {
    value: "Authorization code",
    holder: ["browser", "server"],
    exposure:
      "Appears transiently in the callback URL, then is handed to your server.",
    serverOnly: false,
    stage: "Callback, then immediately the token exchange",
    purpose:
      "Single-use, short-lived artifact (AUTH_CODE_TTL_MINUTES, 5 minutes by default) exchanged exactly once for an access token. It is not a credential for the profile endpoint: /api/v1/profiles/me rejects it.",
  },
  {
    value: "access_token",
    holder: ["server"],
    exposure:
      "Never. Treat it as a bearer credential: anything holding it can read the profile.",
    serverOnly: true,
    stage: "Every profile read, until it expires or is revoked",
    purpose:
      "Authorises GET /api/v1/profiles/me for the one Context chosen at consent. Valid for ACCESS_TOKEN_TTL_HOURS (1 hour by default); there is no refresh token.",
  },
];

export interface AuthorizationFlowStep {
  actor: BoundaryKind;
  title: string;
  detail: string;
  /** The value this step produces or carries, if any. */
  artifact?: string;
  /** Channel label, rendered above the first step of each run of steps. */
  phase?: string;
}

/**
 * The causal chain from user approval to a Context-filtered profile. Rendered
 * as an ordered list so the sequence survives without colour or arrows, which
 * the external evaluation (finding 5) showed participants needed spelled out
 * between the authorization code and the access token.
 */
export const AUTHORIZATION_FLOW: AuthorizationFlowStep[] = [
  {
    actor: "securiself",
    title: "The identity owner selects one Context and approves",
    detail:
      "On the SecuriSelf consent screen, authenticated by their own SecuriSelf session.",
  },
  {
    actor: "securiself",
    title: "SecuriSelf creates a single-use authorization code",
    detail:
      "Bound to that owner, your application, the chosen Context and the redirect URI used at authorization.",
    artifact: "authorization code",
  },
  {
    actor: "browser",
    title: "The browser returns to your registered callback",
    detail: `GET ${PLACEHOLDERS.redirectUri}?code=…`,
    artifact: "authorization code",
  },
  {
    actor: "server",
    title: "Your server receives the code",
    detail:
      "This is the hand-off across the security boundary. The code alone reads nothing.",
    artifact: "authorization code",
  },
  {
    actor: "server",
    title: "Your server sends code + client_id + client_secret + redirect_uri",
    detail:
      "POST /oauth/token, server to server. The client secret is what proves the request is yours.",
  },
  {
    actor: "securiself",
    title: "SecuriSelf validates the exchange",
    detail:
      "Client credentials, code ownership, redirect URI equality, TTL and single use. The code is stamped consumed here.",
  },
  {
    actor: "securiself",
    title: "A Context-bound access token is returned",
    detail:
      "The authorization code is now spent. From here on, the access token is the credential.",
    artifact: "access_token",
  },
  {
    actor: "server",
    title: "Your server calls GET /api/v1/profiles/me",
    detail: "Authorization: Bearer <ACCESS_TOKEN>. No parameters.",
    artifact: "access_token",
  },
  {
    actor: "securiself",
    title: "The Context-filtered profile is returned",
    detail:
      "Only the fields the chosen Context's category allows. Recorded in the owner's Activity log.",
  },
];

/**
 * The callback-to-profile transition, grouped by channel. Cohort B refinement B1
 * (`docs/external-evaluation/B`): one participant took the callback code for
 * the Profile API credential, so the Token Exchange area opens with only the
 * six steps around that boundary instead of repeating the nine-step sequence.
 */
export const CODE_TO_TOKEN_TRANSITION: AuthorizationFlowStep[] = [
  {
    phase: "Browser · front channel",
    actor: "browser",
    title: "Browser authorization",
    detail:
      "GET /oauth/authorize with client_id and redirect_uri. The client_id is public; no secret is involved.",
  },
  {
    phase: "Browser · front channel",
    actor: "browser",
    title: "Callback with the authorization code",
    detail: `GET ${PLACEHOLDERS.redirectUri}?code=… — temporary (5 minutes by default) and single use.`,
    artifact: "authorization code",
  },
  {
    phase: "Your server · server-side",
    actor: "server",
    title: "Your application backend takes the code",
    detail:
      "The callback handler runs on your server. The code on its own reads nothing.",
    artifact: "authorization code",
  },
  {
    phase: "Your server · server-side",
    actor: "server",
    title: "POST /oauth/token with the client_secret",
    detail:
      "Server to server: code + client_id + client_secret + redirect_uri. The code is consumed here.",
    artifact: "authorization code",
  },
  {
    phase: "Your server · server-side",
    actor: "server",
    title: "Access token returned",
    detail:
      "Keep it on your server. From here on, the access token is the credential.",
    artifact: "access_token",
  },
  {
    phase: "Your server · protected API request",
    actor: "server",
    title: "GET /api/v1/profiles/me",
    detail: `Authorization: Bearer ${PLACEHOLDERS.accessToken}.`,
    artifact: "access_token",
  },
];

/**
 * What happens between a revoked Grant and restored access. Cohort B refinement
 * B2: the facts were already documented, but split across Grants & Revocation
 * and Errors. Wording follows `revokeGrant` (grants.service), which revokes the
 * Grant's access tokens in the same transaction, and `exchangeToken`
 * (oauth.service), which rejects a consumed code.
 */
export const REVOCATION_RECOVERY: AuthorizationFlowStep[] = [
  {
    actor: "securiself",
    title: "The identity owner revokes the Grant",
    detail:
      "From their SecuriSelf Console. Your application is not notified.",
  },
  {
    actor: "server",
    title: "The existing access token is no longer accepted",
    detail:
      "GET /api/v1/profiles/me returns 401 Access token has been revoked. Sending the request or the token again does not change the result.",
    artifact: "revoked access_token",
  },
  {
    actor: "server",
    title: "Nothing already issued can be used to regain access",
    detail:
      "There is no refresh token, and the authorization code that produced the token was consumed at exchange (400 Authorization code has already been used). Discard the stored token.",
  },
  {
    actor: "securiself",
    title: "The identity owner authorizes your application again",
    detail:
      "Start a new authorization request. They sign in if needed, choose a Context and approve on the consent screen.",
  },
  {
    actor: "browser",
    title: "A new authorization code arrives at your callback",
    detail: `GET ${PLACEHOLDERS.redirectUri}?code=…`,
    artifact: "new authorization code",
  },
  {
    actor: "server",
    title: "Your server exchanges it for a new access token",
    detail: "POST /oauth/token with your client_secret, as before.",
    artifact: "new access_token",
  },
  {
    actor: "server",
    title: "Profile reads resume with the new access token",
    detail:
      "Bound to the Context chosen in this new approval, which may differ from the previous one.",
    artifact: "new access_token",
  },
];

/**
 * Illustrative context values used to render the payload examples through the
 * shared `buildProfilePayload` helper. Fictional data only.
 */
export const EXAMPLE_CONTEXT = {
  internalName: "Work",
  displayName: "A. Developer",
  username: "adev",
  pronouns: "they/them",
  avatarUrl: "https://cdn.example/avatar.png",
  jobTitle: "Software Engineer",
  company: "Example Ltd",
  shortBio: "Builds developer tooling.",
  documentId: "ID-0000000",
};

export const EXAMPLE_VAULT = {
  legalFirstName: "Alex",
  legalLastName: "Developer",
};

/**
 * Fields the API backend resolves through the localization helper, per
 * category. Derived from `filterProfile` in
 * `apps/api-backend/src/modules/profiles/profiles.service.ts` — the disclosed
 * payload, not the set of fields a context can store.
 */
export const LOCALISABLE_RESPONSE_FIELDS: Record<ContextCategory, string[]> = {
  PROFESSIONAL: ["pronouns", "job_title", "short_bio"],
  SOCIAL: ["pronouns"],
  PRIVATE: ["pronouns"],
  LEGAL: [],
};

export const CODE = {
  authorizeUrl: `${PLACEHOLDERS.platformUrl}/oauth/authorize
  ?client_id=${PLACEHOLDERS.clientId}
  &redirect_uri=${encodeURIComponent(PLACEHOLDERS.redirectUri)}
  &response_type=code
  &scope=identity_context`,

  authorizeRedirect: `// Browser. No client secret is involved at this step.
const params = new URLSearchParams({
  client_id: process.env.NEXT_PUBLIC_CLIENT_ID!,       // ${PLACEHOLDERS.clientId}
  redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI!, // ${PLACEHOLDERS.redirectUri}
  response_type: "code",
  scope: "identity_context",
});

window.location.href =
  \`\${process.env.NEXT_PUBLIC_SECURISELF_AUTHORIZE_URL}?\${params.toString()}\`;`,

  tokenExchange: `// Your server. The client secret never reaches the browser.
const response = await fetch(\`\${SECURISELF_API_URL}/oauth/token\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    grant_type: "authorization_code",
    code,                                     // ${PLACEHOLDERS.authorizationCode}
    client_id: process.env.CLIENT_ID,         // ${PLACEHOLDERS.clientId}
    client_secret: process.env.CLIENT_SECRET, // ${PLACEHOLDERS.clientSecret}
    redirect_uri: process.env.REDIRECT_URI,   // ${PLACEHOLDERS.redirectUri}
  }),
});

if (!response.ok) {
  // { "status": "error", "message": "..." }
  throw new Error("Token exchange failed");
}

const { access_token, token_type, expires_in } = await response.json();`,

  tokenCurl: `curl -X POST ${PLACEHOLDERS.apiUrl}/oauth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "authorization_code",
    "code": "${PLACEHOLDERS.authorizationCode}",
    "client_id": "${PLACEHOLDERS.clientId}",
    "client_secret": "${PLACEHOLDERS.clientSecret}",
    "redirect_uri": "${PLACEHOLDERS.redirectUri}"
  }'`,

  profileRequest: `// Your server. The access token is a server-side credential.
const response = await fetch(\`\${SECURISELF_API_URL}/api/v1/profiles/me\`, {
  headers: {
    Authorization: \`Bearer \${accessToken}\`, // ${PLACEHOLDERS.accessToken}
    "Accept-Language": "es",                 // optional
  },
});

if (response.status === 401) {
  // Token expired, revoked, or unknown: send the user through
  // authorization again. There is no refresh token.
}`,

  callbackHandler: `// Your server: GET ${PLACEHOLDERS.redirectUri}
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (!code) return redirect("/?error=missing_code");

  const tokens = await exchangeAuthorizationCode(code); // POST /oauth/token

  // Keep the access token server-side, e.g. in an httpOnly cookie.
  cookieStore.set("accessToken", tokens.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: tokens.expires_in,
  });

  return redirect("/");
}`,

  errorEnvelope: `{
  "status": "error",
  "message": "Authorization code has expired"
}`,

  validationEnvelope: `{
  "status": "error",
  "message": "Validation failed",
  "details": [ /* issue list */ ]
}`,
} as const;
