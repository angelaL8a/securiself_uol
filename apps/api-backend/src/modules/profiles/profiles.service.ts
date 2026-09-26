import type { Context, User } from "@prisma/client";
import {
  parseLocalizedVariants,
  resolveLocalizedText,
  type SupportedLocale,
} from "../../lib/locale";
import type { RequestMeta } from "../../lib/request";
import { recordAudit } from "../audit/audit.service";

export interface ProfileResponse {
  status: "success";
  context: Context["category"];
  data: Record<string, string | null>;
}

/**
 * Pure privacy filter. Given the root user and the authorised context, it
 * returns ONLY the fields allowed for that context's category. Forbidden root
 * fields (email, gender, legal identity outside LEGAL, documentId outside
 * LEGAL) are never included.
 */
function localized(
  scalar: string | null | undefined,
  i18n: unknown,
  locale: SupportedLocale | null,
): string | null {
  return resolveLocalizedText(parseLocalizedVariants(i18n), scalar, locale);
}

export function filterProfile(
  user: User,
  context: Context,
  locale: SupportedLocale | null = null,
): ProfileResponse {
  const pronouns =
    localized(context.pronouns, context.pronounsI18n, locale) ?? "hidden";

  switch (context.category) {
    case "SOCIAL":
      return {
        status: "success",
        context: context.category,
        data: {
          display_name: context.displayName ?? context.username,
          username: context.username,
          pronouns,
          avatar_url: context.avatarUrl,
        },
      };

    case "PROFESSIONAL":
      return {
        status: "success",
        context: context.category,
        data: {
          display_name: context.displayName,
          pronouns,
          job_title: localized(context.jobTitle, context.jobTitleI18n, locale),
          company: context.company,
          short_bio: localized(context.shortBio, context.shortBioI18n, locale),
          avatar_url: context.avatarUrl,
        },
      };

    case "LEGAL":
      return {
        status: "success",
        context: context.category,
        data: {
          legal_first_name: user.legalFirstName,
          legal_last_name: user.legalLastName,
          document_id: context.documentId,
          avatar_url: context.avatarUrl,
        },
      };

    case "PRIVATE":
      return {
        status: "success",
        context: context.category,
        data: {
          display_name: context.displayName ?? context.username,
          pronouns,
          avatar_url: context.avatarUrl,
        },
      };

    default: {
      const exhaustive: never = context.category;
      throw new Error(`Unsupported context category: ${String(exhaustive)}`);
    }
  }
}

export interface ProfileReadContext {
  user: User;
  context: Context;
  applicationId: string;
}

/** Builds the filtered profile payload and records a PROFILE_READ audit log. */
export async function readProfile(
  input: ProfileReadContext,
  meta: RequestMeta,
  locale: SupportedLocale | null = null,
): Promise<ProfileResponse> {
  const payload = filterProfile(input.user, input.context, locale);

  await recordAudit({
    userId: input.user.id,
    applicationId: input.applicationId,
    contextId: input.context.id,
    action: "PROFILE_READ",
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return payload;
}
