"use client";

import { ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CopyButton } from "@/components/shared/copy-button";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RotateSecretDialog } from "@/features/clients/components/rotate-secret-dialog";
import { useClient } from "@/features/clients/hooks";
import { routes } from "@/lib/routes";
import { formatDateTime } from "@/lib/utils";

export default function ClientDetailPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const { data, isLoading, isError, error, refetch } = useClient(clientId);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href={routes.console.clients}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to clients
          </Link>
        </Button>

        {isLoading ? (
          <LoadingState rows={2} />
        ) : isError ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : data ? (
          <>
            <PageHeader
              title={data.name}
              description={`Registered ${formatDateTime(data.createdAt)}`}
              actions={
                <Button asChild variant="outline">
                  <Link href={routes.console.clientCredentials(data.id)}>
                    <KeyRound className="size-4" aria-hidden="true" />
                    Credentials
                  </Link>
                </Button>
              }
            />

            <SectionCard title="Application">
              <div className="space-y-4">
                <Field label="Client ID" value={data.clientId} copyable />
                <Field label="Redirect URI" value={data.redirectUri} />
                <Field
                  label="Created"
                  value={formatDateTime(data.createdAt)}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Credential management"
              description="Rotate the client secret if it may have been exposed. The current secret stops working immediately."
              actions={
                <RotateSecretDialog
                  clientId={data.id}
                  clientPublicId={data.clientId}
                />
              }
            >
              <p className="text-sm text-muted-foreground">
                The client secret is never stored in readable form and is only
                shown once at creation or rotation. Manage it from the{" "}
                <Link
                  href={routes.console.clientCredentials(data.id)}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  credentials page
                </Link>
                .
              </p>
            </SectionCard>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded-md border bg-muted px-3 py-2 font-mono text-xs">
          {value}
        </code>
        {copyable ? (
          <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} />
        ) : null}
      </div>
    </div>
  );
}
