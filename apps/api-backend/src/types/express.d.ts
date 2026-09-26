import type {
  AccessToken as PrismaAccessToken,
  Application as PrismaApplication,
  Context as PrismaContext,
  User as PrismaUser,
} from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      // Populated by the authUser middleware (session JWT).
      user?: PrismaUser;
      // Populated by the requireBearerToken middleware (OAuth access token).
      tokenContext?: {
        accessToken: PrismaAccessToken;
        user: PrismaUser;
        application: PrismaApplication;
        context: PrismaContext;
      };
    }
  }
}

export {};
