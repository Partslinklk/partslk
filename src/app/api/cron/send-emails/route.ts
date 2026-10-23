import { retryOutbox } from "@/server/email";
import { requireCron } from "@/server/cron";
import { handle, json } from "@/server/http";

/** Retries emails that failed to send. Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. */
export const GET = handle(async (request: Request) => {
  requireCron(request);
  return json({ attempted: await retryOutbox() });
});
