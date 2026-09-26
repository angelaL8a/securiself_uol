import { execSync } from "node:child_process";
import { cleanNextCaches } from "./clean-next-caches";
import { loadE2EEnv, ROOT } from "./load-e2e-env";
import { E2E_CLIENT, E2E_ORIGINS } from "../fixtures/test-data";

/**
 * Builds Platform and PrymeCab for production so Playwright can use
 * `next start` instead of Turbopack `next dev` (more stable under long suites).
 */
export function buildE2EApps(): void {
  loadE2EEnv();
  cleanNextCaches();

  const env = {
    ...process.env,
    NEXT_PUBLIC_API_URL: E2E_ORIGINS.api,
    NEXT_PUBLIC_CLIENT_ID: E2E_CLIENT.clientId,
    CLIENT_SECRET: E2E_CLIENT.clientSecret,
    NEXT_PUBLIC_REDIRECT_URI: E2E_CLIENT.redirectUri,
    NEXT_PUBLIC_SECURISELF_AUTHORIZE_URL: `${E2E_ORIGINS.platform}/oauth/authorize`,
  };

  console.log("[e2e] Building securiself-platform for production…");
  execSync("pnpm --filter securiself-platform build", {
    cwd: ROOT,
    stdio: "inherit",
    env,
  });

  console.log("[e2e] Building prymecab-simulator for production…");
  execSync("pnpm --filter prymecab-simulator build", {
    cwd: ROOT,
    stdio: "inherit",
    env,
  });
}
