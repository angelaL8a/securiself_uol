import { CopyButton } from "@/components/shared/copy-button";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  /** Unique block label, e.g. "Token exchange — your server". */
  label: string;
  /** Accessible name for the copy button. Defaults to `Copy ${label}`. */
  copyLabel?: string;
  className?: string;
}

/**
 * A read-only code block with a labelled header and a copy button. Kept
 * separate from `PayloadPreview`, which only renders JSON-serializable values.
 */
export function CodeBlock({ code, label, copyLabel, className }: CodeBlockProps) {
  return (
    <div className={cn("overflow-hidden rounded-lg border bg-muted/40", className)}>
      <div className="flex items-center justify-between gap-2 border-b bg-muted/60 px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <CopyButton
          value={code}
          variant="ghost"
          size="icon"
          label={copyLabel ?? `Copy ${label}`}
        />
      </div>
      {/* tabIndex keeps the horizontal scroll region reachable by keyboard. */}
      <pre
        tabIndex={0}
        className="overflow-x-auto p-4 text-xs leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <code className="font-mono text-foreground/90">{code}</code>
      </pre>
    </div>
  );
}
