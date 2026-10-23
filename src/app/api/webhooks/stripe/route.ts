import type Stripe from "stripe";
import { query } from "@/server/db";
import { cancelOrder, markOrderPaid } from "@/server/checkout";
import { env } from "@/server/env";
import { handle, HttpError, json } from "@/server/http";
import { stripe, toMinor } from "@/server/stripe";

async function orderFor(session: Stripe.Checkout.Session) {
  const id = session.metadata?.orderId ?? session.client_reference_id;
  if (!id) return null;
  const { rows } = await query<{ id: string; total: number; payment_ref: string | null }>(
    "select id, total, payment_ref from orders where id = $1", [id],
  );
  return rows[0] ?? null;
}

async function onPaid(session: Stripe.Checkout.Session) {
  const order = await orderFor(session);
  if (!order) return console.error("stripe webhook: no order for session", session.id);
  if (order.payment_ref && order.payment_ref !== session.id) return; // a superseded session

  const currency = (session.currency ?? "").toLowerCase();
  if (currency !== env().STRIPE_CURRENCY.toLowerCase() || session.amount_total !== toMinor(order.total, currency)) {
    await query("insert into order_events (order_id, kind, detail) values ($1, 'payment_mismatch', $2)", [
      order.id, JSON.stringify({ sessionId: session.id, amount: session.amount_total, currency }),
    ]);
    return console.error("stripe webhook: amount mismatch for", order.id);
  }
  console.log("stripe webhook: order", order.id, await markOrderPaid(order.id, session.id));
}

async function onFailed(session: Stripe.Checkout.Session, reason: string) {
  const order = await orderFor(session);
  if (!order || (order.payment_ref && order.payment_ref !== session.id)) return;
  await cancelOrder(order.id, reason);
}

export const POST = handle(async (request: Request) => {
  const secret = env().STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new HttpError(503, "Stripe webhooks aren't configured.");
  const signature = request.headers.get("stripe-signature");
  if (!signature) throw new HttpError(400, "Missing signature.");

  // Signature verification needs the exact raw body.
  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch {
    throw new HttpError(400, "Invalid signature.");
  }

  // Idempotency: Stripe retries and may deliver an event twice.
  const fresh = await query("insert into stripe_events (id, type) values ($1, $2) on conflict do nothing", [event.id, event.type]);
  if (!fresh.rowCount) return json({ received: true, duplicate: true });

  try {
    const session = event.data.object as Stripe.Checkout.Session;
    switch (event.type) {
      case "payment_intent.succeeded":
      case "payment_intent.canceled": {
        // Inline card payments (Stripe.js on our page): the order id travels in the intent's metadata.
        const intent = event.data.object as unknown as Stripe.PaymentIntent;
        const orderId = intent.metadata?.orderId;
        const order = orderId
          ? (await query<{ total: number; payment_ref: string | null }>("select total, payment_ref from orders where id = $1", [orderId])).rows[0]
          : undefined;
        if (!order || order.payment_ref !== intent.id) break; // not ours, or a checkout-session payment handled above
        if (event.type === "payment_intent.canceled") {
          await cancelOrder(orderId!, "stripe_payment_canceled");
        } else if (intent.currency === env().STRIPE_CURRENCY.toLowerCase() && intent.amount === toMinor(order.total, intent.currency)) {
          console.log("stripe webhook: order", orderId, await markOrderPaid(orderId!, intent.id));
        } else {
          console.error("stripe webhook: amount mismatch for", orderId);
        }
        break;
      }
      case "checkout.session.completed":
        // Card payments are "paid" immediately; delayed methods report later via async_payment_succeeded.
        if (session.payment_status === "paid") await onPaid(session);
        break;
      case "checkout.session.async_payment_succeeded":
        await onPaid(session);
        break;
      case "checkout.session.expired":
        await onFailed(session, "stripe_session_expired");
        break;
      case "checkout.session.async_payment_failed":
        await onFailed(session, "stripe_payment_failed");
        break;
    }
  } catch (e) {
    await query("delete from stripe_events where id = $1", [event.id]); // let Stripe's retry reprocess it
    throw e;
  }
  return json({ received: true });
});
