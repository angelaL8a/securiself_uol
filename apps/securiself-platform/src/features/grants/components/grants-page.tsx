"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { grantContextLabel } from "../grant-labels";
import { useGrants } from "../hooks";
import type { Grant } from "../types";
import { GrantsList } from "./grants-list";
import { RevokeContinuation } from "./revoke-continuation";

export function GrantsPage() {
  const { data, isLoading, isError, error, refetch } = useGrants();
  const [continuation, setContinuation] = useState<{
    applicationName: string;
    contextLabel: string;
  } | null>(null);

  const handleRevoked = (grant: Grant) => {
    setContinuation({
      applicationName: grant.application.name,
      contextLabel: grantContextLabel(grant.context),
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Grants"
        description="Current permissions: the applications that can access one of your identity Contexts now. Revoke a Grant to stop active access for that application–Context permission. What has already happened, such as profile reads and revocations, is recorded in Activity."
        actions={
          <Button asChild variant="outline">
            <Link href={routes.console.activity}>View Activity</Link>
          </Button>
        }
      />

      {continuation ? (
        <RevokeContinuation
          applicationName={continuation.applicationName}
          contextLabel={continuation.contextLabel}
        />
      ) : null}

      {isLoading ? (
        <LoadingState rows={3} />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data?.length ? (
        <EmptyState
          icon={KeyRound}
          title="No grants yet"
          description="When you approve an application such as PrymeCab, the resulting permission appears here so you can inspect or revoke it."
          action={
            <Button asChild variant="outline">
              <Link href={routes.console.clients}>View Clients</Link>
            </Button>
          }
        />
      ) : (
        <GrantsList grants={data} onRevoked={handleRevoked} />
      )}
    </div>
  );
}
