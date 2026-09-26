import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";

const ROOT = path.resolve(__dirname, "../../..");

/**
 * Loads `.env.e2e` from the repo root (preferred), then falls back to
 * `apps/api-backend/.env` for shared JWT/DB values when present.
 */
export function loadE2EEnv(): void {
  const e2ePath = path.join(ROOT, ".env.e2e");
  const backendEnvPath = path.join(ROOT, "apps/api-backend/.env");

  if (existsSync(e2ePath)) {
    loadDotenv({ path: e2ePath, override: true });
  }

  if (existsSync(backendEnvPath)) {
    // Fill gaps only (do not override explicit E2E values).
    loadDotenv({ path: backendEnvPath, override: false });
  }

  // Map dedicated E2E URL onto the Prisma/runtime keys used by apps.
  const e2eUrl = process.env.E2E_DATABASE_URL || process.env.TEST_DATABASE_URL;
  if (e2eUrl) {
    process.env.E2E_DATABASE_URL = e2eUrl;
    process.env.TEST_DATABASE_URL = e2eUrl;
  }
}

export function readBackendDatabaseUrl(): string | undefined {
  const backendEnvPath = path.join(ROOT, "apps/api-backend/.env");
  if (!existsSync(backendEnvPath)) return process.env.DATABASE_URL;
  const content = readFileSync(backendEnvPath, "utf8");
  const match = content.match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
  return match?.[1] ?? process.env.DATABASE_URL;
}

export function resolveE2EDatabaseUrl(): string {
  const url = process.env.E2E_DATABASE_URL || process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "E2E_DATABASE_URL or TEST_DATABASE_URL must be set (see .env.e2e.example)",
    );
  }
  return url;
}

export { ROOT };
