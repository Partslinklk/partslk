import { createHash, timingSafeEqual } from "crypto";
import { env } from "./env";
import { siteUrl } from "./customer-auth";

/** PayHere (Sri Lankan gateway, charges in LKR directly). Needs a merchant id + merchant secret. */
export const payhereEnabled = () => !!env().PAYHERE_MERCHANT_ID && !!env().PAYHERE_MERCHANT_SECRET;

const md5 = (s: string) => createHash("md5").update(s).digest("hex").toUpperCase();
const secretHash = () => md5(env().PAYHERE_MERCHANT_SECRET!);

/** PayHere wants exactly two decimals, no thousands separator, in the hash and in the request. */
export const payhereAmount = (n: number) => n.toFixed(2);

export type PayHereOrder = {
  id: string;
  total: number;
  customer: { firstName: string; lastName: string; email: string; phone: string };
  address: { address: string; city: string; country: string };
  itemsLabel: string;
};

/** Everything payhere.js needs to open the payment pop-up on our own page. The hash proves the amount wasn't edited. */
export function buildPayHerePayment(o: PayHereOrder) {
  const merchantId = env().PAYHERE_MERCHANT_ID!;
  const currency = env().STORE_CURRENCY.toUpperCase();
  const amount = payhereAmount(o.total);
  const base = siteUrl();
  return {
    sandbox: env().PAYHERE_ENV !== "live",
    merchant_id: merchantId,
    return_url: `${base}/checkout`,
    cancel_url: `${base}/checkout`,
    notify_url: `${base}/api/webhooks/payhere`,
    order_id: o.id,
    items: o.itemsLabel.slice(0, 250),
    amount,
    currency,
    hash: md5(merchantId + o.id + amount + currency + secretHash()),
    first_name: o.customer.firstName,
    last_name: o.customer.lastName || "-",
    email: o.customer.email,
    phone: o.customer.phone,
    address: o.address.address,
    city: o.address.city || "-",
    country: "Sri Lanka",
  };
}

export type PayHereNotification = {
  merchant_id: string;
  order_id: string;
  payhere_amount: string;
  payhere_currency: string;
  status_code: string;
  md5sig: string;
  payment_id?: string;
};

/** True only if the notification really came from PayHere (signed with our merchant secret). */
export function verifyPayHereNotification(n: PayHereNotification): boolean {
  if (!payhereEnabled() || n.merchant_id !== env().PAYHERE_MERCHANT_ID) return false;
  const expected = md5(n.merchant_id + n.order_id + n.payhere_amount + n.payhere_currency + n.status_code + secretHash());
  const a = Buffer.from(expected);
  const b = Buffer.from((n.md5sig ?? "").toUpperCase());
  return a.length === b.length && timingSafeEqual(a, b);
}
