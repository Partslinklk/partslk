import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

for (const f of [".env.local", ".env"]) if (existsSync(f)) process.loadEnvFile(f);

/**
 * Integration tests talk to a real Postgres, but only inside a throwaway schema (see tests/global-setup.ts):
 * every query is routed there through PG_SCHEMA, so production data is never read or written.
 * They use the session-pooler URL (MIGRATION_DATABASE_URL) because `set search_path` needs a session connection.
 */
const TEST_SCHEMA = "vitest_run"; // keep in sync with tests/global-setup.ts

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    fileParallelism: false, // the files share one schema
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL || "",
      PG_SCHEMA: TEST_SCHEMA,
      PG_POOL_MAX: "5",
      EMAIL_TOKEN_SECRET: "vitest-email-token-secret-0123456789",
      ADMIN_EMAIL: "admin@example.com",
      ADMIN_PASSWORD: "vitest-admin-password",
      PAYHERE_MERCHANT_ID: "1200000",
      PAYHERE_MERCHANT_SECRET: "test-merchant-secret",
      PAYHERE_ENV: "sandbox",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      // Never let a test talk to real services:
      STRIPE_SECRET_KEY: "",
      MAILTRAP_API_TOKEN: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
  },
});
