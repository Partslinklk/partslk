import { query } from "@/server/db";
import { handle, json } from "@/server/http";

/**
 * Liveness + database check for uptime monitors (UptimeRobot, Better Stack, Vercel...).
 * Public on purpose and deliberately tiny: no versions, no config, no counts.
 */
export const GET = handle(async () => {
  const started = Date.now();
  try {
    await query("select 1");
  } catch {
    return json({ ok: false, db: "down" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
  return json({ ok: true, db: "up", ms: Date.now() - started }, { headers: { "cache-control": "no-store" } });
});
