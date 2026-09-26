import type { Request } from "express";
import type { User } from "@prisma/client";
import { unauthorized } from "./errors";

/** Returns the session user attached by authUser, or throws 401. */
export function getSessionUser(req: Request): User {
  if (!req.user) {
    throw unauthorized("Authentication required");
  }
  return req.user;
}

export interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

export function getRequestMeta(req: Request): RequestMeta {
  const userAgent = req.headers["user-agent"];
  return {
    ipAddress: req.ip ?? null,
    userAgent: typeof userAgent === "string" ? userAgent : null,
  };
}
