import { ExternalLink, Info, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { PayloadPreview } from "@/components/shared/payload-preview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildProfilePayload,
  CONTEXT_CATEGORIES,
} from "@/features/contexts/context-rules";
import { routes } from "@/lib/routes";
import {
  CODE,
  CODE_TO_TOKEN_TRANSITION,
  docsAreaHref,
  EXAMPLE_CONTEXT,
  EXAMPLE_VAULT,
  LOCALISABLE_RESPONSE_FIELDS,
  PLACEHOLDERS,
  REVOCATION_RECOVERY,
  SECTION_TITLE,
} from "../developer-docs";
import { AuthorizationFlow } from "./authorization-flow";
import { CodeBlock } from "./code-block";
import { ContextPayloadTabs } from "./context-payload-tabs";
import { CredentialLifecycle } from "./credential-lifecycle";
import {
  BoundaryTag,
  C,
  Endpoint,
  ErrorTable,
  H3,
  P,
  Td,
  Th,
} from "./docs-primitives";
import { DocsSection } from "./docs-section";

/**
 * The documentation content, one exported component per focused area.
 *
 * The areas were split out of a single continuous page after the external
 * developer evaluation (`docs/sprint5/sprint5-external-evaluation.md`): the
 * technical content is unchanged apart from the two new explanatory blocks
 * (`AuthorizationFlow`, `CredentialLifecycle`), which target the credential /
 * authorization-artifact confusion the evaluation recorded.
 *
 * The Cohort B refinements (`docs/external-evaluation/B`) add the
 * code-to-token transition on Token Exchange (B1) and the revocation recovery
 * path between Grants & Revocation and Errors (B2).
 */

/** Cross-area link, e.g. from the callback back to the token exchange. */
function AreaLink({
  slug,
  hash,
  children,
}: {
  slug: string;
  hash?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`${docsAreaHref(slug)}${hash ? `#${hash}` : ""}`}
      className="font-medium underline underline-offset-4"
    >
      {children}
    </Link>
  );
}

export function OverviewArea() {
  return (
    <>
      <DocsSection id="overview" title={SECTION_TITLE.overview}>
        <P>
          SecuriSelf lets a person hold several separate identities — called{" "}
          <strong>Contexts</strong> — behind one account. A third-party
          application never reads the account itself. It asks for authorization,
          the identity owner picks exactly one Context, and the application
          receives an access token bound to that Context.
        </P>
        <P>
          The private root record (the <strong>Vault</strong>: account email,
          gender, legal name) is never returned to an application.{" "}
          <C>GET /api/v1/profiles/me</C> returns only the fields the selected
          Context&apos;s category allows.
        </P>

        <Alert>
          <Info className="size-4" aria-hidden="true" />
          <AlertTitle>Terminology</AlertTitle>
          <AlertDescription>
            <p>
              SecuriSelf implements an{" "}
              <strong>OAuth-like authorization-code flow</strong>. It is
              modelled on OAuth 2.0 but is not an OAuth 2.0 / OIDC certified
              implementation: there is no discovery document, no refresh token,
              no PKCE, and the token endpoint takes a JSON body rather than a
              form-encoded one.
            </p>
          </AlertDescription>
        </Alert>
      </DocsSection>

      <DocsSection id="flow" title={SECTION_TITLE.flow}>
        <P>
          Nine steps run from the identity owner&apos;s approval to a
          Context-filtered profile. Each step names the party that performs it
          and the value it carries, so the hand-off from the browser to your
          server — and the point where the authorization code stops being
          useful — is explicit.
        </P>
        <AuthorizationFlow />
        <Alert>
          <Info className="size-4" aria-hidden="true" />
          <AlertTitle>
            The authorization code and the access token are different values
          </AlertTitle>
          <AlertDescription>
            <p>
              The <strong>authorization code</strong> is an intermediate,
              short-lived, single-use artifact. Its only purpose is step 5: it
              is exchanged once, at <C>POST /oauth/token</C>, and is then spent.
              The <strong>access token</strong> returned by that exchange is the
              bearer credential every later{" "}
              <C>GET /api/v1/profiles/me</C> call uses. Sending the code to the
              profile endpoint returns <C>401 Invalid access token</C>.
            </p>
          </AlertDescription>
        </Alert>
      </DocsSection>

      <DocsSection id="artifacts" title={SECTION_TITLE.artifacts}>
        <P>
          Five distinct values appear across the flow. They are not
          interchangeable, they are held by different parties, and only some of
          them may ever reach a browser.
        </P>
        <CredentialLifecycle />
        <P>
          The two server-only values are the ones worth designing around:{" "}
          <AreaLink slug="setup">Application Setup</AreaLink> covers how to keep
          the <C>client_secret</C> and the access token out of anything shipped
          to the browser.
        </P>
      </DocsSection>
    </>
  );
}

export function SetupArea() {
  return (
    <>
      <DocsSection id="register" title={SECTION_TITLE.register}>
        <P>
          Applications are registered from the Console at{" "}
          <Link
            href={routes.console.clients}
            className="font-medium underline underline-offset-4"
          >
            Clients
          </Link>
          . Registration takes two values:
        </P>
        <ul className="max-w-3xl list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
          <li>
            <strong>Name</strong> — shown to the identity owner on the consent
            screen.
          </li>
          <li>
            <strong>Redirect URI</strong> — an absolute URL,{" "}
            <C>{PLACEHOLDERS.redirectUri}</C>. One URI per application.
          </li>
        </ul>
        <P>
          Registration returns a <C>client_id</C> in the form{" "}
          <C>scs_&lt;32 hex characters&gt;</C> and a <C>client_secret</C> in the
          form <C>scs_secret_&lt;random&gt;</C>. The secret is stored only as a
          bcrypt hash, so it is displayed{" "}
          <strong>once, at creation</strong>, and cannot be read back
          afterwards. The credentials page for an application shows the client
          ID and redirect URI, and a masked placeholder where the secret would
          be.
        </P>

        <H3>Redirect URI matching</H3>
        <P>
          The redirect URI is compared by{" "}
          <strong>exact string equality</strong> — no prefix matching, no
          wildcards, no normalisation of trailing slashes. The same value must
          be sent as the <C>redirect_uri</C> query parameter at authorization{" "}
          <em>and</em> in the token exchange body; at exchange it must match both
          the value recorded with the authorization code and the value currently
          registered on the application.
        </P>

        <H3>Secret rotation</H3>
        <P>
          A secret can be rotated from the application&apos;s credentials page.
          Rotation replaces the stored hash and returns the new secret once.
          Existing access tokens keep working — they are validated against their
          own hash, not the client secret — but any token exchange still using
          the previous secret is rejected, so deploy the new secret before
          rotating.
        </P>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild size="sm" variant="outline">
            <Link href={routes.console.newClient}>Register an application</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href={routes.console.clients}>
              View registered applications
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </DocsSection>

      <DocsSection id="credentials" title={SECTION_TITLE.credentials}>
        <P>
          The{" "}
          <AreaLink slug="">credential and artifact reference</AreaLink> on the
          Overview page lists every value and where it is allowed to appear.
          Two of them are server-only, and both failures are silent until they
          are exploited.
        </P>
        <P>
          The <C>client_secret</C> must not be exposed to browser JavaScript.
          Anything shipped to the browser — bundles, <C>NEXT_PUBLIC_*</C>{" "}
          environment variables, inline scripts — is readable by anyone using
          your application. A leaked secret lets a third party complete the
          token exchange for authorization codes they intercept and read the
          owner&apos;s context-bound profile under your application&apos;s
          identity. Because the token endpoint is called server-to-server, the
          secret never needs to leave your backend.
        </P>
        <P>
          The access token is equally server-side: it is a bearer credential
          with no additional proof of possession. The PrymeCab{" "}
          <AreaLink slug="reference-integration">reference integration</AreaLink>{" "}
          keeps it in an <C>httpOnly</C> cookie and calls the SecuriSelf API
          from its own route handlers.
        </P>
        <P>
          The identity owner&apos;s SecuriSelf session credential is a third,
          unrelated value. It authenticates them to SecuriSelf itself and is
          never issued to a third-party application; it cannot be used against{" "}
          <C>/api/v1/profiles/me</C> on your behalf.
        </P>
      </DocsSection>
    </>
  );
}

export function AuthorizationArea() {
  return (
    <>
      <DocsSection id="authorize" title={SECTION_TITLE.authorize}>
        <P>
          Authorization starts on the <strong>SecuriSelf Platform</strong>{" "}
          authorization page, not on the API. The Platform owns the user
          session, renders the consent screen and calls the API on the
          user&apos;s behalf; sending the browser directly to the API would
          bypass sign-in and consent.
        </P>
        <Endpoint
          method="GET"
          path="<SECURISELF_PLATFORM_URL>/oauth/authorize"
        />
        <CodeBlock label="Authorization URL — browser" code={CODE.authorizeUrl} />

        <H3>Query parameters</H3>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <Th>Parameter</Th>
                <Th>Required</Th>
                <Th>Value</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <Td className="break-all font-mono text-xs">client_id</Td>
                <Td className="text-sm">Yes</Td>
                <Td className="text-sm">Your registered client ID.</Td>
              </TableRow>
              <TableRow>
                <Td className="break-all font-mono text-xs">redirect_uri</Td>
                <Td className="text-sm">Yes</Td>
                <Td className="text-sm">
                  Absolute URL, exactly as registered, URL-encoded.
                </Td>
              </TableRow>
              <TableRow>
                <Td className="break-all font-mono text-xs">response_type</Td>
                <Td className="text-sm">Yes</Td>
                <Td className="text-sm">
                  Must be <C>code</C>. No other response type is accepted.
                </Td>
              </TableRow>
              <TableRow>
                <Td className="break-all font-mono text-xs">scope</Td>
                <Td className="text-sm">No</Td>
                <Td className="text-sm">
                  Must be <C>identity_context</C> when present; that is also the
                  default.
                </Td>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <CodeBlock
          label="Starting authorization — browser"
          code={CODE.authorizeRedirect}
        />

        <H3>What the identity owner sees</H3>
        <ul className="max-w-3xl list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
          <li>
            If they are not signed in to SecuriSelf, the Platform redirects to
            sign-in with a <C>returnTo</C> parameter and comes back to the
            consent screen afterwards. Email/password and Google sign-in both
            apply here.
          </li>
          <li>
            The consent screen names your application, shows the redirect URI it
            will return to, and lists the owner&apos;s Contexts as a
            single-choice radio group.
          </li>
          <li>
            Selecting a Context renders a live preview of the exact{" "}
            <C>/api/v1/profiles/me</C> payload your application would receive.
          </li>
          <li>
            <strong>Approve</strong> creates the authorization code and the
            Grant, then redirects the browser to your redirect URI.
          </li>
          <li>
            <strong>Deny</strong> issues no code and performs no redirect; the
            owner stays on SecuriSelf and sees a confirmation that nothing was
            shared. Your application simply never receives a callback.
          </li>
        </ul>
        <P>
          Unknown parameters are rejected before consent is shown: an
          unregistered <C>client_id</C> or a <C>redirect_uri</C> that does not
          match the registration produces an error on the SecuriSelf page rather
          than a redirect back to your application.
        </P>
      </DocsSection>

      <DocsSection id="callback" title={SECTION_TITLE.callback}>
        <P>
          After approval the browser is sent to your registered redirect URI
          with the code appended as a query parameter (using <C>&amp;</C> if the
          URI already contains a query string):
        </P>
        <Endpoint
          method="GET"
          path={`${PLACEHOLDERS.redirectUri}?code=${PLACEHOLDERS.authorizationCode}`}
        />
        <P>
          The code is an opaque 64-character hex string. It is bound to one
          identity owner, one application and one Context — the Context the
          owner chose — plus the redirect URI used at authorization. It is{" "}
          <strong>single use</strong>: the first successful exchange stamps it
          consumed, and any replay is rejected.
        </P>
        <P>
          Code lifetime is a deployment setting, <C>AUTH_CODE_TTL_MINUTES</C>,
          defaulting to <strong>5 minutes</strong>. Exchange it as soon as the
          callback runs rather than storing it.
        </P>
        <CodeBlock
          label="Callback handler — your server"
          code={CODE.callbackHandler}
        />
        <P>
          No error is delivered to the callback: denial and rejected
          authorization requests never redirect. Treat a callback without a{" "}
          <C>code</C> parameter as an aborted authorization.
        </P>
        <Alert>
          <Info className="size-4" aria-hidden="true" />
          <AlertTitle>
            The code is not yet access — the next step is what grants it
          </AlertTitle>
          <AlertDescription>
            <p>
              At this point your server holds a single-use code and nothing
              else. The authorization code is not a Profile API credential.
              Your callback handler, on your server, exchanges it at{" "}
              <C>POST /oauth/token</C> with your <C>client_secret</C> for an
              access token, and only that access token is sent to{" "}
              <C>GET /api/v1/profiles/me</C>. Next step:{" "}
              <AreaLink slug="token-exchange">Token Exchange</AreaLink>.
            </p>
          </AlertDescription>
        </Alert>
      </DocsSection>
    </>
  );
}

export function TokenExchangeArea() {
  return (
    <>
      <DocsSection id="code-to-token" title={SECTION_TITLE["code-to-token"]}>
        <P>
          <strong>You are here:</strong> your{" "}
          <AreaLink slug="authorization" hash="callback">
            callback
          </AreaLink>{" "}
          has just received <C>?code=</C>. The exchange is the single point
          where that transient browser-delivered artifact becomes a server-held
          credential. Before it, your application has a code that reads
          nothing; after it, it has a token bound to the one Context the owner
          chose.
        </P>
        <Alert>
          <ShieldCheck className="size-4" aria-hidden="true" />
          <AlertTitle>
            The authorization code is not a Profile API credential
          </AlertTitle>
          <AlertDescription>
            <p>
              Exchange it server-side for an access token before calling the
              Profile API. The exchange needs your <C>client_secret</C>, so it
              runs on your server, never in the browser.{" "}
              <C>GET /api/v1/profiles/me</C> accepts only the access token as{" "}
              <C>Authorization: Bearer</C>; sending the code there returns{" "}
              <C>401 Invalid access token</C>.
            </p>
          </AlertDescription>
        </Alert>
        <AuthorizationFlow steps={CODE_TO_TOKEN_TRANSITION} />
        <div className="rounded-lg border p-4">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-sm font-semibold">Authorization code</dt>
              <dd className="text-sm text-muted-foreground">
                Arrives in the callback URL. Single use, expires in{" "}
                <C>AUTH_CODE_TTL_MINUTES</C> (5 minutes by default). Accepted at{" "}
                <C>POST /oauth/token</C> and nowhere else — it is rejected by{" "}
                <C>/api/v1/profiles/me</C>. Spent as soon as the exchange
                succeeds.
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-semibold">Access token</dt>
              <dd className="text-sm text-muted-foreground">
                Returned by the exchange. Reusable for{" "}
                <C>ACCESS_TOKEN_TTL_HOURS</C> (1 hour by default) until it
                expires or the owner revokes the Grant. Sent as{" "}
                <C>Authorization: Bearer …</C> on every profile read. There is
                no refresh token.
              </dd>
            </div>
          </dl>
        </div>
        <P>
          The full nine-step sequence, including consent and code validation, is
          on the <AreaLink slug="" hash="flow">Overview</AreaLink>. Once the
          token is held, continue with the{" "}
          <AreaLink slug="profile-api">Profile API</AreaLink>.
        </P>
      </DocsSection>

      <DocsSection id="token" title={SECTION_TITLE.token}>
        <Endpoint method="POST" path="<SECURISELF_API_URL>/oauth/token" />
        <P>
          The request body is <strong>JSON</strong> (
          <C>Content-Type: application/json</C>), not form-encoded, and is
          validated strictly — unknown or missing fields produce{" "}
          <C>400 Validation failed</C>. All five fields are required:{" "}
          <C>grant_type</C> (always <C>authorization_code</C>), <C>code</C>,{" "}
          <C>client_id</C>, <C>client_secret</C> and <C>redirect_uri</C>.
        </P>
        <CodeBlock label="Token exchange — your server" code={CODE.tokenExchange} />
        <CodeBlock label="Token exchange — cURL" code={CODE.tokenCurl} />

        <H3>Response</H3>
        <PayloadPreview
          title="200 OK"
          copyLabel="Copy token response"
          payload={{
            access_token: PLACEHOLDERS.accessToken,
            token_type: "Bearer",
            expires_in: 3600,
          }}
        />
        <P>
          <C>expires_in</C> is in seconds and derives from{" "}
          <C>ACCESS_TOKEN_TTL_HOURS</C>, which defaults to{" "}
          <strong>1 hour</strong>. The token is opaque: SecuriSelf stores only
          its SHA-256 hash, so it cannot be recovered after issuance and carries
          no readable claims. There is no refresh token — when a token expires,
          send the user through authorization again.
        </P>

        <H3>Rejections</H3>
        <ul className="max-w-3xl list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
          <li>
            Unknown <C>client_id</C> or an incorrect <C>client_secret</C> —{" "}
            <C>401 Invalid client credentials</C>. The two cases are
            deliberately indistinguishable.
          </li>
          <li>
            A code issued to a different application —{" "}
            <C>400 Authorization code was not issued to this client</C>.
          </li>
          <li>
            <C>redirect_uri</C> not identical to both the authorization-time
            value and the registered value —{" "}
            <C>400 redirect_uri does not match</C>.
          </li>
          <li>
            Code past its TTL — <C>400 Authorization code has expired</C>.
          </li>
          <li>
            Code already exchanged —{" "}
            <C>400 Authorization code has already been used</C>.
          </li>
        </ul>
        <P>
          Every failure after the code is located is recorded against the
          identity owner as a <C>TOKEN_EXCHANGE_FAILED</C> entry in their
          Activity log, with the reason attached.
        </P>
      </DocsSection>
    </>
  );
}

export function ProfileApiArea() {
  return (
    <DocsSection id="profile" title={SECTION_TITLE.profile}>
      <Endpoint method="GET" path="<SECURISELF_API_URL>/api/v1/profiles/me" />
      <P>
        Authenticate with the access token as a bearer credential:{" "}
        <C>Authorization: Bearer &lt;ACCESS_TOKEN&gt;</C>. The scheme is matched
        case-sensitively. The endpoint takes no parameters — the identity owner
        and the Context are already fixed by the token.
      </P>
      <P>
        Use the <C>access_token</C> returned by the{" "}
        <AreaLink slug="token-exchange">token exchange</AreaLink>, not the
        authorization code from the callback: the code is rejected here with{" "}
        <C>401 Invalid access token</C>.
      </P>
      <CodeBlock label="Profile request — your server" code={CODE.profileRequest} />
      <P>
        A <C>401</C> means the token is no longer accepted. Retrying with the
        same token does not help. If it worked before, the likely cause is expiry
        or a revoked Grant: see{" "}
        <AreaLink slug="errors" hash="recovery">
          recovering from revoked or expired access
        </AreaLink>
        .
      </P>

      <H3>Response envelope</H3>
      <PayloadPreview
        requestLine="GET /api/v1/profiles/me"
        title="200 OK"
        copyLabel="Copy profile response"
        payload={{
          status: "success",
          context: "PROFESSIONAL",
          data: buildProfilePayload("PROFESSIONAL", EXAMPLE_CONTEXT, EXAMPLE_VAULT),
        }}
      />
      <P>
        <C>context</C> is the category of the Context bound to the token.{" "}
        <C>data</C> is assembled field by field from that category&apos;s
        allow-list — it is not a serialisation of the user record with fields
        removed, so an unlisted field cannot appear because it was added to the
        database later. Keys are <C>snake_case</C>, values are strings or{" "}
        <C>null</C>, and an unset <C>pronouns</C> resolves to the literal string{" "}
        <C>&quot;hidden&quot;</C> rather than <C>null</C>.
      </P>
      <P>
        Every successful read is written to the identity owner&apos;s Activity
        log as a <C>PROFILE_READ</C> entry, attributed to your application and
        the Context. Cache the response rather than polling.
      </P>
    </DocsSection>
  );
}

export function ContextsArea() {
  return (
    <>
      <DocsSection id="payloads" title={SECTION_TITLE.payloads}>
        <P>
          Four Context categories exist. The category chosen at consent decides
          which fields your application can ever see. The API backend is the
          enforcement point; the tabs below show the payload shape and the
          fields each category withholds.
        </P>
        <ContextPayloadTabs />
        <Alert>
          <ShieldCheck className="size-4" aria-hidden="true" />
          <AlertTitle>Vault fields are never disclosed</AlertTitle>
          <AlertDescription>
            <p>
              The account email, gender and the Google account identifier are
              excluded from every category. Legal name and document ID are
              disclosed only under a <C>LEGAL</C> Context.
            </p>
          </AlertDescription>
        </Alert>
      </DocsSection>

      <DocsSection id="localization" title={SECTION_TITLE.localization}>
        <P>
          Send an <C>Accept-Language</C> header on{" "}
          <C>GET /api/v1/profiles/me</C> to choose the language of localisable
          fields. Supported locales are <C>en</C> and <C>es</C>.
        </P>
        <Alert>
          <Info className="size-4" aria-hidden="true" />
          <AlertTitle>Language does not widen disclosure</AlertTitle>
          <AlertDescription>
            <p>
              Language selection changes the value chosen for an
              already-authorized localisable field. It does not change the
              authorized Context and does not expand the field allow-list —
              requesting <C>es</C> on a <C>SOCIAL</C> Context still returns the
              four <C>SOCIAL</C> fields.
            </p>
          </AlertDescription>
        </Alert>

        <H3>Header parsing</H3>
        <ul className="max-w-3xl list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
          <li>
            Entries are ordered by <C>q</C> value (default <C>1</C>), ties
            broken by their position in the header.
          </li>
          <li>
            Region subtags collapse to the primary tag: <C>es-MX</C>,{" "}
            <C>es-419</C> and <C>ES</C> all select <C>es</C>.
          </li>
          <li>
            The first supported tag wins: <C>fr,en;q=0.8</C> selects <C>en</C>.
          </li>
          <li>
            <C>*</C> is ignored; a header with no supported tag, or no header at
            all, behaves as &quot;no preference&quot;.
          </li>
        </ul>

        <H3>Per-field fallback</H3>
        <P>
          Resolution happens per field, so a partially translated Context is
          never an error: the requested variant is used if it has text,
          otherwise the English/default value, otherwise any other stored
          variant. A field with no value at all stays <C>null</C> — except{" "}
          <C>pronouns</C>, which resolves to <C>&quot;hidden&quot;</C>.
        </P>

        <H3>Which fields respond to language</H3>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <Th>Context category</Th>
                <Th>Localisable response fields</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CONTEXT_CATEGORIES.map((category) => (
                <TableRow key={category.value}>
                  <Td className="break-all font-mono text-xs">
                    {category.value}
                  </Td>
                  <Td className="text-sm">
                    {LOCALISABLE_RESPONSE_FIELDS[category.value].length
                      ? LOCALISABLE_RESPONSE_FIELDS[category.value].join(", ")
                      : "None"}
                  </Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <P>
          Everything else is language-independent: <C>display_name</C>,{" "}
          <C>username</C>, <C>company</C>, <C>avatar_url</C>,{" "}
          <C>document_id</C>, <C>legal_first_name</C> and{" "}
          <C>legal_last_name</C> return the same value for every locale.
        </P>
      </DocsSection>
    </>
  );
}

export function GrantsArea() {
  return (
    <DocsSection id="grants" title={SECTION_TITLE.grants}>
      <P>
        A <strong>Grant</strong> is the standing record of one identity owner
        having authorized one application for one Context. Approving consent
        creates it — or reactivates it, if the same triple was revoked earlier —
        with scope <C>identity_context</C>. Authorizing a second Context for the
        same application creates a second, independent Grant.
      </P>
      <P>
        The identity owner manages Grants at{" "}
        <Link
          href={routes.console.grants}
          className="font-medium underline underline-offset-4"
        >
          Grants
        </Link>{" "}
        and reviews reads and revocations at{" "}
        <Link
          href={routes.console.activity}
          className="font-medium underline underline-offset-4"
        >
          Activity
        </Link>
        .
      </P>

      <H3>Revocation</H3>
      <P>
        Revoking a Grant marks the Grant revoked and, in the same transaction,
        revokes every non-revoked access token for that user/application/Context
        triple, then records an <C>ACCESS_REVOKED</C> entry. Revocation is{" "}
        <strong>idempotent</strong>: revoking an already-revoked Grant returns
        the same record without changing its timestamp, touching tokens again or
        writing a second audit entry.
      </P>

      <H3>What your application sees, and how access is restored</H3>
      <P>
        Your application is not notified. Because the tokens are revoked in the
        same transaction, the access token your server holds stops working at
        once, not at its expiry: the next call to{" "}
        <C>GET /api/v1/profiles/me</C> returns{" "}
        <C>401 Access token has been revoked</C> — the same status class as
        expiry, so a single handler covers both. Treat any <C>401</C> as
        &quot;access lost&quot; and discard the stored token.
      </P>
      <P>
        That token cannot be refreshed — there is no refresh token — and the
        authorization code that produced it was consumed at exchange.
        Re-authorization is required; nothing else restores access. The identity
        owner must approve your application again through a new{" "}
        <AreaLink slug="authorization">authorization request</AreaLink>, and
        your server exchanges the new code for a new access token. The{" "}
        <AreaLink slug="errors" hash="recovery">
          recovery sequence in the Error reference
        </AreaLink>{" "}
        lists each step.
      </P>
    </DocsSection>
  );
}

export function ErrorsArea() {
  return (
    <DocsSection id="errors" title={SECTION_TITLE.errors}>
      <P>
        Errors use a consistent JSON envelope. Schema validation failures add a{" "}
        <C>details</C> array.
      </P>
      <div className="grid gap-3 md:grid-cols-2">
        <CodeBlock label="Error envelope" code={CODE.errorEnvelope} />
        <CodeBlock
          label="Validation error envelope"
          code={CODE.validationEnvelope}
        />
      </div>

      <H3>Authorization — SecuriSelf Platform</H3>
      <ErrorTable
        caption="Conditions raised before any redirect back to your application."
        rows={[
          [
            "The identity owner is not signed in",
            "Redirected to SecuriSelf sign-in, then back to consent. No callback to your application.",
          ],
          [
            "Unregistered client_id",
            "400 Unknown client_id, shown on the SecuriSelf page.",
          ],
          [
            "redirect_uri differs from the registration",
            "400 redirect_uri does not match the registered redirect URI.",
          ],
          [
            "Missing or malformed query parameters",
            "The consent page reports an invalid authorization request; the API rejects the query with 400 Validation failed.",
          ],
          [
            "The owner denies consent",
            "403 Authorization request was denied by the user. No code, no redirect.",
          ],
          [
            "The selected Context does not belong to the owner",
            "403 You do not have access to this context (404 if it does not exist).",
          ],
        ]}
      />

      <H3>Token exchange — POST /oauth/token</H3>
      <ErrorTable
        caption="Conditions rejecting the authorization code exchange."
        rows={[
          ["Unknown client_id", "401 Invalid client credentials."],
          ["Incorrect client secret", "401 Invalid client credentials."],
          ["Unknown code", "400 Invalid authorization code."],
          [
            "Code issued to another application",
            "400 Authorization code was not issued to this client.",
          ],
          ["redirect_uri mismatch", "400 redirect_uri does not match."],
          [
            "Code older than AUTH_CODE_TTL_MINUTES",
            "400 Authorization code has expired.",
          ],
          [
            "Code already exchanged (replay)",
            "400 Authorization code has already been used.",
          ],
          [
            "Missing, extra or malformed body fields",
            "400 Validation failed with a details array.",
          ],
        ]}
      />

      <H3>Profile read — GET /api/v1/profiles/me</H3>
      <ErrorTable
        caption="Conditions rejecting a context-bound profile request."
        rows={[
          [
            "No Authorization header, or a non-Bearer scheme",
            "401 Missing access token.",
          ],
          [
            "Token not recognised (wrong value, or rotated away)",
            "401 Invalid access token.",
          ],
          [
            "Grant revoked by the identity owner",
            "401 Access token has been revoked.",
          ],
          [
            "Token older than ACCESS_TOKEN_TTL_HOURS",
            "401 Access token has expired.",
          ],
        ]}
      />
      <P>
        A <C>401</C> from the profile endpoint is never recoverable by retrying.
        Restart authorization instead.
      </P>

      {/* Cross-area link target; scroll-mt-32 clears the sticky bars. */}
      <div id="recovery" className="scroll-mt-32 space-y-4">
        <H3>Recovering from revoked or expired access</H3>
        <P>
          A profile read that worked before and now returns{" "}
          <C>401 Access token has been revoked</C> means the identity owner
          revoked the Grant — see{" "}
          <AreaLink slug="grants">Grants &amp; Revocation</AreaLink>. Access is
          restored only through a new approval:
        </P>
        <AuthorizationFlow steps={REVOCATION_RECOVERY} />
        <P>
          <C>401 Access token has expired</C> follows the same path from step 4,
          a new <AreaLink slug="authorization">authorization request</AreaLink>:
          there is no refresh token.
        </P>
      </div>
    </DocsSection>
  );
}

export function ReferenceIntegrationArea() {
  return (
    <DocsSection
      id="reference-integration"
      title={SECTION_TITLE["reference-integration"]}
    >
      <P>
        The <strong>PrymeCab simulator</strong> in this repository is a working
        third-party integration built on the contract above. It is a Next.js
        application that keeps every credential-handling step in route handlers,
        never in the browser bundle.
      </P>

      <H3>Flow</H3>
      <ol className="max-w-3xl list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
        <li>
          A &quot;Login with SecuriSelf&quot; button builds the authorization
          URL from <C>NEXT_PUBLIC_CLIENT_ID</C> and{" "}
          <C>NEXT_PUBLIC_REDIRECT_URI</C> and assigns{" "}
          <C>window.location.href</C>.
        </li>
        <li>
          The browser lands on the SecuriSelf Platform, the owner signs in if
          needed and selects one Context.
        </li>
        <li>
          SecuriSelf redirects to PrymeCab&apos;s callback route with{" "}
          <C>?code=…</C>.
        </li>
        <li>
          The callback route calls <C>POST /oauth/token</C> with{" "}
          <C>CLIENT_SECRET</C> — a server-only variable — and stores the access
          token in an <C>httpOnly</C> cookie scoped to <C>expires_in</C>.
        </li>
        <li>
          A PrymeCab API route reads the cookie and calls{" "}
          <C>GET /api/v1/profiles/me</C>, forwarding the browser&apos;s{" "}
          <C>Accept-Language</C> when present.
        </li>
        <li>
          The client component renders whatever fields the payload contains,
          without assuming any particular Context category.
        </li>
      </ol>

      <H3>Environment variables</H3>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <Th>Variable</Th>
              <Th>Boundary</Th>
              <Th>Purpose</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <Td className="break-all font-mono text-xs">
                NEXT_PUBLIC_SECURISELF_AUTHORIZE_URL
              </Td>
              <Td>
                <BoundaryTag kind="browser" />
              </Td>
              <Td className="text-sm">Platform authorization page.</Td>
            </TableRow>
            <TableRow>
              <Td className="break-all font-mono text-xs">
                NEXT_PUBLIC_CLIENT_ID
              </Td>
              <Td>
                <BoundaryTag kind="browser" />
              </Td>
              <Td className="text-sm">Registered client ID.</Td>
            </TableRow>
            <TableRow>
              <Td className="break-all font-mono text-xs">
                NEXT_PUBLIC_REDIRECT_URI
              </Td>
              <Td>
                <BoundaryTag kind="browser" />
              </Td>
              <Td className="text-sm">
                Callback URL, matching the registration exactly.
              </Td>
            </TableRow>
            <TableRow>
              <Td className="break-all font-mono text-xs">CLIENT_SECRET</Td>
              <Td>
                <BoundaryTag kind="server" />
              </Td>
              <Td className="text-sm">
                Token exchange only. Deliberately not prefixed{" "}
                <C>NEXT_PUBLIC_</C>.
              </Td>
            </TableRow>
            <TableRow>
              <Td className="break-all font-mono text-xs">NEXT_PUBLIC_API_URL</Td>
              <Td>
                <BoundaryTag kind="server" />
              </Td>
              <Td className="text-sm">
                SecuriSelf API base URL, used from route handlers.
              </Td>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <H3>Handling access loss</H3>
      <P>
        PrymeCab&apos;s profile route maps a <C>401</C> from SecuriSelf to an
        explicit <C>access_rejected</C> reason and its UI renders a distinct
        &quot;access lost&quot; state, separate from &quot;signed out&quot; and
        from a network failure. This is what the identity owner sees after
        revoking the Grant, and it is the behaviour worth copying: distinguish{" "}
        <em>never authorized</em> from <em>authorization withdrawn</em>, and
        re-offer the authorization flow rather than retrying the request.
      </P>
    </DocsSection>
  );
}

/** Area slug → content. The route resolves one entry per request. */
export const DOCS_AREA_CONTENT: Record<string, () => React.ReactElement> = {
  "": OverviewArea,
  setup: SetupArea,
  authorization: AuthorizationArea,
  "token-exchange": TokenExchangeArea,
  "profile-api": ProfileApiArea,
  contexts: ContextsArea,
  grants: GrantsArea,
  errors: ErrorsArea,
  "reference-integration": ReferenceIntegrationArea,
};
