import { notFound } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { type PublicUser, serializeUser } from "../../lib/serializers";
import type { UpdateVaultInput } from "./vault.schemas";

export async function getVault(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw notFound("User not found");
  }
  return serializeUser(user);
}

export async function updateVault(
  userId: string,
  input: UpdateVaultInput,
): Promise<PublicUser> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: input,
  });
  return serializeUser(user);
}
