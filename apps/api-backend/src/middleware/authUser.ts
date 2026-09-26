import type { NextFunction, Request, Response } from "express";
import { extractBearerToken } from "../lib/bearer";
import { unauthorized } from "../lib/errors";
import { verifySessionToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";

export async function authUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw unauthorized("Missing session token");
    }

    let payload;
    try {
      payload = verifySessionToken(token);
    } catch {
      throw unauthorized("Invalid session token");
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw unauthorized("Invalid session token");
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
