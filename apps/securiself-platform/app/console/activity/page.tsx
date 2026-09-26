"use client";

import { Activity as ActivityIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AUDIT_ACTIONS,
  AuditActionBadge,
} from "@/components/shared/audit-action-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuditAction } from "@/features/activity/types";
import { useAuditLogs } from "@/features/activity/hooks";
import {
  activityContextPrimary,
  activityContextSecondary,
} from "@/features/activity/context-label";
import { useClients } from "@/features/clients/hooks";
import { useContexts } from "@/features/contexts/hooks";
import { routes } from "@/lib/routes";
import { formatDateTime } from "@/lib/utils";

const ALL = "ALL";

export default function ActivityPage() {
  const { data, isLoading, isError, error, refetch } = useAuditLogs();
  const clientsQuery = useClients();
  const contextsQuery = useContexts();
  const [actionFilter, setActionFilter] = useState<AuditAction | typeof ALL>(
    ALL,
  );

  const clientName = useMemo(() => {
    const map = new Map<string, string>();
    for (const client of clientsQuery.data ?? []) map.set(client.id, client.name);
    return map;
  }, [clientsQuery.data]);

  const contextById = useMemo(() => {
    const map = new Map<
      string,
      { displayName: string | null; internalName: string }
    >();
    for (const context of contextsQuery.data ?? []) {
      map.set(context.id, {
        displayName: context.displayName,
        internalName: context.internalName,
      });
    }
    return map;
  }, [contextsQuery.data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (actionFilter === ALL) return data;
    return data.filter((log) => log.action === actionFilter);
  }, [data, actionFilter]);

  const appLabel = (applicationId: string | null) =>
    applicationId ? clientName.get(applicationId) ?? applicationId : "—";

  const ctxPrimary = (contextId: string | null) =>
    activityContextPrimary(contextId, contextById);

  const ctxSecondary = (contextId: string | null) =>
    activityContextSecondary(contextId, contextById);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Activity"
        description="A record of what has happened: an append-only audit log of every grant, profile read, revocation and anomaly, newest first. Activity does not change access; to see or revoke what applications can access now, open Grants."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={actionFilter}
              onValueChange={(value) =>
                setActionFilter(value as AuditAction | typeof ALL)
              }
            >
              <SelectTrigger
                className="w-[200px]"
                aria-label="Filter by action"
              >
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All actions</SelectItem>
                {AUDIT_ACTIONS.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild variant="outline">
              <Link href={routes.console.grants}>Manage current Grants</Link>
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <LoadingState rows={4} />
      ) : isError ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !filtered.length ? (
        <EmptyState
          icon={ActivityIcon}
          title={
            data?.length ? "No events match this filter" : "No activity yet"
          }
          description={
            data?.length
              ? "Try selecting a different action."
              : "Authorize an application to start recording audit events."
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden rounded-lg border lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead>Context</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>IP address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <AuditActionBadge action={log.action} />
                    </TableCell>
                    <TableCell>{appLabel(log.applicationId)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <div>{ctxPrimary(log.contextId)}</div>
                      {ctxSecondary(log.contextId) ? (
                        <div className="text-xs">
                          Internal name: {ctxSecondary(log.contextId)}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(log.timestamp)}
                    </TableCell>
                    <TableCell
                      className="max-w-[160px] truncate font-mono text-xs text-muted-foreground"
                      title={log.userAgent ?? undefined}
                    >
                      {log.ipAddress ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile timeline */}
          <ol className="space-y-3 lg:hidden">
            {filtered.map((log) => (
              <li key={log.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <AuditActionBadge action={log.action} />
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(log.timestamp)}
                  </span>
                </div>
                <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between gap-2">
                    <dt>Application</dt>
                    <dd className="text-foreground">
                      {appLabel(log.applicationId)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Context</dt>
                    <dd className="text-right text-foreground">
                      <div>{ctxPrimary(log.contextId)}</div>
                      {ctxSecondary(log.contextId) ? (
                        <div className="text-muted-foreground">
                          Internal name: {ctxSecondary(log.contextId)}
                        </div>
                      ) : null}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>IP address</dt>
                    <dd className="font-mono">{log.ipAddress ?? "—"}</dd>
                  </div>
                  {log.userAgent ? (
                    <div className="flex justify-between gap-2">
                      <dt>User agent</dt>
                      <dd className="max-w-[60%] truncate" title={log.userAgent}>
                        {log.userAgent}
                      </dd>
                    </div>
                  ) : null}
                  {log.metadata ? (
                    <div className="pt-1">
                      <dt className="mb-1">Metadata</dt>
                      <dd>
                        <code className="block overflow-x-auto rounded border bg-muted px-2 py-1 font-mono text-[11px]">
                          {JSON.stringify(log.metadata)}
                        </code>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
