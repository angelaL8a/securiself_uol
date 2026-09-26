import { ShieldAlert } from "lucide-react";
import {
  Table,
  TableBody,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CREDENTIAL_LIFECYCLE } from "../developer-docs";
import { BoundaryTags, Td, Th } from "./docs-primitives";

/**
 * Credential and authorization-artifact reference.
 *
 * A table rather than a diagram: the external evaluation showed the friction
 * was in the *attributes* of each value (who holds it, whether a browser may
 * see it, when it is used), which a row/column layout states precisely and a
 * boxes-and-arrows picture only implies. Server-only values carry an icon and
 * the word "Never", so the boundary is never communicated by colour alone.
 */
export function CredentialLifecycle() {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <caption className="sr-only">
          Each credential and authorization artifact in the SecuriSelf
          integration flow, with its holder, browser exposure, stage and
          purpose.
        </caption>
        <TableHeader>
          <TableRow>
            <Th className="w-[15%]">Value</Th>
            <Th className="w-[12%]">Held by</Th>
            <Th className="w-[23%]">Browser exposure</Th>
            <Th className="w-[20%]">Stage of the flow</Th>
            <Th>Purpose</Th>
          </TableRow>
        </TableHeader>
        <TableBody>
          {CREDENTIAL_LIFECYCLE.map((row) => (
            <TableRow key={row.value}>
              <Td className="break-all font-mono text-xs">{row.value}</Td>
              <Td>
                <BoundaryTags kinds={row.holder} />
              </Td>
              <Td className="text-sm">
                {row.serverOnly ? (
                  <span className="flex items-start gap-1.5">
                    <ShieldAlert
                      className="mt-0.5 size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{row.exposure}</span>
                  </span>
                ) : (
                  row.exposure
                )}
              </Td>
              <Td className="text-sm">{row.stage}</Td>
              <Td className="text-sm">{row.purpose}</Td>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
