import { z } from "zod";
import { query, tx, type PoolClient } from "./db";
import { HttpError } from "./http";
import { computePricing } from "./pricing";
import { sendOrderConfirmation, sendOrderShipped, sendPaymentReceived } from "./email";
import { buildPayHerePayment, payhereEnabled } from "./payhere";
import { createCheckoutSession, createPaymentIntent, stripeEnabled, stripeInlineEnabled } from "./stripe";

export const PAYMENT_METHODS = {
  bank: "Direct bank transfer",
  check: "Check payments",
  cod: "Cash on delivery",
  card: "Credit / debit card",
  payhere: "Card / online banking (PayHere)",
} as const;

export const checkoutSchema = z.object({
  customer: z.object({
    firstName: z.string().trim().min(1, "Please enter your first name.").max(100),
    lastName: z.string().trim().max(100).default(""),
    email: z.email("Please enter a valid email address.").trim().max(200),
    phone: z.string().trim().max(50).default(""),
  }),
  address: z.object({
    country: z.string().trim().min(1, "Please select a country.").max(100),
    address: z.string().trim().min(1, "Please enter your address.").max(300),
    city: z.string().trim().max(100).default(""),
    postcode: z.string().trim().max(30).default(""),
  }),
  items: z
    .array(z.object({ id: z.string().trim().min(1).max(100), qty: z.number().int().min(1).max(999) }))
    .min(1, "Your cart is empty.")
    .max(100),
  shippingId: z.string().trim().min(1).max(50),
  couponCode: z.string().trim().max(50).optional(),
  payment: z.enum(["bank", "check", "cod", "card", "payhere"]),
  /**
   * The card is entered in Stripe's fields on our own page instead of redirecting:
   * returns a clientSecret, then /api/stripe/confirm.
   */
  cardFields: z.boolean().default(false),
  note: z.string().trim().max(1000).default(""),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export type PlacedOrder = { id: string; lookupToken: string; paymentUrl?: string; clientSecret?: string; payhere?: ReturnType<typeof buildPayHerePayment> };

async function logEvent(c: PoolClient, orderId: string, kind: string, detail?: unknown) {
  await c.query("insert into order_events (order_id, kind, detail) values ($1, $2, $3)", [
    orderId, kind, detail === undefined ? null : JSON.stringify(detail),
  ]);
}

/**
 * Prices the cart on the server, reserves stock atomically and creates the order. For card payments it
 * then opens a Stripe Checkout session; if that fails the order is cancelled and the stock released.
 */
export async function placeOrder(input: CheckoutInput, customerId: string | null): Promise<PlacedOrder> {
  if (input.payment === "payhere" && !payhereEnabled()) throw new HttpError(400, "PayHere isn't available right now.");
  if (input.payment === "card" && !stripeEnabled()) throw new HttpError(400, "Card payments aren't available right now.");

  const pricing = await computePricing({
    items: input.items,
    shippingId: input.shippingId,
    couponCode: input.couponCode,
    country: input.address.country,
  });

  const placed = await tx(async (c) => {
    // Lock rows in a stable order so two checkouts of overlapping carts can't deadlock.
    for (const l of pricing.lines.filter((x) => x.tracked).sort((a, b) => a.id.localeCompare(b.id))) {
      const r = await c.query(
        "update products set stock = stock - $2 where id = $1 and deleted_at is null and published and stock >= $2",
        [l.id, l.qty],
      );
      if (!r.rowCount) {
        const left = (await c.query<{ stock: number }>("select stock from products where id = $1", [l.id])).rows[0]?.stock ?? 0;
        throw new HttpError(409, left > 0 ? `Only ${left} of "${l.name}" left in stock.` : `"${l.name}" is out of stock.`);
      }
    }

    if (pricing.coupon) {
      const r = await c.query(
        "update coupons set used = used + 1 where code = $1 and active and (max_uses is null or used < max_uses)",
        [pricing.coupon.code],
      );
      if (!r.rowCount) throw new HttpError(409, "That promo code has just been fully redeemed.");
    }

    const id = (await c.query<{ id: string }>("select 'PL-' || nextval('order_number_seq') as id")).rows[0].id;
    const { customer, address } = input;
    const inserted = await c.query<{ lookup_token: string }>(
      `insert into orders (id, status, first_name, last_name, email, phone, country, address, city, postcode,
                           shipping_label, shipping_cost, payment, payment_method, payment_status, note,
                           subtotal, discount, coupon_code, total, customer_id)
       values ($1,'pending',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'unpaid',$14,$15,$16,$17,$18,$19)
       returning lookup_token`,
      [
        id, customer.firstName, customer.lastName, customer.email, customer.phone, address.country, address.address,
        address.city, address.postcode, pricing.shipping.label, pricing.shipping.cost, PAYMENT_METHODS[input.payment],
        input.payment, input.note, pricing.subtotal, pricing.discount, pricing.coupon?.code ?? null, pricing.total,
        customerId,
      ],
    );

    for (const [i, l] of pricing.lines.entries()) {
      await c.query(
        "insert into order_items (order_id, position, product_id, name, image, price, qty) values ($1,$2,$3,$4,$5,$6,$7)",
        [id, i, l.id, l.name, l.image ?? "", l.price, l.qty],
      );
      if (l.tracked) {
        await c.query("insert into stock_movements (product_id, delta, reason, order_id) values ($1, $2, 'order', $3)", [l.id, -l.qty, id]);
      }
    }
    await logEvent(c, id, "created", { payment: input.payment, total: pricing.total, items: pricing.lines.length });
    return { id, lookupToken: inserted.rows[0].lookup_token };
  });

  if (input.payment === "payhere") {
    // Nothing left to pay (e.g. a 100% promo code): no pop-up needed.
    if (pricing.total <= 0) {
      await markOrderPaid(placed.id, null);
      return placed;
    }
    await query("update orders set payment_ref = $2 where id = $1", [placed.id, placed.id]);
    return {
      ...placed,
      payhere: buildPayHerePayment({
        id: placed.id,
        total: pricing.total,
        customer: input.customer,
        address: input.address,
        itemsLabel: pricing.lines.map((l) => `${l.name} x${l.qty}`).join(", "),
      }),
    };
  }

  if (input.payment !== "card") {
    await sendOrderConfirmation(placed.id, false);
    return placed;
  }

  // Nothing left to pay (e.g. a 100% promo code): no Stripe page needed.
  if (pricing.total <= 0) {
    await markOrderPaid(placed.id, null);
    return placed;
  }

  if (input.cardFields && stripeInlineEnabled()) {
    try {
      const intent = await createPaymentIntent({ id: placed.id, total: pricing.total });
      await query("update orders set payment_ref = $2 where id = $1", [placed.id, intent.id]);
      return { ...placed, clientSecret: intent.clientSecret };
    } catch (e) {
      console.error("Stripe PaymentIntent failed for", placed.id, e);
      await cancelOrder(placed.id, "payment_setup_failed");
      throw new HttpError(502, "We couldn't start the card payment. Please try again or choose another payment method.");
    }
  }

  try {
    const session = await createCheckoutSession({
      id: placed.id,
      email: input.customer.email,
      lines: pricing.lines,
      shipping: pricing.shipping,
      discount: pricing.discount,
      couponCode: pricing.coupon?.code ?? null,
      lookupToken: placed.lookupToken,
    });
    if (!session.url) throw new Error("Stripe returned no checkout URL");
    await query("update orders set payment_ref = $2 where id = $1", [placed.id, session.id]);
    return { ...placed, paymentUrl: session.url };
  } catch (e) {
    console.error("Stripe session failed for", placed.id, e);
    await cancelOrder(placed.id, "payment_setup_failed");
    throw new HttpError(502, "We couldn't start the card payment. Please try again or choose another payment method.");
  }
}

// ---------------------------------------------------------------- cancel / restock

/** Cancels inside an existing transaction (row must already be locked). Returns false if already cancelled. */
async function cancelLocked(c: PoolClient, orderId: string, reason: string): Promise<boolean> {
  const order = (await c.query<{ status: string; coupon_code: string | null }>(
    "select status, coupon_code from orders where id = $1", [orderId],
  )).rows[0];
  if (!order || order.status === "cancelled") return false;

  await c.query("update orders set status = 'cancelled' where id = $1", [orderId]);

  const items = await c.query<{ product_id: string; qty: number }>(
    `select oi.product_id, oi.qty from order_items oi
       join products p on p.id = oi.product_id where oi.order_id = $1 order by oi.product_id`,
    [orderId],
  );
  for (const i of items.rows) {
    await c.query("update products set stock = stock + $2 where id = $1", [i.product_id, i.qty]);
    await c.query("insert into stock_movements (product_id, delta, reason, order_id) values ($1, $2, 'cancel', $3)", [i.product_id, i.qty, orderId]);
  }
  if (order.coupon_code) await c.query("update coupons set used = greatest(used - 1, 0) where code = $1", [order.coupon_code]);
  await logEvent(c, orderId, "cancelled", { reason });
  return true;
}

/** Cancels an order and returns its stock and promo-code use. Safe to call twice. */
export function cancelOrder(orderId: string, reason: string): Promise<boolean> {
  return tx(async (c) => {
    await c.query("select 1 from orders where id = $1 for update", [orderId]);
    return cancelLocked(c, orderId, reason);
  });
}

// ---------------------------------------------------------------- payment

/** Records a successful payment. Idempotent. Returns "late" when the order had already been cancelled. */
export async function markOrderPaid(orderId: string, paymentRef: string | null, by = "stripe"): Promise<"paid" | "already" | "late" | "missing"> {
  const result = await markOrderPaidTx(orderId, paymentRef, by);
  if (result === "paid") {
    const method = (await query<{ payment_method: string | null }>("select payment_method from orders where id = $1", [orderId])).rows[0]?.payment_method;
    // Card: the first email the customer gets is the paid confirmation. Offline: staff confirmed the money arrived.
    await (method === "card" || method === "payhere" ? sendOrderConfirmation(orderId, true) : sendPaymentReceived(orderId));
  }
  return result;
}

function markOrderPaidTx(orderId: string, paymentRef: string | null, by: string): Promise<"paid" | "already" | "late" | "missing"> {
  return tx(async (c) => {
    const order = (await c.query<{ status: string; payment_status: string }>(
      "select status, payment_status from orders where id = $1 for update", [orderId],
    )).rows[0];
    if (!order) return "missing";
    if (order.payment_status === "paid") return "already";

    if (order.status === "cancelled") {
      // Money arrived for an order we'd already released: keep the facts, an admin must refund it.
      await c.query("update orders set payment_status = 'paid', payment_ref = coalesce($2, payment_ref) where id = $1", [orderId, paymentRef]);
      await logEvent(c, orderId, "paid_after_cancel", { paymentRef, by });
      return "late";
    }
    await c.query(
      `update orders set payment_status = 'paid', payment_ref = coalesce($2, payment_ref),
              status = case when status = 'pending' then 'processing' else status end where id = $1`,
      [orderId, paymentRef],
    );
    await logEvent(c, orderId, "paid", { paymentRef, by });
    return "paid";
  });
}

// ---------------------------------------------------------------- admin status changes

const TRANSITIONS: Record<string, string[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** Moves an order along pending → processing → shipped → delivered (or to cancelled from pending/processing). */
export async function transitionOrder(orderId: string, next: string, opts: { trackingNumber?: string; by?: string } = {}) {
  const previous = await transitionTx(orderId, next, opts);
  if (next === "shipped" && previous !== "shipped") await sendOrderShipped(orderId);
  return previous;
}

function transitionTx(orderId: string, next: string, opts: { trackingNumber?: string; by?: string }) {
  return tx(async (c) => {
    const order = (await c.query<{ status: string }>("select status from orders where id = $1 for update", [orderId])).rows[0];
    if (!order) throw new HttpError(404, "Order not found.");
    if (order.status === next) return order.status;
    if (!TRANSITIONS[order.status]?.includes(next)) {
      throw new HttpError(409, `An order that is ${order.status} can't be marked ${next}.`);
    }
    if (next === "cancelled") {
      await cancelLocked(c, orderId, `admin:${opts.by ?? "unknown"}`);
      return order.status;
    }
    await c.query("update orders set status = $2, tracking_number = coalesce($3, tracking_number) where id = $1", [
      orderId, next, opts.trackingNumber || null,
    ]);
    await logEvent(c, orderId, "status", { from: order.status, to: next, by: opts.by });
    return order.status;
  });
}

/** Backstop for abandoned card checkouts (Stripe normally tells us via the `expired` webhook); run by housekeeping. */
export async function cancelStaleCardOrders(olderThanMinutes = 45): Promise<number> {
  const { rows } = await query<{ id: string }>(
    `select id from orders where payment_method in ('card', 'payhere') and payment_status = 'unpaid' and status = 'pending'
        and created_at < now() - ($1 || ' minutes')::interval`,
    [String(olderThanMinutes)],
  );
  let n = 0;
  for (const r of rows) if (await cancelOrder(r.id, "stale_unpaid")) n++;
  return n;
}
