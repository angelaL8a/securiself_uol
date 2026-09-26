"use client";

import { ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CopyButton } from "@/components/shared/copy-button";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RotateSecretDialog } from "@/features/clients/components/rotate-secret-dialog";
import { useClient } from "@/features/clients/hooks";
import { routes } from "@/lib/routes";

export default function ClientCredentialsPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const { data, isLoading, isError, error, refetch } = useClient(clientId);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link
            href={data ? routes.console.client(data.id) : routes.console.clients}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to client
          </Link>
        </Button>

        {isLoading ? (
          <LoadingState rows={2} />
        ) : isError ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : data ? (
          <>
            <PageHeader
              title="Credentials"
              description={`Manage credentials for ${data.name}.`}
              actions={
                <RotateSecretDialog
                  clientId={data.id}
                  clientPublicId={data.clientId}
                />
              }
            />

            <SectionCard title="Client ID">
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md border bg-muted px-3 py-2 font-mono text-xs">
                  {data.clientId}
                </code>
                <CopyButton value={data.clientId} label="Copy client ID" />
              </div>
            </SectionCard>

            <SectionCard title="Client secret">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Current secret</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-md border bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
                      {"•".repeat(40)}
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The client secret is hashed and cannot be displayed. It is
                    only shown once, at creation or right after a rotation.
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Redirect URI">
              <code className="block truncate rounded-md border bg-muted px-3 py-2 font-mono text-xs">
                {data.redirectUri}
              </code>
            </SectionCard>

            <Alert>
              <ShieldAlert className="size-4" aria-hidden="true" />
              <AlertTitle>Security notes</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-4">
                  <li>Never embed the client secret in frontend code.</li>
                  <li>
                    Rotate the secret immediately if you suspect it was exposed.
                  </li>
                  <li>
                    The redirect URI must exactly match the one used in the
                    authorization request.
                  </li>
                </ul>
              </AlertDescription>
            </Alert>
          </>
        ) : null}
      </div>
    </div>
  );
}
