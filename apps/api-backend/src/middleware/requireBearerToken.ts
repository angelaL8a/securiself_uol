import type { NextFunction, Request, Response } from "express";
import { extractBearerToken } from "../lib/bearer";
import { sha256 } from "../lib/crypto";
import { unauthorized } from "../lib/errors";
import { prisma } from "../lib/prisma";

export async function requireBearerToken(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const raw = extractBearerToken(req.headers.authorization);
    if (!raw) {
      throw unauthorized("Missing access token");
    }

    const accessToken = await prisma.accessToken.findUnique({
      where: { tokenHash: sha256(raw) },
      include: { user: true, application: true, context: true },
    });

    if (!accessToken) {
      throw unauthorized("Invalid access token");
    }
    if (accessToken.revokedAt) {
      throw unauthorized("Access token has been revoked");
    }
    if (accessToken.expiresAt.getTime() <= Date.now()) {
      throw unauthorized("Access token has expired");
    }

    req.tokenContext = {
      accessToken,
      user: accessToken.user,
      application: accessToken.application,
      context: accessToken.context,
    };
    next();
  } catch (error) {
    next(error);
  }
}
