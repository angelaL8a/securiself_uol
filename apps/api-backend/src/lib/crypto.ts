import bcrypt from "bcrypt";
import { createHash, randomBytes, randomUUID } from "node:crypto";

const SALT_ROUNDS = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function hashClientSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, SALT_ROUNDS);
}

export function verifyClientSecret(
  secret: string,
  secretHash: string,
): Promise<boolean> {
  return bcrypt.compare(secret, secretHash);
}

/** Deterministic hash used to store/look up opaque tokens and codes. */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Opaque, high-entropy bearer token (returned to the caller only once). */
export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/** Human-pasteable secret/identifier value. */
export function generateSecret(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function newUuid(): string {
  return randomUUID();
}
