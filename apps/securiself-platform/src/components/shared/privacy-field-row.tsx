import { EyeOff, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrivacyFieldRowProps {
  label: string;
  exposed: boolean;
  note?: string;
  className?: string;
}

/**
 * One row of the privacy matrix. Uses an icon + explicit text label in addition
 * to color so the exposed/blocked state never relies on color alone.
 */
export function PrivacyFieldRow({
  label,
  exposed,
  note,
  className,
}: PrivacyFieldRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border px-3 py-2",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">{label}</span>
        {note ? (
          <span className="text-xs text-muted-foreground">— {note}</span>
        ) : null}
      </div>
      {exposed ? (
        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          Shared
        </span>
      ) : (
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <EyeOff className="size-3.5" aria-hidden="true" />
          Blocked
        </span>
      )}
    </div>
  );
}
