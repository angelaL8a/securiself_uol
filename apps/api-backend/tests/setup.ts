import { afterAll, beforeEach } from "vitest";
import { prisma } from "../src/lib/prisma";

// Reset all tables before every test so cases stay isolated.
beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "AuditLog", "AccessToken", "AuthorizationCode", "Grant", "Application", "Context", "User" RESTART IDENTITY CASCADE`,
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
