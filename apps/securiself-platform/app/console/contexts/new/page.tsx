"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ContextForm } from "@/features/contexts/components/context-form";
import { useCreateContext } from "@/features/contexts/hooks";
import { toContextPayload } from "@/features/contexts/schemas";
import { useVault } from "@/features/vault/hooks";
import { ApiError } from "@/lib/api-client";
import { routes } from "@/lib/routes";

export default function NewContextPage() {
  const router = useRouter();
  const createContext = useCreateContext();
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
        <PageHeader
          title="Create context"
          description="Define a new contextual identity and see exactly what an app would receive."
        />
      </div>

      <ContextForm
        mode="create"
        vault={vault ?? undefined}
        isSubmitting={createContext.isPending}
        onSubmit={(values) => {
          createContext.mutate(toContextPayload(values), {
            onSuccess: (context) => {
              toast.success("Context created");
              router.push(routes.console.context(context.id));
            },
            onError: (error) => {
              toast.error(
                error instanceof ApiError
                  ? error.message
                  : "Could not create context",
              );
            },
          });
        }}
      />
    </div>
  );
}
