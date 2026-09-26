import type { User } from "@prisma/client";

export type PublicUser = Omit<User, "passwordHash" | "googleId">;

/** Strips credentials (password hash, Google subject) before a user is returned. */
export function serializeUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, googleId: _googleId, ...rest } = user;
  return rest;
}
