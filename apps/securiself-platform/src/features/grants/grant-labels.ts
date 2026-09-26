import type { Grant, GrantContextSummary } from "./types";

/** Prefer display name, then internal name, for owner recognition. */
export function grantContextLabel(
  context: Pick<GrantContextSummary, "displayName" | "internalName">,
): string {
  const display = context.displayName?.trim();
  if (display) return display;
  return context.internalName;
}

/**
 * Secondary internal Context name when a distinct display name is shown.
 * Returns null when the primary label already is the internal name.
 */
export function grantContextInternalSecondary(
  context: Pick<GrantContextSummary, "displayName" | "internalName">,
): string | null {
  const display = context.displayName?.trim();
  if (!display) return null;
  const internal = context.internalName.trim();
  if (!internal || internal === display) return null;
  return internal;
}

export function isGrantActive(grant: Pick<Grant, "revokedAt">): boolean {
  return grant.revokedAt === null;
}

export function grantStatusLabel(
  grant: Pick<Grant, "revokedAt">,
): "Active" | "Revoked" {
  return isGrantActive(grant) ? "Active" : "Revoked";
}

/** Accessible name for the destructive revoke control. */
export function revokeActionLabel(
  applicationName: string,
  contextLabel: string,
): string {
  return `Revoke ${applicationName} access to ${contextLabel}`;
}
