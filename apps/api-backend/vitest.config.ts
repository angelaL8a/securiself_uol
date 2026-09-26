import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // Integration tests share a single Postgres database, so they must not run
    // in parallel. Disable file-level parallelism and cap to a single worker.
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    env: {
      NODE_ENV: "test",
    },
    setupFiles: ["./tests/setup.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    hookTimeout: 60000,
    testTimeout: 30000,
  },
});
