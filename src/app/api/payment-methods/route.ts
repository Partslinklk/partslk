import { handle, json } from "@/server/http";
import { payhereEnabled } from "@/server/payhere";
import { stripeEnabled, stripeInlineEnabled } from "@/server/stripe";

const OFFLINE = [
  { id: "bank", label: "Direct bank transfer", note: "Make your payment directly into our bank account. Use your order ID as the payment reference." },
  { id: "check", label: "Check payments", note: "Please send a check to Store Name, Store Street, Store Town, Store State / County, Store Postcode." },
  { id: "cod", label: "Cash on delivery", note: "Pay with cash upon delivery." },
];

/** Payment methods the checkout can offer right now (card only appears once Stripe is configured). */
export const GET = handle(async () => {
  return json([
    ...(payhereEnabled()
      ? [{ id: "payhere", label: "Credit / debit card (PayHere)", note: "A secure PayHere window opens right here to enter your card details. Visa, Mastercard, online banking and wallets accepted." }]
      : []),
    ...(stripeInlineEnabled()
      ? [{ id: "card", label: "Credit / debit card", note: "Enter your card details below. Your card goes straight to Stripe and never touches our servers." }]
      : stripeEnabled()
        ? [{ id: "card", label: "Credit / debit card (Stripe)", note: "You'll be redirected to our secure payment partner, Stripe, to pay." }]
        : []),
    ...OFFLINE,
  ]);
});
