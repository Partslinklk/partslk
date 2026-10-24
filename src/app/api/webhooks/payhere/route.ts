import { cancelOrder, markOrderPaid } from "@/server/checkout";
import { query } from "@/server/db";
import { env } from "@/server/env";
import { handle, HttpError } from "@/server/http";
import { payhereAmount, verifyPayHereNotification, type PayHereNotification } from "@/server/payhere";

/**
 * PayHere calls this (server to server) after every payment attempt. The signature (md5sig) proves it is really PayHere;
 * we then check the order and the amount ourselves before marking anything paid. Always answers 200 once handled so
 * PayHere stops retrying.
 */
export const POST = handle(async (request: Request) => {
  const form = await request.formData();
  const n = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)])) as unknown as PayHereNotification;
  if (!n.order_id || !verifyPayHereNotification(n)) throw new HttpError(400, "Invalid signature.");

  const order = (await query<{ total: number; payment_method: string | null }>("select total, payment_method from orders where id = $1", [n.order_id])).rows[0];
  if (!order || order.payment_method !== "payhere") return new Response("ok");

  switch (n.status_code) {
    case "2": {
      if (n.payhere_currency !== env().STORE_CURRENCY.toUpperCase() || n.payhere_amount !== payhereAmount(order.total)) {
        await query("insert into order_events (order_id, kind, detail) values ($1, 'payment_mismatch', $2)", [
          n.order_id, JSON.stringify({ amount: n.payhere_amount, currency: n.payhere_currency }),
        ]);
        console.error("payhere webhook: amount mismatch for", n.order_id);
        break;
      }
      console.log("payhere webhook: order", n.order_id, await markOrderPaid(n.order_id, n.payment_id ?? n.order_id, "payhere"));
      break;
    }
    case "-1":
      await cancelOrder(n.order_id, "payhere_payment_canceled");
      break;
    case "-2":
      await query("insert into order_events (order_id, kind, detail) values ($1, 'payment_failed', $2)", [n.order_id, JSON.stringify({ payment_id: n.payment_id })]);
      break; // the customer may retry inside the same pop-up; stale unpaid orders are cancelled by src/server/housekeeping.ts
    case "-3":
      await query("insert into order_events (order_id, kind, detail) values ($1, 'chargeback', $2)", [n.order_id, JSON.stringify({ payment_id: n.payment_id })]);
      break;
  }
  return new Response("ok");
});
