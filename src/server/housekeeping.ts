import { after } from "next/server";
import { cancelStaleCardOrders } from "./checkout";
import { query } from "./db";
import { retryOutbox } from "./email";
import { purgeRateLimits } from "./rate-limit";

const EVERY_MS = 10 * 60_000;
const g = globalThis as unknown as { housekeepingAt?: number };

/** Releases stock held by abandoned card checkouts, retries failed emails and drops old bookkeeping rows. */
async function run() {
  try {
    await cancelStaleCardOrders(45);
    await retryOutbox();
    await purgeRateLimits(24);
    await query("delete from stripe_events where processed_at < now() - interval '90 days'");
    await query("delete from email_outbox where status in ('sent', 'skipped') and created_at < now() - interval '180 days'");
  } catch (e) {
    console.error("housekeeping failed", e);
  }
}

/**
 * Upkeep without a cron job: call it from busy routes. It runs after the response has gone out, at most once
 * per EVERY_MS per server instance, and every step is idempotent so concurrent instances can't clash.
 */
export function scheduleHousekeeping() {
  if (Date.now() - (g.housekeepingAt ?? 0) < EVERY_MS) return;
  g.housekeepingAt = Date.now();
  after(run);
}
