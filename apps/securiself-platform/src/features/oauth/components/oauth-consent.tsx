"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ContextCategoryBadge } from "@/components/shared/context-category-badge";
import { ErrorState } from "@/components/shared/error-state";
import { PayloadPreview } from "@/components/shared/payload-preview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/features/auth/auth-store";
import { buildProfilePayload } from "@/features/contexts/context-rules";
import { useContexts } from "@/features/contexts/hooks";
import { useVault } from "@/features/vault/hooks";
import { ApiError } from "@/lib/api-client";
import { routes, signInWithReturn } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useOAuthAuthorizeRequest, useOAuthDecision } from "../hooks";
import { oauthParamsSchema } from "../schemas";
import type { OAuthAuthorizeParams } from "../types";
import { ConsentNotShared } from "./consent-not-shared";

export function OAuthConsent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);

  const [selectedContextId, setSelectedContextId] = useState<string | null>(
    null,
  );
  const [denied, setDenied] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const params = useMemo<OAuthAuthorizeParams | null>(() => {
    const candidate = {
      client_id: searchParams.get("client_id") ?? "",
      redirect_uri: searchParams.get("redirect_uri") ?? "",
      response_type: searchParams.get("response_type") ?? "code",
      scope: searchParams.get("scope") ?? "identity_context",
    };
    const parsed = oauthParamsSchema.safeParse(candidate);
    return parsed.success ? parsed.data : null;
  }, [searchParams]);

  const currentUrl = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  // Redirect unauthenticated users to sign-in, returning here afterwards.
  useEffect(() => {
    if (hydrated && !token) {
      router.replace(signInWithReturn(currentUrl));
    }
  }, [hydrated, token, currentUrl, router]);

  const authorizeQuery = useOAuthAuthorizeRequest(params, {
    enabled: hydrated && Boolean(token),
  });
  const contextsQuery = useContexts();
  const vaultQuery = useVault();
  const decision = useOAuthDecision();

  // A 401 during the authorize fetch means the session is invalid: bounce to sign-in.
  useEffect(() => {
    if (
      authorizeQuery.error instanceof ApiError &&
      authorizeQuery.error.status === 401
    ) {
      router.replace(signInWithReturn(currentUrl));
    }
  }, [authorizeQuery.error, currentUrl, router]);

  const contextsById = useMemo(() => {
    const map = new Map(
      (contextsQuery.data ?? []).map((context) => [context.id, context]),
    );
    return map;
  }, [contextsQuery.data]);

  if (!hydrated || !token) {
    return <FullScreenLoader label="Checking your session…" />;
  }

  if (!params) {
    return (
      <Shell>
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden="true" />
          <AlertTitle>Invalid authorization request</AlertTitle>
          <AlertDescription>
            This authorization link is missing required parameters
            (client_id, redirect_uri, response_type, scope).
          </AlertDescription>
        </Alert>
      </Shell>
    );
  }

  if (authorizeQuery.isLoading) {
    return <FullScreenLoader label="Loading authorization request…" />;
  }

  if (authorizeQuery.isError) {
    return (
      <Shell>
        <ErrorState
          error={authorizeQuery.error}
          title="Could not load authorization request"
          onRetry={authorizeQuery.refetch}
        />
      </Shell>
    );
  }

  const view = authorizeQuery.data;
  if (!view) return null;

  if (denied) {
    return (
      <Shell>
        <Card>
          <CardHeader className="items-center text-center">
            <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <XCircle className="size-5" aria-hidden="true" />
            </div>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>
              You denied access to{" "}
              <span className="font-medium text-foreground">
                {view.application.name}
              </span>
              . No data was shared.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild variant="outline">
              <Link href={routes.console.root}>Go to console</Link>
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const availableContexts = view.availableContexts;
  const selected = selectedContextId
    ? contextsById.get(selectedContextId)
    : undefined;
  const selectedAvailable = availableContexts.find(
    (c) => c.id === selectedContextId,
  );

  // Prefer the full context (with job title, company, etc.) for the preview;
  // fall back to the limited fields returned by the authorize endpoint.
  const previewSource = selected ??
    (selectedAvailable
      ? {
          displayName: selectedAvailable.displayName,
          username: selectedAvailable.username,
          pronouns: selectedAvailable.pronouns,
          avatarUrl: selectedAvailable.avatarUrl,
        }
      : null);

  const previewPayload =
    selectedAvailable && previewSource
      ? buildProfilePayload(selectedAvailable.category, previewSource, {
          legalFirstName: vaultQuery.data?.legalFirstName,
          legalLastName: vaultQuery.data?.legalLastName,
        })
      : null;

  const submitDecision = (approved: boolean) => {
    if (approved && !selectedContextId) return;
    decision.mutate(
      {
        clientId: params.client_id,
        redirectUri: params.redirect_uri,
        contextId: selectedContextId ?? availableContexts[0]?.id ?? "",
        approved,
      },
      {
        onSuccess: (result) => {
          setRedirecting(true);
          window.location.assign(result.redirectTo);
        },
        onError: (error) => {
          // A denied decision returns 403 from the backend; treat as denied.
          if (!approved || (error instanceof ApiError && error.status === 403)) {
            setDenied(true);
          }
        },
      },
    );
  };

  return (
    <Shell>
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            SecuriSelf authorization
          </div>
          <CardTitle className="text-xl">
            {view.application.name} wants to access an identity context
          </CardTitle>
          <CardDescription>
            After you approve, this application will receive a context-bound
            profile. It redirects to{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              {view.application.redirectUri}
            </code>
            .
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {availableContexts.length === 0 ? (
            <Alert>
              <AlertTriangle className="size-4" aria-hidden="true" />
              <AlertTitle>No contexts available</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>
                  You need at least one context before you can authorize an
                  application.
                </p>
                <Button asChild size="sm">
                  <Link href={routes.console.newContext}>Create a context</Link>
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">
                  Choose which context to share
                </legend>
                <div
                  role="radiogroup"
                  aria-label="Select a context"
                  className="space-y-2"
                >
                  {availableContexts.map((context) => {
                    const isSelected = context.id === selectedContextId;
                    return (
                      <button
                        type="button"
                        key={context.id}
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setSelectedContextId(context.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "hover:bg-accent",
                        )}
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {context.internalName}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {context.displayName ??
                              context.username ??
                              "No display name"}
                          </div>
                        </div>
                        <ContextCategoryBadge category={context.category} />
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {previewPayload ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    What {view.application.name} will receive
                  </p>
                  <PayloadPreview
                    requestLine="GET /api/v1/profiles/me"
                    payload={{
                      status: "success",
                      context: selectedAvailable?.category,
                      data: previewPayload,
                    }}
                  />
                </div>
              ) : null}

              {selectedAvailable ? (
                <ConsentNotShared
                  applicationName={view.application.name}
                  category={selectedAvailable.category}
                />
              ) : null}

              <Alert>
                <ShieldCheck className="size-4" aria-hidden="true" />
                <AlertTitle>Only the selected context is shared</AlertTitle>
                <AlertDescription>
                  Only the selected context payload will be shared. Your other
                  contexts, and Vault data not included in that payload, remain
                  private.
                </AlertDescription>
              </Alert>

              <Separator />

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => submitDecision(false)}
                  disabled={decision.isPending || redirecting}
                >
                  <XCircle className="size-4" aria-hidden="true" />
                  Deny
                </Button>
                <Button
                  type="button"
                  onClick={() => submitDecision(true)}
                  disabled={
                    !selectedContextId || decision.isPending || redirecting
                  }
                >
                  {decision.isPending || redirecting ? (
                    <>
                      <Loader2
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                      {redirecting ? "Redirecting…" : "Approving…"}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      Approve & continue
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">{children}</div>
    </main>
  );
}

function FullScreenLoader({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-dvh items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
