"use client";

import { LogOut, ShieldCheck } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCurrentUser, useLogout } from "@/features/auth/hooks";

export default function SettingsPage() {
  const { data: user, isLoading, isError, error, refetch } = useCurrentUser();
  const logout = useLogout();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your account and session."
      />

      {isLoading ? (
        <LoadingState rows={2} />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          <SectionCard title="Account">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <div className="rounded-md border bg-muted px-3 py-2 text-sm">
                  {user?.email ?? "—"}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Session</Label>
                <div>
                  <StatusBadge tone="success" icon={ShieldCheck}>
                    Active session
                  </StatusBadge>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Session"
            description="End your session on this device."
          >
            <Button variant="outline" onClick={logout}>
              <LogOut className="size-4" aria-hidden="true" />
              Log out
            </Button>
          </SectionCard>

          <SectionCard
            title="Danger zone"
            description="Destructive account actions."
            className="border-destructive/40"
          >
            <p className="text-sm text-muted-foreground">
              Account deletion is not available in this prototype.
            </p>
          </SectionCard>
        </>
      )}
    </div>
  );
}
