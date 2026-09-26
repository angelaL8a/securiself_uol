/**
 * Safe E2E database preparation.
 *
 * Refuses to run unless:
 *  - NODE_ENV=test or SECURISELF_E2E=true
 *  - ALLOW_E2E_DB_RESET=true
 *  - target URL is not the development DATABASE_URL
 *
 * Env flags:
 *  - E2E_SKIP_SCHEMA_SYNC=true  skip prisma db push (used between tests)
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import {
  hashClientSecret,
  hashPassword,
} from "../../../apps/api-backend/src/lib/crypto";
import {
  E2E_CLIENT,
  E2E_CONTEXTS,
  E2E_USER,
} from "../fixtures/test-data";
import {
  loadE2EEnv,
  readBackendDatabaseUrl,
  resolveE2EDatabaseUrl,
  ROOT,
} from "./load-e2e-env";

function assertSafeToReset(targetUrl: string): void {
  const allowReset = process.env.ALLOW_E2E_DB_RESET === "true";
  const isTestEnv =
    process.env.NODE_ENV === "test" || process.env.SECURISELF_E2E === "true";

  if (!isTestEnv) {
    throw new Error(
      "Refusing E2E DB reset: set NODE_ENV=test or SECURISELF_E2E=true",
    );
  }
  if (!allowReset) {
    throw new Error(
      "Refusing E2E DB reset: set ALLOW_E2E_DB_RESET=true explicitly",
    );
  }

  const developmentUrl = readBackendDatabaseUrl();
  if (
    developmentUrl &&
    normalizeUrl(developmentUrl) === normalizeUrl(targetUrl)
  ) {
    throw new Error(
      "Refusing E2E DB reset: target URL matches development DATABASE_URL",
    );
  }

  if (!process.env.E2E_DATABASE_URL && !process.env.TEST_DATABASE_URL) {
    throw new Error(
      "Refusing E2E DB reset: URL must be provided via E2E_DATABASE_URL or TEST_DATABASE_URL",
    );
  }
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim();
  }
}

export async function prepareE2EDatabase(): Promise<void> {
  loadE2EEnv();
  process.env.SECURISELF_E2E = "true";
  if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
    process.env.NODE_ENV = "test";
  }

  const databaseUrl = resolveE2EDatabaseUrl();
  assertSafeToReset(databaseUrl);
  process.env.DATABASE_URL = databaseUrl;

  const backendDir = path.join(ROOT, "apps/api-backend");
  if (process.env.E2E_SKIP_SCHEMA_SYNC !== "true") {
    console.log("[e2e] Syncing Prisma schema to isolated E2E database…");
    execSync("pnpm exec prisma db push --accept-data-loss", {
      cwd: backendDir,
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: databaseUrl },
    });
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("[e2e] Clearing isolated E2E database…");
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "AuditLog", "AccessToken", "AuthorizationCode", "Grant", "Application", "Context", "User" RESTART IDENTITY CASCADE`,
    );

    console.log(
      "[e2e] Seeding deterministic identity owner and PrymeCab client…",
    );
    const passwordHash = await hashPassword(E2E_USER.password);
    const clientSecretHash = await hashClientSecret(E2E_CLIENT.clientSecret);

    const user = await prisma.user.create({
      data: {
        email: E2E_USER.email,
        passwordHash,
        legalFirstName: E2E_USER.legalFirstName,
        legalLastName: E2E_USER.legalLastName,
        displayName: E2E_USER.displayName,
        gender: E2E_USER.gender,
        avatarUrl: E2E_USER.avatarUrl,
      },
    });

    await prisma.context.createMany({
      data: [
        { userId: user.id, ...E2E_CONTEXTS.SOCIAL },
        { userId: user.id, ...E2E_CONTEXTS.LEGAL },
        { userId: user.id, ...E2E_CONTEXTS.PROFESSIONAL },
        { userId: user.id, ...E2E_CONTEXTS.PRIVATE },
      ],
    });

    await prisma.application.create({
      data: {
        userId: user.id,
        name: E2E_CLIENT.name,
        clientId: E2E_CLIENT.clientId,
        clientSecretHash,
        redirectUri: E2E_CLIENT.redirectUri,
      },
    });

    console.log("[e2e] Preparation complete.");
  } finally {
    await prisma.$disconnect();
  }
}

const isDirectRun = process.argv[1]?.replace(/\\/g, "/").includes("prepare-e2e");
if (isDirectRun) {
  prepareE2EDatabase().catch((error: unknown) => {
    console.error("[e2e] Preparation failed:", error);
    process.exit(1);
  });
}
