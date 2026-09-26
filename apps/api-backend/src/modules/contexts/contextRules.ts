import type { ContextCategory } from "@prisma/client";
import { badRequest } from "../../lib/errors";

export interface ContextRuleFields {
  category: ContextCategory;
  internalName?: string | null;
  displayName?: string | null;
  username?: string | null;
  pronouns?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  shortBio?: string | null;
  documentId?: string | null;
}

/**
 * Category-specific invariants enforced on create and update. These keep each
 * context meaningful for the privacy filtering applied at read time.
 */
export function validateContextRules(fields: ContextRuleFields): void {
  switch (fields.category) {
    case "SOCIAL":
      if (!fields.displayName && !fields.username) {
        throw badRequest(
          "A SOCIAL context requires a displayName or a username",
        );
      }
      break;

    case "PROFESSIONAL":
      if (!fields.displayName) {
        throw badRequest("A PROFESSIONAL context requires a displayName");
      }
      break;

    case "LEGAL":
      if (!fields.documentId) {
        throw badRequest("A LEGAL context requires a documentId");
      }
      break;

    case "PRIVATE":
      // No additional required fields for the conservative private context.
      break;

    default: {
      const exhaustive: never = fields.category;
      throw badRequest(`Unsupported context category: ${String(exhaustive)}`);
    }
  }
}
