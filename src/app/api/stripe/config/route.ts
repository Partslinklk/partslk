import { env } from "@/server/env";
import { handle, json } from "@/server/http";
import { stripeInlineEnabled } from "@/server/stripe";

/** The publishable key the checkout page needs to load Stripe.js (safe to expose). */
export const GET = handle(async () => {
  if (!stripeInlineEnabled()) return json({ enabled: false });
  return json({ enabled: true, publishableKey: env().STRIPE_PUBLISHABLE_KEY }, { headers: { "cache-control": "no-store" } });
});
