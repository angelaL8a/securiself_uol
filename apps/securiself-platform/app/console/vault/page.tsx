"use client";

import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useVault } from "@/features/vault/hooks";
import { VaultForm } from "@/features/vault/components/vault-form";

export default function VaultPage() {
  const { data, isLoading, isError, error, refetch } = useVault();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Identity Vault"
        description="Manage your root identity data. It stays private by default and is never exposed directly to third-party applications."
      />

      <SectionCard
        title="Root identity"
        description="These fields form the source of truth for every context you create."
      >
        {isLoading ? (
          <LoadingState rows={3} />
        ) : isError ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : data ? (
          <VaultForm vault={data} />
        ) : null}
      </SectionCard>
    </div>
  );
}
