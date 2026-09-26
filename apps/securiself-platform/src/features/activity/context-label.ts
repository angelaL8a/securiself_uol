import {
  grantContextInternalSecondary,
  grantContextLabel,
} from "@/features/grants/grant-labels";

export type ActivityContextRef = {
  displayName: string | null;
  internalName: string;
};

export function activityContextPrimary(
  contextId: string | null,
  byId: Map<string, ActivityContextRef>,
): string {
  if (!contextId) return "—";
  const context = byId.get(contextId);
  if (!context) return "Context unavailable";
  return grantContextLabel(context);
}

export function activityContextSecondary(
  contextId: string | null,
  byId: Map<string, ActivityContextRef>,
): string | null {
  if (!contextId) return null;
  const context = byId.get(contextId);
  if (!context) return null;
  return grantContextInternalSecondary(context);
}
