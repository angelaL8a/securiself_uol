import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral:
    "border-border bg-muted text-muted-foreground",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  success:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  danger:
    "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
};

interface StatusBadgeProps {
  tone?: StatusTone;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

/**
 * A badge that always pairs an icon and text so meaning is never conveyed by
 * color alone (accessibility requirement).
 */
export function StatusBadge({
  tone = "neutral",
  icon: Icon,
  children,
  className,
}: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-medium", TONE_CLASSES[tone], className)}
    >
      {Icon ? <Icon className="size-3" aria-hidden="true" /> : null}
      {children}
    </Badge>
  );
}
