import "dotenv/config";
import { execSync } from "node:child_process";
import { Client } from "pg";

/**
 * Runs once before the whole suite:
 *  1. Ensures the dedicated test database exists.
 *  2. Pushes the Prisma schema into it (no migration history needed for tests).
 */
export default async function setup(): Promise<void> {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error(
      "TEST_DATABASE_URL must be set (see .env.example) to run the test suite",
    );
  }

  await ensureDatabaseExists(testDatabaseUrl);

  execSync("pnpm exec prisma db push --accept-data-loss", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
  });
}

async function ensureDatabaseExists(connectionString: string): Promise<void> {
  // Fast path: if the target database is reachable it already exists. This is
  // also the only path that works for managed providers (e.g. Neon) where the
  // role can't CREATE DATABASE or connect to a "postgres" maintenance db.
  const direct = new Client({ connectionString });
  try {
    await direct.connect();
    await direct.end();
    return;
  } catch {
    await direct.end().catch(() => {});
  }

  const targetUrl = new URL(connectionString);
  const databaseName = decodeURIComponent(targetUrl.pathname.replace(/^\//, ""));

  // Connect to the maintenance database to create the test database if needed.
  const adminUrl = new URL(connectionString);
  adminUrl.pathname = "/postgres";
  adminUrl.search = "";

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const existing = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [databaseName],
    );
    if (existing.rowCount === 0) {
      // Database identifiers can't be parameterised; the name comes from our
      // own env file so this is safe here.
      await client.query(`CREATE DATABASE "${databaseName}"`);
    }
  } finally {
    await client.end();
  }
}
