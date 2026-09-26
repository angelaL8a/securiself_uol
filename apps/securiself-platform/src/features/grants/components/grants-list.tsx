"use client";

import { CircleCheck, CircleSlash } from "lucide-react";
import { ContextCategoryBadge } from "@/components/shared/context-category-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import {
  grantContextLabel,
  grantStatusLabel,
  isGrantActive,
} from "../grant-labels";
import type { Grant } from "../types";
import { RevokeGrantDialog } from "./revoke-grant-dialog";

interface GrantsListProps {
  grants: Grant[];
  onRevoked?: (grant: Grant) => void;
}

function GrantStatus({ grant }: { grant: Grant }) {
  const active = isGrantActive(grant);
  return (
    <StatusBadge
      tone={active ? "success" : "neutral"}
      icon={active ? CircleCheck : CircleSlash}
    >
      {grantStatusLabel(grant)}
    </StatusBadge>
  );
}

export function GrantsList({ grants, onRevoked }: GrantsListProps) {
  return (
    <>
      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Application</TableHead>
              <TableHead>Context</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>First authorised</TableHead>
              <TableHead>Revoked</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grants.map((grant) => {
              const contextLabel = grantContextLabel(grant.context);
              const active = isGrantActive(grant);
              return (
                // Highlights the whole permission while its Revoke control has
                // keyboard focus, so the action reads with its row (A1).
                <TableRow key={grant.id} className="has-[:focus-visible]:bg-muted/50">
                  <TableCell className="font-medium">
                    <div>{grant.application.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {grant.application.clientId}
                    </div>
                  </TableCell>
                  <TableCell>{contextLabel}</TableCell>
                  <TableCell>
                    <ContextCategoryBadge category={grant.context.category} />
                  </TableCell>
                  <TableCell>
                    <GrantStatus grant={grant} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(grant.createdAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(grant.revokedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {active ? (
                      <RevokeGrantDialog grant={grant} onRevoked={onRevoked} />
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ul className="space-y-3 md:hidden">
        {grants.map((grant) => {
          const contextLabel = grantContextLabel(grant.context);
          const active = isGrantActive(grant);
          return (
            <li
              key={grant.id}
              className="rounded-lg border p-4 has-[:focus-visible]:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{grant.application.name}</div>
                  <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {grant.application.clientId}
                  </div>
                </div>
                <GrantStatus grant={grant} />
              </div>
              <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between gap-2">
                  <dt>Context</dt>
                  <dd className="text-foreground">{contextLabel}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Category</dt>
                  <dd>
                    <ContextCategoryBadge category={grant.context.category} />
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>First authorised</dt>
                  <dd>{formatDateTime(grant.createdAt)}</dd>
                </div>
                {!active ? (
                  <div className="flex justify-between gap-2">
                    <dt>Revoked</dt>
                    <dd>{formatDateTime(grant.revokedAt)}</dd>
                  </div>
                ) : null}
              </dl>
              {active ? (
                <div className="mt-3 flex justify-end">
                  <RevokeGrantDialog grant={grant} onRevoked={onRevoked} />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}
