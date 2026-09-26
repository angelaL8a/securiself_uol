import { Braces } from "lucide-react";
import { CopyButton } from "./copy-button";
import { cn } from "@/lib/utils";

interface PayloadPreviewProps {
  /** The JSON-serializable payload to render. */
  payload: unknown;
  /** Optional request line shown above the body, e.g. "GET /api/v1/profiles/me". */
  requestLine?: string;
  title?: string;
  className?: string;
  showCopy?: boolean;
  /** Accessible name for the copy button. Defaults to "Copy JSON". */
  copyLabel?: string;
}

/** Renders a JSON payload in a clean, monospaced code block. */
export function PayloadPreview({
  payload,
  requestLine,
  title = "Payload preview",
  className,
  showCopy = true,
  copyLabel = "Copy JSON",
}: PayloadPreviewProps) {
  const json = JSON.stringify(payload, null, 2);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-muted/40",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b bg-muted/60 px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Braces className="size-3.5" aria-hidden="true" />
          <span>{title}</span>
        </div>
        {showCopy ? (
          <CopyButton value={json} variant="ghost" label={copyLabel} />
        ) : null}
      </div>
      {/* tabIndex keeps the horizontal scroll region reachable by keyboard. */}
      <pre
        tabIndex={0}
        className="overflow-x-auto p-4 text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        {requestLine ? (
          <div className="mb-2 font-mono text-[11px] uppercase tracking-wide text-sky-600 dark:text-sky-400">
            {requestLine}
          </div>
        ) : null}
        <code className="font-mono text-foreground/90">{json}</code>
      </pre>
    </div>
  );
}
