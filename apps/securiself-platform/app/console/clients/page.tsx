"use client";

import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { CopyButton } from "@/components/shared/copy-button";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClients } from "@/features/clients/hooks";
import { routes } from "@/lib/routes";
import { formatDateTime } from "@/lib/utils";

export default function ClientsPage() {
  const { data, isLoading, isError, error, refetch } = useClients();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Clients"
        description="Registered third-party applications that can request access to your contexts."
        actions={
          <Button asChild>
            <Link href={routes.console.newClient}>
              <Plus className="size-4" aria-hidden="true" />
              Register Client
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
          icon={Users}
          title="No clients registered"
          description="Register an application to obtain a client ID and secret for the OAuth-like flow."
          action={
            <Button asChild>
              <Link href={routes.console.newClient}>Register Client</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Redirect URI</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={routes.console.client(client.id)}
                        className="hover:underline"
                      >
                        {client.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-xs text-muted-foreground">
                          {client.clientId}
                        </code>
                        <CopyButton
                          value={client.clientId}
                          size="icon"
                          variant="ghost"
                          label="Copy client ID"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground">
                      {client.redirectUri}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(client.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={routes.console.client(client.id)}>
                          Manage
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {data.map((client) => (
              <Link
                key={client.id}
                href={routes.console.client(client.id)}
                className="block rounded-lg border p-4"
              >
                <div className="font-medium">{client.name}</div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  {client.clientId}
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {client.redirectUri}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Created {formatDateTime(client.createdAt)}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
