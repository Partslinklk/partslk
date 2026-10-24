import { randomBytes } from "crypto";
import { query, tx } from "./db";

/**
 * Admin session signing keys live in the database and rotate by themselves:
 * a new random key is made once the newest is ROTATE_DAYS old, and the previous key keeps
 * verifying for GRACE_DAYS more, so rotation never signs anyone out mid-session.
 */
const ROTATE_DAYS = 7;
const GRACE_DAYS = 3;
const CACHE_MS = 60_000;

export type SigningKeys = { current: string; all: string[] };

const g = globalThis as unknown as { adminKeyCache?: { at: number; keys: SigningKeys } };

async function load(): Promise<SigningKeys | null> {
  const { rows } = await query<{ secret: string; fresh: boolean }>(
    `select secret, created_at > now() - make_interval(days => $1) as fresh
       from admin_signing_keys where expires_at > now() order by created_at desc`,
    [ROTATE_DAYS],
  );
  if (!rows.length || !rows[0].fresh) return null;
  return { current: rows[0].secret, all: rows.map((r) => r.secret) };
}

/** The key to sign with plus every still-valid key to verify against. Creates/rotates the key when needed. */
export async function signingKeys(): Promise<SigningKeys> {
  const cached = g.adminKeyCache;
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.keys;

  let keys = await load();
  if (!keys) {
    keys = await tx(async (client) => {
      await client.query("select pg_advisory_xact_lock(hashtext('admin_signing_keys'))");
      // Another request may have rotated while we waited for the lock.
      const again = await client.query<{ secret: string; fresh: boolean }>(
        `select secret, created_at > now() - make_interval(days => $1) as fresh
           from admin_signing_keys where expires_at > now() order by created_at desc`,
        [ROTATE_DAYS],
      );
      if (again.rows[0]?.fresh) return { current: again.rows[0].secret, all: again.rows.map((r) => r.secret) };
      const secret = randomBytes(32).toString("hex");
      await client.query(
        "insert into admin_signing_keys (secret, expires_at) values ($1, now() + make_interval(days => $2))",
        [secret, ROTATE_DAYS + GRACE_DAYS],
      );
      await client.query("delete from admin_signing_keys where expires_at <= now()");
      return { current: secret, all: [secret, ...again.rows.map((r) => r.secret)] };
    });
  }
  g.adminKeyCache = { at: Date.now(), keys };
  return keys;
}
