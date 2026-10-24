import { timingSafeEqual } from "crypto";
import { readOrder } from "@/lib/db";
import { query } from "@/server/db";
import { handle, HttpError, json } from "@/server/http";

/**
 * Guest order lookup: GET /api/orders/PL-1001?token=<lookup token from checkout>.
 * A wrong id and a wrong token look identical, so ids can't be probed.
 */
export const GET = handle(async (request: Request, ctx: RouteContext<"/api/orders/[id]">) => {
  const { id } = await ctx.params;
  const token = new URL(request.url).searchParams.get("token") ?? "";

  const row = (await query<{ lookup_token: string; payment_status: string }>(
    "select lookup_token, payment_status from orders where id = $1", [id],
  )).rows[0];
  const a = Buffer.from(token);
  const b = Buffer.from(row?.lookup_token ?? "x".repeat(32));
  if (!row || a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(404, "Order not found.");

  const order = await readOrder(id);
  if (!order) throw new HttpError(404, "Order not found.");
  return json({ id: order.id, status: order.status, paymentStatus: row.payment_status, total: order.total, createdAt: order.createdAt });
});
