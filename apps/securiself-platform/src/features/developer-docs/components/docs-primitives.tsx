import { Globe, Laptop, Server } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { BoundaryKind } from "../developer-docs";

/**
 * Shared building blocks for the documentation areas. Table cells default to
 * `whitespace-nowrap`, which makes these prose-heavy tables overflow into a
 * scroll container instead of wrapping; `Th`/`Td` re-enable wrapping and
 * top-align the content.
 */
export function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TableHead className={cn("whitespace-normal", className)}>
      {children}
    </TableHead>
  );
}

export function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TableCell className={cn("whitespace-normal align-top", className)}>
      {children}
    </TableCell>
  );
}

/** Inline code, used for endpoints, parameters and header names. */
export function C({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
      {children}
    </code>
  );
}

/** Prose paragraph constrained to a readable measure. */
export function P({ children }: { children: React.ReactNode }) {
  return <p className="max-w-3xl text-sm leading-relaxed">{children}</p>;
}

export function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="pt-2 text-sm font-semibold tracking-tight">{children}</h3>
  );
}

export function Endpoint({ method, path }: { method: string; path: string }) {
  return (
    <p className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">
      <span className="font-semibold uppercase">{method}</span>
      <span className="break-all">{path}</span>
    </p>
  );
}

const BOUNDARY = {
  browser: { icon: Laptop, label: "Browser" },
  server: { icon: Server, label: "Your server" },
  securiself: { icon: Globe, label: "SecuriSelf" },
} as const;

/** Boundary marker: icon + text, so the distinction is never colour-only. */
export function BoundaryTag({ kind }: { kind: BoundaryKind }) {
  const config = BOUNDARY[kind];
  const Icon = config.icon;

  return (
    <span className="flex items-center gap-1.5 text-xs font-medium">
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {config.label}
    </span>
  );
}

/** One or two boundary tags; two mean the value is handed from one to the other. */
export function BoundaryTags({ kinds }: { kinds: BoundaryKind[] }) {
  return (
    <span className="flex flex-col gap-1">
      {kinds.map((kind, index) => (
        <span key={kind} className="flex flex-col gap-1">
          {index > 0 ? (
            <span className="text-xs text-muted-foreground">then</span>
          ) : null}
          <BoundaryTag kind={kind} />
        </span>
      ))}
    </span>
  );
}

export function ErrorTable({
  caption,
  rows,
}: {
  caption: string;
  rows: [string, string][];
}) {
  return (
    <div className="rounded-lg border">
      <Table>
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <TableRow>
            <Th className="w-2/5">Condition</Th>
            <Th>Expected behaviour</Th>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(([condition, behaviour]) => (
            <TableRow key={condition}>
              <Td className="text-sm font-medium">{condition}</Td>
              <Td className="text-sm">{behaviour}</Td>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
