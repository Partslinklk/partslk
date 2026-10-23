import { z } from "zod";
import { clientIp, isThrottled, recordFailure } from "@/server/admin";
import { markOrderPaid } from "@/server/checkout";
import { query } from "@/server/db";
import { env } from "@/server/env";
import { handle, HttpError, json, parseBody } from "@/server/http";
import { retrievePaymentIntent, toMinor } from "@/server/stripe";

const schema = z.object({ orderId: z.string().min(3).max(40), paymentIntentId: z.string().min(5).max(80) });

/**
 * Called after Stripe.js confirmed the card in the browser. We never trust the browser's word: the PaymentIntent is
 * re-read from Stripe and must be the one created for THIS order, with the right amount, and be succeeded.
 */
export const POST = handle(async (request: Request) => {
  const { orderId, paymentIntentId } = await parseBody(request, schema);
  const key = `stripe-confirm:${clientIp(request)}`;
  if (await isThrottled(key, 30)) throw new HttpError(429, "Too many attempts. Try again in a few minutes.");
  await recordFailure(key);

  const order = (await query<{ total: number; payment_ref: string | null; lookup_token: string }>(
    "select total, payment_ref, lookup_token from orders where id = $1", [orderId],
  )).rows[0];
  if (!order || order.payment_ref !== paymentIntentId) throw new HttpError(400, "We couldn't confirm this payment. Please try again.");

  const intent = await retrievePaymentIntent(paymentIntentId);
  const currency = env().STRIPE_CURRENCY.toLowerCase();
  if (intent.metadata?.orderId !== orderId || intent.currency !== currency || intent.amount !== toMinor(order.total, currency)) {
    throw new HttpError(400, "We couldn't confirm this payment. Please try again.");
  }
  if (intent.status === "succeeded") {
    const state = await markOrderPaid(orderId, intent.id);
    if (state === "late" || state === "missing") throw new HttpError(409, "This order was cancelled before the payment arrived. Contact us and we will refund you.");
    return json({ ok: true, state: "paid", id: orderId, lookupToken: order.lookup_token });
  }
  if (intent.status === "processing") return json({ ok: true, state: "processing", id: orderId, lookupToken: order.lookup_token });
  throw new HttpError(402, "Your card was declined. Please try another card or payment method.");
});
