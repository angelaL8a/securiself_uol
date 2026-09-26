import { hashPassword, verifyPassword } from "../../lib/crypto";
import { conflict, unauthorized } from "../../lib/errors";
import { verifyGoogleIdToken } from "../../lib/googleIdToken";
import { signSessionToken } from "../../lib/jwt";
import { prisma } from "../../lib/prisma";
import { type PublicUser, serializeUser } from "../../lib/serializers";
import type {
  GoogleAuthInput,
  LoginInput,
  RegisterInput,
} from "./auth.schemas";

export interface AuthResult {
  user: PublicUser;
  token: string;
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const email = input.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw conflict("Email already registered");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      legalFirstName: input.legalFirstName ?? null,
      legalLastName: input.legalLastName ?? null,
    },
  });

  return { user: serializeUser(user), token: signSessionToken(user.id) };
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const email = input.email.toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    throw unauthorized("Invalid email or password");
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw unauthorized("Invalid email or password");
  }

  return { user: serializeUser(user), token: signSessionToken(user.id) };
}

/**
 * Authenticates an identity owner from a Google credential and returns the very
 * same session shape as email/password auth, so nothing downstream changes.
 *
 * Account resolution, in order:
 *  1. `googleId` match  -> returning Google user.
 *  2. verified email match -> links Google to the EXISTING SecuriSelf account,
 *     which is what keeps Vault, Contexts, Grants and Activity attached to one
 *     account instead of creating a duplicate.
 *  3. otherwise -> a brand new account.
 *
 * No Google profile claim (name, picture) is copied onto the User. `legalFirstName`
 * / `legalLastName` are the only root fields a LEGAL context can disclose, so
 * populating them from Google would silently turn Google data into third-party
 * disclosure data. They stay under the owner's explicit Vault control.
 */
export async function loginWithGoogle(
  input: GoogleAuthInput,
): Promise<AuthResult> {
  const identity = await verifyGoogleIdToken(input.credential);
  const email = identity.email.toLowerCase();

  let user = await prisma.user.findUnique({
    where: { googleId: identity.sub },
  });

  if (!user) {
    const existing = await prisma.user.findUnique({ where: { email } });
    user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { googleId: identity.sub },
        })
      : await prisma.user.create({ data: { email, googleId: identity.sub } });
  }

  return { user: serializeUser(user), token: signSessionToken(user.id) };
}
