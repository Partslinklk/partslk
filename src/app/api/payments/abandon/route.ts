import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { cancelOrder } from "@/server/checkout";
import { query } from "@/server/db";
import { handle, HttpError, json, parseBody } from "@/server/http";

const schema = z.object({ orderId: z.string().min(3).max(40), token: z.string().min(10).max(64) });

/**
 * The customer's card was refused (or they gave up) after we had already reserved stock for the order:
 * release it right away so a retry starts clean. Needs the order's private lookup token, only works on
 * unpaid PayPal orders, and never touches an order that has been paid.
 */
export const POST = handle(async (request: Request) => {
  const { orderId, token } = await parseBody(request, schema);
  const row = (await query<{ lookup_token: string; payment_status: string; payment_method: string | null }>(
    "select lookup_token, payment_status, payment_method from orders where id = $1",
    [orderId],
  )).rows[0];
  const a = Buffer.from(token);
  const b = Buffer.from(row?.lookup_token ?? "x".repeat(32));
  if (!row || a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(404, "Order not found.");
  if (row.payment_status !== "unpaid" || row.payment_method !== "card" && row.payment_method !== "payhere") return json({ ok: true, cancelled: false });
  return json({ ok: true, cancelled: await cancelOrder(orderId, "customer_abandoned_payment") });
});
