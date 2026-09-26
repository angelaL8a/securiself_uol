"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ContextCategoryBadge } from "@/components/shared/context-category-badge";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ContextForm } from "@/features/contexts/components/context-form";
import { DeleteContextDialog } from "@/features/contexts/components/delete-context-dialog";
import { useContext, useUpdateContext } from "@/features/contexts/hooks";
import { toContextPayload, type ContextFormValues } from "@/features/contexts/schemas";
import type { Context } from "@/features/contexts/types";
import { useVault } from "@/features/vault/hooks";
import { ApiError } from "@/lib/api-client";
import { routes } from "@/lib/routes";
import { formatDateTime } from "@/lib/utils";

function toFormValues(context: Context): ContextFormValues {
  return {
    category: context.category,
    internalName: context.internalName,
    displayName: context.displayName ?? "",
    username: context.username ?? "",
    pronouns: context.pronounsI18n?.en ?? context.pronouns ?? "",
    pronounsEs: context.pronounsI18n?.es ?? "",
    avatarUrl: context.avatarUrl ?? "",
    jobTitle: context.jobTitleI18n?.en ?? context.jobTitle ?? "",
    jobTitleEs: context.jobTitleI18n?.es ?? "",
    company: context.company ?? "",
    shortBio: context.shortBioI18n?.en ?? context.shortBio ?? "",
    shortBioEs: context.shortBioI18n?.es ?? "",
    documentId: context.documentId ?? "",
  };
}

export default function ContextDetailPage() {
  const params = useParams<{ contextId: string }>();
  const contextId = params.contextId;
  const { data, isLoading, isError, error, refetch } = useContext(contextId);
  const updateContext = useUpdateContext(contextId);
  const { data: vault } = useVault();

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link href={routes.console.contexts}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to contexts
          </Link>
        </Button>

        {isLoading ? (
          <LoadingState rows={2} />
        ) : isError ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : data ? (
          <>
            <PageHeader
              title={data.internalName}
              description={
                <span className="flex items-center gap-2">
                  <ContextCategoryBadge category={data.category} />
                  <span className="text-xs text-muted-foreground">
                    Updated {formatDateTime(data.updatedAt)}
                  </span>
                </span>
              }
              actions={
                <DeleteContextDialog
                  contextId={data.id}
                  contextName={data.internalName}
                />
              }
            />

            <ContextForm
              mode="edit"
              defaultValues={toFormValues(data)}
              vault={vault ?? undefined}
              isSubmitting={updateContext.isPending}
              onSubmit={(values) => {
                updateContext.mutate(toContextPayload(values), {
                  onSuccess: () => toast.success("Context updated"),
                  onError: (mutationError) => {
                    toast.error(
                      mutationError instanceof ApiError
                        ? mutationError.message
                        : "Could not update context",
                    );
                  },
                });
              }}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
