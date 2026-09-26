export type ContextCategory = "PROFESSIONAL" | "LEGAL" | "SOCIAL" | "PRIVATE";

/** A contextual identity owned by the user. */
export interface Context {
  id: string;
  userId: string;
  category: ContextCategory;
  internalName: string;
  displayName: string | null;
  username: string | null;
  pronouns: string | null;
  pronounsI18n: { en?: string | null; es?: string | null } | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  jobTitleI18n: { en?: string | null; es?: string | null } | null;
  company: string | null;
  shortBio: string | null;
  shortBioI18n: { en?: string | null; es?: string | null } | null;
  documentId: string | null;
  isStrictRead: boolean;
  createdAt: string;
  updatedAt: string;
}
