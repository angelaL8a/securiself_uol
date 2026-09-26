import { runPrepareE2E } from "./run-prepare";

/**
 * Reseeds the isolated DB immediately before tests.
 * App production builds are produced by `pnpm test:e2e:prepare`.
 */
export default async function globalSetup(): Promise<void> {
  runPrepareE2E({ skipSchemaSync: true });
}
