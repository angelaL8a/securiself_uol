import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  TEST_DATABASE_URL: z.string().optional(),
  PORT: z.coerce.number().int().positive().default(8080),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default("30d"),
  // OAuth 2.0 Web client ID from Google Cloud. Optional: when unset the
  // Google endpoint responds 503 and email/password auth is unaffected.
  GOOGLE_CLIENT_ID: z.string().optional(),
  AUTH_CODE_TTL_MINUTES: z.coerce.number().int().positive().default(5),
  ACCESS_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(1),
  CORS_ORIGIN: z
    .string()
    .default("http://localhost:3000,http://localhost:3001"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast with a readable message instead of a raw zod dump.
  console.error("Invalid environment configuration:");
  console.error(z.prettifyError(parsed.error));
  throw new Error("Invalid environment configuration");
}

const raw = parsed.data;

// During tests we transparently swap to the dedicated test database so the
// integration suite never touches development data.
const databaseUrl =
  raw.NODE_ENV === "test" && raw.TEST_DATABASE_URL
    ? raw.TEST_DATABASE_URL
    : raw.DATABASE_URL;

export const env = {
  ...raw,
  DATABASE_URL: databaseUrl,
  corsOrigins: raw.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export type Env = typeof env;
