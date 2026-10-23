import Stripe from "stripe";
import { env } from "./env";
import { HttpError } from "./http";
import type { PricedLine, ShippingOption } from "./pricing";
import { siteUrl } from "./customer-auth";

export const stripeEnabled = () => !!env().STRIPE_SECRET_KEY;
/** Card boxes on our own page (Stripe.js) need the publishable key as well as the secret key. */
export const stripeInlineEnabled = () => !!env().STRIPE_SECRET_KEY && !!env().STRIPE_PUBLISHABLE_KEY;

let client: Stripe | undefined;
export function stripe(): Stripe {
  const key = env().STRIPE_SECRET_KEY;
  if (!key) throw new HttpError(503, "Card payments aren't configured.");
  const api = env().STRIPE_API_URL ? new URL(env().STRIPE_API_URL!) : null;
  return (client ??= new Stripe(key, {
    maxNetworkRetries: 1,
    timeout: 15_000,
    ...(api ? { host: api.hostname, port: api.port, protocol: api.protocol.replace(":", "") as "http" | "https" } : {}),
  }));
}

const ZERO_DECIMAL = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);

/** Major units (12.5) -> the smallest currency unit Stripe expects (1250). */
export const toMinor = (amount: number, currency = env().STRIPE_CURRENCY) =>
  Math.round(amount * (ZERO_DECIMAL.has(currency.toLowerCase()) ? 1 : 100));

export type SessionOrder = {
  id: string;
  email: string;
  lines: PricedLine[];
  shipping: ShippingOption;
  discount: number;
  couponCode: string | null;
  lookupToken: string;
};

/** Creates a hosted Stripe Checkout page for an order; amounts come from the server-computed lines. */
export async function createCheckoutSession(order: SessionOrder) {
  const currency = env().STRIPE_CURRENCY.toLowerCase();
  const s = stripe();

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = order.lines.map((l) => ({
    quantity: l.qty,
    price_data: { currency, unit_amount: toMinor(l.price, currency), product_data: { name: l.name } },
  }));
  if (order.shipping.cost > 0) {
    line_items.push({
      quantity: 1,
      price_data: { currency, unit_amount: toMinor(order.shipping.cost, currency), product_data: { name: `Shipping: ${order.shipping.label}` } },
    });
  }

  // Stripe has no negative line items, so a promo code becomes a one-off, single-use coupon.
  const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
  if (order.discount > 0) {
    const coupon = await s.coupons.create({
      amount_off: toMinor(order.discount, currency),
      currency,
      duration: "once",
      max_redemptions: 1,
      name: order.couponCode ?? "Discount",
    });
    discounts.push({ coupon: coupon.id });
  }

  const base = siteUrl();
  return s.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: order.email,
      client_reference_id: order.id,
      metadata: { orderId: order.id },
      payment_intent_data: { metadata: { orderId: order.id } },
      line_items,
      discounts,
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60, // Stripe's minimum is 30 minutes
      success_url: `${base}/checkout?paid=${encodeURIComponent(order.id)}&token=${order.lookupToken}`,
      cancel_url: `${base}/checkout?cancelled=1`,
    },
    { idempotencyKey: `checkout-${order.id}` },
  );
}

// ------------------------------------------------------------------ inline card payments (PaymentIntent)

/**
 * Creates the PaymentIntent for an order. The browser confirms it with the customer's card using Stripe.js, so card
 * details go straight to Stripe and never touch this server. The amount comes from the server-computed order total.
 */
export async function createPaymentIntent(order: { id: string; total: number }) {
  const currency = env().STRIPE_CURRENCY.toLowerCase();
  const intent = await stripe().paymentIntents.create(
    {
      amount: toMinor(order.total, currency),
      currency,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      description: `Partslk order ${order.id}`,
      metadata: { orderId: order.id },
    },
    { idempotencyKey: `pi-${order.id}` },
  );
  if (!intent.client_secret) throw new Error("Stripe returned no client secret");
  return { id: intent.id, clientSecret: intent.client_secret, amount: intent.amount, currency };
}

export const retrievePaymentIntent = (id: string) => stripe().paymentIntents.retrieve(id);
