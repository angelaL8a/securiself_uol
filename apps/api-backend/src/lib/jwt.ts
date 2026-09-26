import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface SessionTokenPayload {
  sub: string;
}

export function signSessionToken(userId: string): string {
  const options: jwt.SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  };
  return jwt.sign({ sub: userId }, env.JWT_SECRET, options);
}

export function verifySessionToken(token: string): SessionTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof decoded.sub !== "string"
  ) {
    throw new Error("Invalid session token payload");
  }
  return { sub: decoded.sub };
}
