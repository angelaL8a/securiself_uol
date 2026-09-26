import { getCategoryMeta } from "@/features/contexts/context-rules";
import type { ContextCategory } from "@/features/contexts/types";
import { StatusBadge, type StatusTone } from "./status-badge";

const CATEGORY_TONE: Record<ContextCategory, StatusTone> = {
  PROFESSIONAL: "info",
  LEGAL: "warning",
  SOCIAL: "success",
  PRIVATE: "neutral",
};

interface ContextCategoryBadgeProps {
  category: ContextCategory;
  className?: string;
}

export function ContextCategoryBadge({
  category,
  className,
}: ContextCategoryBadgeProps) {
  const meta = getCategoryMeta(category);
  return (
    <StatusBadge
      tone={CATEGORY_TONE[category]}
      icon={meta.icon}
      className={className}
    >
      {meta.shortLabel}
    </StatusBadge>
  );
}
