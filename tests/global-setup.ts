import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const SCHEMA = "vitest_run";

function connect() {
  const url = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Set MIGRATION_DATABASE_URL (or DATABASE_URL) in .env to run the integration tests.");
  return new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
}

/** Builds a fresh schema with every migration applied; dropped again when the run ends. */
export async function setup() {
  const db = connect();
  await db.connect();
  try {
    await db.query(`drop schema if exists ${SCHEMA} cascade`);
    await db.query(`create schema ${SCHEMA}`);
    // `extensions` holds pgcrypto (gen_random_bytes) on Supabase. `public` is deliberately NOT on the path.
    await db.query(`set search_path to ${SCHEMA}, extensions`);
    const dir = path.join(process.cwd(), "db", "migrations");
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      await db.query(readFileSync(path.join(dir, file), "utf8"));
    }
  } finally {
    await db.end();
  }
}

export async function teardown() {
  const db = connect();
  await db.connect();
  try {
    await db.query(`drop schema if exists ${SCHEMA} cascade`);
  } finally {
    await db.end();
  }
}
