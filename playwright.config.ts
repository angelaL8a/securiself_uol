import { defineConfig, devices } from "@playwright/test";
import {
  loadE2EEnv,
  resolveE2EDatabaseUrl,
} from "./tests/e2e/setup/load-e2e-env";
import { E2E_CLIENT, E2E_ORIGINS } from "./tests/e2e/fixtures/test-data";

loadE2EEnv();

const e2eDatabaseUrl = resolveE2EDatabaseUrl();
const reuseServers = process.env.E2E_REUSE_SERVERS === "true";

const sharedServerEnv = {
  ...process.env,
  // Keep Next production servers on NODE_ENV=production; API uses DATABASE_URL directly.
  SECURISELF_E2E: "true",
  DATABASE_URL: e2eDatabaseUrl,
  TEST_DATABASE_URL: e2eDatabaseUrl,
  E2E_DATABASE_URL: e2eDatabaseUrl,
  JWT_SECRET: process.env.JWT_SECRET ?? "e2e-jwt-secret-change-me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "30d",
  AUTH_CODE_TTL_MINUTES: process.env.AUTH_CODE_TTL_MINUTES ?? "5",
  ACCESS_TOKEN_TTL_HOURS: process.env.ACCESS_TOKEN_TTL_HOURS ?? "1",
  CORS_ORIGIN: "http://localhost:3000,http://localhost:3001",
  PORT: "8080",
  NEXT_PUBLIC_API_URL: E2E_ORIGINS.api,
  NEXT_PUBLIC_CLIENT_ID: E2E_CLIENT.clientId,
  CLIENT_SECRET: E2E_CLIENT.clientSecret,
  NEXT_PUBLIC_REDIRECT_URI: E2E_CLIENT.redirectUri,
  NEXT_PUBLIC_SECURISELF_AUTHORIZE_URL: `${E2E_ORIGINS.platform}/oauth/authorize`,
};

const apiServerEnv = {
  ...sharedServerEnv,
  NODE_ENV: "development",
};

const nextServerEnv = {
  ...sharedServerEnv,
  NODE_ENV: "production",
};

export default defineConfig({
  testDir: "./tests/e2e/specs",
  globalSetup: "./tests/e2e/setup/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  outputDir: "test-results",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: E2E_ORIGINS.platform,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter api-backend exec tsx src/index.ts",
      url: `${E2E_ORIGINS.api}/health`,
      reuseExistingServer: reuseServers,
      timeout: 120_000,
      env: apiServerEnv,
    },
    {
      // Production servers avoid Turbopack cache corruption under long suites.
      command: "pnpm --filter securiself-platform exec next start -p 3000",
      url: E2E_ORIGINS.platform,
      reuseExistingServer: reuseServers,
      timeout: 180_000,
      env: nextServerEnv,
    },
    {
      command: "pnpm --filter prymecab-simulator exec next start -p 3001",
      url: E2E_ORIGINS.prymecab,
      reuseExistingServer: reuseServers,
      timeout: 180_000,
      env: nextServerEnv,
    },
  ],
});
