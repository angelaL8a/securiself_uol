"use client";

import { Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { ContextCategoryBadge } from "@/components/shared/context-category-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCategoryMeta } from "@/features/contexts/context-rules";
import { useContexts } from "@/features/contexts/hooks";
import { routes } from "@/lib/routes";
import { formatRelativeTime } from "@/lib/utils";

export default function ContextsPage() {
  const { data, isLoading, isError, error, refetch } = useContexts();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Contexts"
        description="Context-bound identities determine which version of you an application can access."
        actions={
          <Button asChild>
            <Link href={routes.console.newContext}>
              <Plus className="size-4" aria-hidden="true" />
              Create Context
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState rows={3} />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data?.length ? (
        <EmptyState
          icon={ShieldCheck}
          title="No contexts yet"
          description="Create your first context to control which version of your identity an app can access."
          action={
            <Button asChild>
              <Link href={routes.console.newContext}>Create Context</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((context) => {
            const meta = getCategoryMeta(context.category);
            return (
              <Link
                key={context.id}
                href={routes.console.context(context.id)}
                className="group"
              >
                <Card className="h-full transition-colors group-hover:border-primary/50">
                  <CardContent className="space-y-3 pt-6">
                    <div className="flex items-center justify-between">
                      <ContextCategoryBadge category={context.category} />
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(context.updatedAt)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-medium">{context.internalName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {context.displayName ??
                          context.username ??
                          "No display name"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {meta.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
