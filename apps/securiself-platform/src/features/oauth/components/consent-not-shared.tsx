import { EyeOff } from "lucide-react";
import { getNotSharedLabels } from "@/features/contexts/context-rules";
import type { ContextCategory } from "@/features/contexts/types";

interface ConsentNotSharedProps {
  applicationName: string;
  category: ContextCategory;
}

/**
 * Names notable information the application will not receive for the selected
 * Context (Cohort A, A4). Renders category-derived labels only, never values.
 */
export function ConsentNotShared({
  applicationName,
  category,
}: ConsentNotSharedProps) {
  return (
    <section
      aria-labelledby="consent-not-shared-heading"
      className="space-y-2"
      data-testid="consent-not-shared"
    >
      <p id="consent-not-shared-heading" className="text-sm font-medium">
        Not shared with {applicationName}
      </p>
      <p className="text-xs text-muted-foreground">
        Approving this Context does not give {applicationName} the following.
        Only the fields in the preview above are shared.
      </p>
      <ul className="flex flex-wrap gap-2">
        {getNotSharedLabels(category).map((label) => (
          <li
            key={label}
            className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
          >
            <EyeOff
              className="size-3.5 text-muted-foreground"
              aria-hidden="true"
            />
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}
