import { pool, query } from "@/server/db";
import type { CheckoutInput } from "@/server/checkout";

/** Empties every table the tests touch and restarts the order numbering. */
export async function resetDb() {
  await query(`truncate order_events, stock_movements, order_items, orders, coupons, reviews, product_categories,
                 products, categories, shipping_methods, rate_limits, email_outbox, stripe_events
               restart identity cascade`);
  await query("alter sequence order_number_seq restart with 1001");
}

export async function closeDb() {
  const g = globalThis as unknown as { pgPool?: unknown };
  if (g.pgPool) {
    await pool().end();
    g.pgPool = undefined;
  }
}

export async function addProduct(p: { id: string; name?: string; price?: number; stock?: number; published?: boolean }) {
  await query(
    "insert into products (id, name, price, stock, published) values ($1, $2, $3, $4, $5)",
    [p.id, p.name ?? p.id, p.price ?? 100, p.stock ?? 10, p.published ?? true],
  );
}

let shippingPosition = 0;

export async function addShipping(s: {
  id: string; label?: string; cost: number; minSubtotal?: number; freeOver?: number | null; countries?: string[]; active?: boolean;
}) {
  await query(
    "insert into shipping_methods (id, label, cost, min_subtotal, free_over, countries, active, position) values ($1,$2,$3,$4,$5,$6,$7,$8)",
    [s.id, s.label ?? s.id, s.cost, s.minSubtotal ?? 0, s.freeOver ?? null, s.countries ?? [], s.active ?? true, shippingPosition++],
  );
}

export async function addCoupon(c: {
  code: string; kind: "percent" | "fixed"; value: number; minSubtotal?: number; maxUses?: number | null;
  expiresAt?: string | null; startsAt?: string | null; active?: boolean;
}) {
  await query(
    "insert into coupons (code, kind, value, min_subtotal, max_uses, expires_at, starts_at, active) values ($1,$2,$3,$4,$5,$6,$7,$8)",
    [c.code, c.kind, c.value, c.minSubtotal ?? 0, c.maxUses ?? null, c.expiresAt ?? null, c.startsAt ?? null, c.active ?? true],
  );
}

export const stockOf = async (id: string) =>
  (await query<{ stock: number }>("select stock from products where id = $1", [id])).rows[0].stock;

/** A valid cash-on-delivery checkout for the given cart. */
export function checkoutInput(items: { id: string; qty: number }[], extra: Partial<CheckoutInput> = {}): CheckoutInput {
  return {
    customer: { firstName: "Test", lastName: "Buyer", email: "buyer@example.com", phone: "0400000000" },
    address: { country: "LK", address: "1 Test Street", city: "Colombo", postcode: "00100" },
    items,
    shippingId: "flat",
    payment: "cod",
    note: "",
    cardFields: false,
    ...extra,
  };
}

export async function seedStore() {
  await resetDb();
  shippingPosition = 0;
  await addShipping({ id: "free", label: "Free shipping", cost: 0, minSubtotal: 100 });
  await addShipping({ id: "flat", label: "Flat rate", cost: 10 });
  await addProduct({ id: "alpha", name: "Alpha", price: 50, stock: 10 });
  await addProduct({ id: "bravo", name: "Bravo", price: 80, stock: 5 });
}
