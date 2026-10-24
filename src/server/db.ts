import { Pool, types, type PoolClient } from "pg";
import { env } from "./env";

types.setTypeParser(1700, (v) => parseFloat(v)); // numeric -> number

const globalForPg = globalThis as unknown as { pgPool?: Pool };

/** Shared pool (survives Next dev hot reloads). Created on first use so env is validated lazily. */
export function pool(): Pool {
  if (!globalForPg.pgPool) {
    const e = env();
    const pool = new Pool({
      connectionString: e.DATABASE_URL,
      // With DATABASE_CA_CERT the server certificate is verified; without it the connection is encrypted but not verified.
      ssl: e.DATABASE_CA_CERT ? { ca: e.DATABASE_CA_CERT.replace(/\\n/g, "\n"), rejectUnauthorized: true } : { rejectUnauthorized: false },
      max: e.PG_POOL_MAX,
      // Release idle connections quickly so dev reloads don't hold on to the pooler's limited slots.
      idleTimeoutMillis: 10_000,
      // Integration tests run in their own schema (set at connection start) so they never touch real data.
      ...(e.PG_SCHEMA ? { options: `-c search_path=${e.PG_SCHEMA},extensions` } : {}),
    });
    globalForPg.pgPool = pool;
  }
  return globalForPg.pgPool;
}

export const query = <T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params?: unknown[]) =>
  pool().query<T>(sql, params);

/** Runs `fn` in a transaction: commit on success, rollback (and rethrow) on any error. */
export async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (e) {
    await client.query("rollback").catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}

export type { PoolClient };
