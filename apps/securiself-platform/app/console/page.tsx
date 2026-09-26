"use client";

import {
  Activity as ActivityIcon,
  ArrowRight,
  Plus,
  ShieldCheck,
  Users,
  Vault as VaultIcon,
} from "lucide-react";
import Link from "next/link";
import { AuditActionBadge } from "@/components/shared/audit-action-badge";
import { ContextCategoryBadge } from "@/components/shared/context-category-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuditLogs } from "@/features/activity/hooks";
import { useCurrentUser } from "@/features/auth/hooks";
import { useClients } from "@/features/clients/hooks";
import { useContexts } from "@/features/contexts/hooks";
import { routes } from "@/lib/routes";
import { formatRelativeTime } from "@/lib/utils";

const VAULT_FIELDS = [
  "legalFirstName",
  "legalLastName",
  "displayName",
  "gender",
  "avatarUrl",
] as const;

export default function OverviewPage() {
  const userQuery = useCurrentUser();
  const contextsQuery = useContexts();
  const clientsQuery = useClients();
  const auditQuery = useAuditLogs();

  const user = userQuery.data;
  const filled = user
    ? VAULT_FIELDS.filter((field) => Boolean(user[field])).length
    : 0;
  const completion = Math.round((filled / VAULT_FIELDS.length) * 100);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome${user?.displayName ? `, ${user.displayName}` : ""}`}
        description="A snapshot of your contextual identity, registered apps and recent activity."
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<VaultIcon className="size-4.5" aria-hidden="true" />}
          label="Identity completion"
          value={`${completion}%`}
          hint={`${filled} of ${VAULT_FIELDS.length} vault fields set`}
          href={routes.console.vault}
        />
        <StatCard
          icon={<ShieldCheck className="size-4.5" aria-hidden="true" />}
          label="Contexts"
          value={contextsQuery.data?.length ?? 0}
          hint="Context-bound identities"
          href={routes.console.contexts}
        />
        <StatCard
          icon={<Users className="size-4.5" aria-hidden="true" />}
          label="Clients"
          value={clientsQuery.data?.length ?? 0}
          hint="Registered applications"
          href={routes.console.clients}
        />
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick actions</CardTitle>
          <CardDescription>Common setup steps.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            href={routes.console.vault}
            icon={<VaultIcon className="size-4" aria-hidden="true" />}
            label="Complete Vault"
          />
          <QuickAction
            href={routes.console.newContext}
            icon={<Plus className="size-4" aria-hidden="true" />}
            label="Create Context"
          />
          <QuickAction
            href={routes.console.newClient}
            icon={<Plus className="size-4" aria-hidden="true" />}
            label="Register Client"
          />
          <QuickAction
            href={routes.console.activity}
            icon={<ActivityIcon className="size-4" aria-hidden="true" />}
            label="View Activity"
          />
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Recent activity</CardTitle>
            <CardDescription>Your latest audit events.</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href={routes.console.activity}>
              View all
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {auditQuery.isLoading ? (
            <LoadingState rows={3} />
          ) : auditQuery.isError ? (
            <ErrorState error={auditQuery.error} onRetry={auditQuery.refetch} />
          ) : !auditQuery.data?.length ? (
            <EmptyState
              icon={ActivityIcon}
              title="No activity yet"
              description="Authorize an application to start recording audit events."
            />
          ) : (
            <ul className="divide-y">
              {auditQuery.data.slice(0, 5).map((log) => (
                <li
                  key={log.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <AuditActionBadge action={log.action} />
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(log.timestamp)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Contexts preview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Your contexts</CardTitle>
            <CardDescription>
              Each context controls a different disclosure of your identity.
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href={routes.console.contexts}>
              Manage
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {contextsQuery.isLoading ? (
            <LoadingState rows={2} />
          ) : contextsQuery.isError ? (
            <ErrorState
              error={contextsQuery.error}
              onRetry={contextsQuery.refetch}
            />
          ) : !contextsQuery.data?.length ? (
            <EmptyState
              icon={ShieldCheck}
              title="No contexts yet"
              description="Create your first context to control which version of your identity an app can access."
              action={
                <Button asChild size="sm">
                  <Link href={routes.console.newContext}>Create Context</Link>
                </Button>
              }
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {contextsQuery.data.map((context) => (
                <Link
                  key={context.id}
                  href={routes.console.context(context.id)}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
                >
                  <ContextCategoryBadge category={context.category} />
                  <span className="font-medium">{context.internalName}</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator className="opacity-0" />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint: string;
  href: string;
}) {
  return (
    <Link href={href} className="group">
      <Card className="h-full transition-colors group-hover:border-primary/50">
        <CardContent className="space-y-2 pt-6">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm font-medium">{label}</span>
            {icon}
          </div>
          <div className="text-3xl font-semibold tracking-tight">{value}</div>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Button asChild variant="outline" className="h-auto justify-start py-3">
      <Link href={href}>
        {icon}
        <span>{label}</span>
      </Link>
    </Button>
  );
}
