import { runPrepareE2E } from "./run-prepare";

/**
 * Reseeds the isolated DB immediately before tests.
 * App production builds are produced by `pnpm test:e2e:prepare`.
 */
export default async function globalSetup(): Promise<void> {
  process.env.E2E_SKIP_SCHEMA_SYNC = "true";
  runPrepareE2E({ skipSchemaSync: true });
}
