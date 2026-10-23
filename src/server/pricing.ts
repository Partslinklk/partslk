import { query } from "./db";
import { HttpError } from "./http";

export type CartInput = { id: string; qty: number }[];

export type PricedLine = {
  id: string;
  name: string;
  image: string;
  price: number;
  qty: number;
  /** True when the item is a catalogue product whose stock we track. */
  tracked: boolean;
};

export type ShippingOption = { id: string; label: string; cost: number };

export type CouponInfo = { code: string; kind: "percent" | "fixed"; value: number };

export type Pricing = {
  lines: PricedLine[];
  subtotal: number;
  shipping: ShippingOption;
  discount: number;
  coupon: CouponInfo | null;
  total: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Merges duplicate ids and clamps quantities. */
export function normalizeCart(items: CartInput): CartInput {
  const merged = new Map<string, number>();
  for (const i of items) merged.set(i.id, Math.min(999, (merged.get(i.id) ?? 0) + Math.max(1, Math.floor(i.qty))));
  return [...merged].map(([id, qty]) => ({ id, qty }));
}

/**
 * Prices come from the database only — never from the browser. Every cart item must be a live, published product.
 */
export async function priceLines(cart: CartInput): Promise<PricedLine[]> {
  const ids = cart.map((c) => c.id);
  // A running "Deal of the Week" lowers the price of its product at checkout, exactly as the storefront shows it.
  const { rows } = await query<{ id: string; name: string; image: string; price: number; published: boolean; deal_price: number | null }>(
    `select p.id, p.name, p.image, p.price, p.published, d.deal_price
       from products p left join deals d on d.id = p.id and d.ends_at > now()
      where p.id = any($1::text[]) and p.deleted_at is null`,
    [ids],
  );
  const byId = new Map(rows.map((p) => [p.id, p]));

  return cart.map(({ id, qty }) => {
    const p = byId.get(id);
    if (!p) throw new HttpError(409, "An item in your cart is no longer available.");
    if (!p.published) throw new HttpError(409, `"${p.name}" is no longer available.`);
    const price = p.deal_price != null ? Math.min(p.price, p.deal_price) : p.price;
    return { id, name: p.name, image: p.image, price, qty, tracked: true };
  });
}

type ShippingRow = {
  id: string; label: string; cost: number; free_over: number | null; min_subtotal: number; countries: string[];
};

/** Shipping methods offered for this subtotal and destination, with the cost that would be charged. */
export async function availableShipping(subtotal: number, country: string): Promise<ShippingOption[]> {
  const { rows } = await query<ShippingRow>(
    "select id, label, cost, free_over, min_subtotal, countries from shipping_methods where active order by position, id",
  );
  const c = country.trim().toLowerCase();
  return rows
    .filter((r) => r.min_subtotal <= subtotal)
    .filter((r) => !r.countries.length || (c !== "" && r.countries.some((x) => x.toLowerCase() === c)))
    .map((r) => ({ id: r.id, label: r.label, cost: r.free_over != null && subtotal >= r.free_over ? 0 : r.cost }));
}

export const normalizeCode = (code: string) => code.trim().toUpperCase();

type CouponRow = {
  code: string; kind: "percent" | "fixed"; value: number; min_subtotal: number; max_uses: number | null; used: number;
  starts_at: Date | null; expires_at: Date | null; active: boolean;
};

/** Validates a coupon against a subtotal and returns it with the discount it gives. Throws HttpError(400) with a customer-friendly reason. */
export async function evaluateCoupon(rawCode: string, subtotal: number): Promise<{ coupon: CouponInfo; discount: number }> {
  const code = normalizeCode(rawCode);
  const { rows } = await query<CouponRow>("select * from coupons where code = $1", [code]);
  const c = rows[0];
  const now = Date.now();
  if (!c || !c.active) throw new HttpError(400, "That promo code isn't valid.");
  if (c.starts_at && c.starts_at.getTime() > now) throw new HttpError(400, "That promo code isn't active yet.");
  if (c.expires_at && c.expires_at.getTime() < now) throw new HttpError(400, "That promo code has expired.");
  if (c.max_uses != null && c.used >= c.max_uses) throw new HttpError(400, "That promo code has been fully redeemed.");
  if (subtotal < c.min_subtotal) throw new HttpError(400, `Spend at least ${c.min_subtotal} to use that promo code.`);
  const raw = c.kind === "percent" ? (subtotal * c.value) / 100 : c.value;
  return { coupon: { code: c.code, kind: c.kind, value: c.value }, discount: round2(Math.min(raw, subtotal)) };
}

export async function computePricing(input: {
  items: CartInput;
  shippingId: string;
  couponCode?: string;
  country: string;
}): Promise<Pricing> {
  const lines = await priceLines(normalizeCart(input.items));
  const subtotal = round2(lines.reduce((sum, l) => sum + l.price * l.qty, 0));

  const shipping = (await availableShipping(subtotal, input.country)).find((s) => s.id === input.shippingId);
  if (!shipping) throw new HttpError(400, "That shipping method isn't available for your order.");

  let discount = 0;
  let coupon: CouponInfo | null = null;
  if (input.couponCode?.trim()) ({ coupon, discount } = await evaluateCoupon(input.couponCode, subtotal));

  return { lines, subtotal, shipping, discount, coupon, total: round2(subtotal - discount + shipping.cost) };
}
