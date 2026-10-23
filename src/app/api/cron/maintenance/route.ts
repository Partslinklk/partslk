import { requireCron } from "@/server/cron";
import { query } from "@/server/db";
import { handle, json } from "@/server/http";
import { purgeRateLimits } from "@/server/rate-limit";

/** Daily housekeeping: expired rate-limit counters, old Stripe event ids, and old delivered/skipped emails. */
export const GET = handle(async (request: Request) => {
  requireCron(request);
  const rateLimits = await purgeRateLimits(24);
  const stripeEvents = (await query("delete from stripe_events where processed_at < now() - interval '90 days'")).rowCount ?? 0;
  const emails = (await query("delete from email_outbox where status in ('sent', 'skipped') and created_at < now() - interval '180 days'")).rowCount ?? 0;
  return json({ rateLimits, stripeEvents, emails });
});
