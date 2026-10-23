import { cancelStaleCardOrders } from "@/server/checkout";
import { requireCron } from "@/server/cron";
import { handle, json } from "@/server/http";

/** Cancels abandoned card checkouts and returns their stock. Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. */
export const GET = handle(async (request: Request) => {
  requireCron(request);
  return json({ cancelled: await cancelStaleCardOrders(45) });
});
