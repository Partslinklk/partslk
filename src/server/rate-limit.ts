import { query } from "./db";

/**
 * Fixed-window counters stored in Postgres, so the limits hold across serverless instances and restarts.
 * (A fixed window can allow up to 2x the limit across a window boundary; that is fine for abuse control.)
 */
export const WINDOW_SECONDS = 15 * 60;

const windowSql = "to_timestamp(floor(extract(epoch from now()) / $2) * $2)";

/** Hits recorded for `key` in the current window. */
export async function hits(key: string, windowSeconds = WINDOW_SECONDS): Promise<number> {
  const { rows } = await query<{ hits: number }>(
    `select hits from rate_limits where key = $1 and window_start = ${windowSql}`,
    [key, windowSeconds],
  );
  return rows[0]?.hits ?? 0;
}

/** Counts one hit and returns the new total for the current window. */
export async function recordFailure(key: string, windowSeconds = WINDOW_SECONDS): Promise<number> {
  const { rows } = await query<{ hits: number }>(
    `insert into rate_limits (key, window_start, hits) values ($1, ${windowSql}, 1)
     on conflict (key, window_start) do update set hits = rate_limits.hits + 1
     returning hits`,
    [key, windowSeconds],
  );
  return rows[0].hits;
}

/** True once `key` has reached `max` hits in the current window. */
export async function isThrottled(key: string, max: number, windowSeconds = WINDOW_SECONDS): Promise<boolean> {
  return (await hits(key, windowSeconds)) >= max;
}

/** Forgets a key (e.g. after a successful login). */
export async function clearFailures(key: string): Promise<void> {
  await query("delete from rate_limits where key = $1", [key]);
}

/** Housekeeping: drops counters from old windows. Returns how many rows were removed. */
export async function purgeRateLimits(olderThanHours = 24): Promise<number> {
  const r = await query("delete from rate_limits where window_start < now() - ($1 || ' hours')::interval", [String(olderThanHours)]);
  return r.rowCount ?? 0;
}
