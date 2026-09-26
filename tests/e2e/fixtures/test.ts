import { test as base } from "@playwright/test";
import { runPrepareE2E } from "../setup/run-prepare";

/**
 * Reseeds the isolated E2E database before every test so audit/grant
 * assertions stay deterministic across the suite.
 */
export const test = base.extend({
  // eslint-disable-next-line no-empty-pattern
  reseedDatabase: [
    async ({}, use) => {
      runPrepareE2E({ skipSchemaSync: true });
      await use(undefined);
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
