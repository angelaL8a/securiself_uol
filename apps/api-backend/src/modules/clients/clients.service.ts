import type { Application } from "@prisma/client";
import {
  generateSecret,
  hashClientSecret,
  newUuid,
} from "../../lib/crypto";
import { forbidden, notFound } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import type { CreateClientInput } from "./clients.schemas";

export type PublicApplication = Omit<Application, "clientSecretHash">;

export function serializeApplication(app: Application): PublicApplication {
  const { clientSecretHash: _hash, ...rest } = app;
  return rest;
}

function generateClientId(): string {
  return `scs_${newUuid().replace(/-/g, "")}`;
}

function generateClientSecret(): string {
  return `scs_secret_${generateSecret(32)}`;
}

/** Loads an application and enforces ownership by the given user. */
export async function getOwnedApplication(
  userId: string,
  applicationId: string,
): Promise<Application> {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
  });
  if (!app) {
    throw notFound("Application not found");
  }
  if (app.userId !== userId) {
    throw forbidden("You do not have access to this application");
  }
  return app;
}

export async function createClient(
  userId: string,
  input: CreateClientInput,
): Promise<{ application: PublicApplication; clientSecret: string }> {
  const clientSecret = generateClientSecret();
  const clientSecretHash = await hashClientSecret(clientSecret);

  const application = await prisma.application.create({
    data: {
      userId,
      name: input.name,
      redirectUri: input.redirectUri,
      clientId: generateClientId(),
      clientSecretHash,
    },
  });

  return { application: serializeApplication(application), clientSecret };
}

export async function listClients(
  userId: string,
): Promise<PublicApplication[]> {
  const apps = await prisma.application.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return apps.map(serializeApplication);
}

export async function getClient(
  userId: string,
  applicationId: string,
): Promise<PublicApplication> {
  const app = await getOwnedApplication(userId, applicationId);
  return serializeApplication(app);
}

export async function rotateClientSecret(
  userId: string,
  applicationId: string,
): Promise<{ application: PublicApplication; clientSecret: string }> {
  await getOwnedApplication(userId, applicationId);

  const clientSecret = generateClientSecret();
  const clientSecretHash = await hashClientSecret(clientSecret);

  const application = await prisma.application.update({
    where: { id: applicationId },
    data: { clientSecretHash },
  });

  return { application: serializeApplication(application), clientSecret };
}
