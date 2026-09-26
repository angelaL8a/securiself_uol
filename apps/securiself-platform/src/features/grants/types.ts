import type { ApplicationClient } from "@/features/clients/types";
import type { ContextCategory } from "@/features/contexts/types";

/** Context fields projected on a Grant list item (not a full Context record). */
export interface GrantContextSummary {
  id: string;
  category: ContextCategory;
  internalName: string;
  displayName: string | null;
}

/** A permission binding returned by GET /api/v1/grants. */
export interface Grant {
  id: string;
  scope: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  application: ApplicationClient;
  context: GrantContextSummary;
}
