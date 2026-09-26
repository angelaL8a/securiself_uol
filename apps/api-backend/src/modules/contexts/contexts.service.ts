import { Prisma, type Context } from "@prisma/client";
import { forbidden, notFound } from "../../lib/errors";
import { parseLocalizedVariants } from "../../lib/locale";
import { prisma } from "../../lib/prisma";
import { validateContextRules } from "./contextRules";
import type { CreateContextInput, UpdateContextInput } from "./contexts.schemas";

function nonempty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function compactI18n(
  en: string | null,
  es: string | null,
): { en?: string; es?: string } | null {
  const map: { en?: string; es?: string } = {};
  if (en) map.en = en;
  if (es) map.es = es;
  return Object.keys(map).length > 0 ? map : null;
}

function normalizeLocalizedField(
  value: string | null | undefined,
  i18n: { en?: string | null; es?: string | null } | null | undefined,
  existingValue?: string | null,
  existingI18n?: unknown,
): { value: string | null; i18n: { en?: string; es?: string } | null } {
  const existingMap = parseLocalizedVariants(existingI18n);
  let en = nonempty(existingMap?.en) ?? nonempty(existingValue);
  let es = nonempty(existingMap?.es);

  if (i18n?.en !== undefined) {
    en = nonempty(i18n.en);
  } else if (value !== undefined) {
    en = nonempty(value);
  }

  if (i18n?.es !== undefined) {
    es = nonempty(i18n.es);
  }

  return { value: en, i18n: compactI18n(en, es) };
}

function jsonOrNull(value: { en?: string; es?: string } | null) {
  return value ?? Prisma.JsonNull;
}

/** Loads a context and enforces that it belongs to the given user. */
export async function getOwnedContext(
  userId: string,
  contextId: string,
): Promise<Context> {
  const context = await prisma.context.findUnique({ where: { id: contextId } });
  if (!context) {
    throw notFound("Context not found");
  }
  if (context.userId !== userId) {
    throw forbidden("You do not have access to this context");
  }
  return context;
}

export async function createContext(
  userId: string,
  input: CreateContextInput,
): Promise<Context> {
  validateContextRules(input);

  const pronouns = normalizeLocalizedField(input.pronouns, input.pronounsI18n);
  const jobTitle = normalizeLocalizedField(input.jobTitle, input.jobTitleI18n);
  const shortBio = normalizeLocalizedField(input.shortBio, input.shortBioI18n);

  return prisma.context.create({
    data: {
      userId,
      category: input.category,
      internalName: input.internalName,
      displayName: input.displayName ?? null,
      username: input.username ?? null,
      pronouns: pronouns.value,
      pronounsI18n: jsonOrNull(pronouns.i18n),
      avatarUrl: input.avatarUrl ?? null,
      jobTitle: jobTitle.value,
      jobTitleI18n: jsonOrNull(jobTitle.i18n),
      company: input.company ?? null,
      shortBio: shortBio.value,
      shortBioI18n: jsonOrNull(shortBio.i18n),
      documentId: input.documentId ?? null,
      ...(input.isStrictRead !== undefined
        ? { isStrictRead: input.isStrictRead }
        : {}),
    },
  });
}

export function listContexts(userId: string): Promise<Context[]> {
  return prisma.context.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function updateContext(
  userId: string,
  contextId: string,
  input: UpdateContextInput,
): Promise<Context> {
  const existing = await getOwnedContext(userId, contextId);

  // Validate the rules against the merged result so partial updates can't
  // leave a context in an invalid state.
  validateContextRules({
    category: input.category ?? existing.category,
    internalName: input.internalName ?? existing.internalName,
    displayName:
      input.displayName !== undefined ? input.displayName : existing.displayName,
    username: input.username !== undefined ? input.username : existing.username,
    documentId:
      input.documentId !== undefined ? input.documentId : existing.documentId,
  });

  const {
    pronouns: _pronouns,
    pronounsI18n: _pronounsI18n,
    jobTitle: _jobTitle,
    jobTitleI18n: _jobTitleI18n,
    shortBio: _shortBio,
    shortBioI18n: _shortBioI18n,
    ...rest
  } = input;

  const localized: {
    pronouns?: string | null;
    pronounsI18n?: ReturnType<typeof jsonOrNull>;
    jobTitle?: string | null;
    jobTitleI18n?: ReturnType<typeof jsonOrNull>;
    shortBio?: string | null;
    shortBioI18n?: ReturnType<typeof jsonOrNull>;
  } = {};

  if (input.pronouns !== undefined || input.pronounsI18n !== undefined) {
    const next = normalizeLocalizedField(
      input.pronouns,
      input.pronounsI18n,
      existing.pronouns,
      existing.pronounsI18n,
    );
    localized.pronouns = next.value;
    localized.pronounsI18n = jsonOrNull(next.i18n);
  }
  if (input.jobTitle !== undefined || input.jobTitleI18n !== undefined) {
    const next = normalizeLocalizedField(
      input.jobTitle,
      input.jobTitleI18n,
      existing.jobTitle,
      existing.jobTitleI18n,
    );
    localized.jobTitle = next.value;
    localized.jobTitleI18n = jsonOrNull(next.i18n);
  }
  if (input.shortBio !== undefined || input.shortBioI18n !== undefined) {
    const next = normalizeLocalizedField(
      input.shortBio,
      input.shortBioI18n,
      existing.shortBio,
      existing.shortBioI18n,
    );
    localized.shortBio = next.value;
    localized.shortBioI18n = jsonOrNull(next.i18n);
  }

  return prisma.context.update({
    where: { id: contextId },
    data: {
      ...rest,
      ...localized,
    },
  });
}

export async function deleteContext(
  userId: string,
  contextId: string,
): Promise<void> {
  await getOwnedContext(userId, contextId);
  await prisma.context.delete({ where: { id: contextId } });
}
