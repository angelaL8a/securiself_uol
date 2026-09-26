import { execSync } from "node:child_process";
import { loadE2EEnv, ROOT } from "./load-e2e-env";

/** Runs prepare-e2e with api-backend module resolution (Prisma client). */
export function runPrepareE2E(options?: { skipSchemaSync?: boolean }): void {
  loadE2EEnv();
  execSync("pnpm exec tsx ../../tests/e2e/setup/prepare-e2e.ts", {
    cwd: `${ROOT}/apps/api-backend`,
    stdio: "inherit",
    env: {
      ...process.env,
      ALLOW_E2E_DB_RESET: "true",
      SECURISELF_E2E: "true",
      NODE_ENV: "test",
      E2E_SKIP_SCHEMA_SYNC: options?.skipSchemaSync ? "true" : "false",
    },
  });
}
