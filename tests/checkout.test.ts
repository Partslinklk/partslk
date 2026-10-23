import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { query } from "@/server/db";
import { cancelOrder, cancelStaleCardOrders, markOrderPaid, placeOrder, transitionOrder } from "@/server/checkout";
import { addCoupon, addProduct, checkoutInput, closeDb, seedStore, stockOf } from "./helpers";

beforeEach(seedStore);
afterAll(closeDb);

const order = (id: string) =>
  query<{ status: string; payment_status: string; total: number; coupon_code: string | null }>(
    "select status, payment_status, total, coupon_code from orders where id = $1",
    [id],
  ).then((r) => r.rows[0]);

describe("placeOrder", () => {
  it("creates the order, sequences its id, reserves stock and logs it", async () => {
    const placed = await placeOrder(checkoutInput([{ id: "alpha", qty: 3 }]), null);
    expect(placed.id).toBe("PL-1001");
    expect(placed.lookupToken).toMatch(/^[0-9a-f]{32}$/);
    expect(await stockOf("alpha")).toBe(7);

    const o = await order(placed.id);
    expect(o).toMatchObject({ status: "pending", payment_status: "unpaid", total: 160 }); // 3x50 + 10 flat

    const moves = await query("select delta, reason from stock_movements where order_id = $1", [placed.id]);
    expect(moves.rows).toEqual([{ delta: -3, reason: "order" }]);
    expect((await query("select kind from order_events where order_id = $1", [placed.id])).rows).toEqual([{ kind: "created" }]);

    expect((await placeOrder(checkoutInput([{ id: "alpha", qty: 1 }]), null)).id).toBe("PL-1002");
  });

  it("ignores prices the browser might send and recomputes everything", async () => {
    const input = { ...checkoutInput([{ id: "alpha", qty: 1 }]), total: 1, subtotal: 1 } as ReturnType<typeof checkoutInput>;
    const placed = await placeOrder(input, null);
    expect((await order(placed.id)).total).toBe(60);
  });

  it("refuses more than is in stock and changes nothing", async () => {
    await expect(placeOrder(checkoutInput([{ id: "bravo", qty: 6 }]), null)).rejects.toMatchObject({ status: 409, message: expect.stringContaining("Only 5") });
    expect(await stockOf("bravo")).toBe(5);
    expect((await query("select count(*)::int n from orders")).rows[0].n).toBe(0);
  });

  it("is all-or-nothing across lines: a short second line releases the first", async () => {
    await expect(placeOrder(checkoutInput([{ id: "alpha", qty: 2 }, { id: "bravo", qty: 99 }]), null)).rejects.toMatchObject({ status: 409 });
    expect(await stockOf("alpha")).toBe(10);
  });

  it("lets exactly one of several simultaneous orders take the last unit", async () => {
    await addProduct({ id: "last", price: 20, stock: 1 });
    const results = await Promise.allSettled(Array.from({ length: 6 }, () => placeOrder(checkoutInput([{ id: "last", qty: 1 }]), null)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(5);
    expect(await stockOf("last")).toBe(0);
  });

  it("counts a single-use coupon once and refuses the second order", async () => {
    await addCoupon({ code: "ONCE", kind: "fixed", value: 5, maxUses: 1 });
    await placeOrder(checkoutInput([{ id: "alpha", qty: 1 }], { couponCode: "ONCE" }), null);
    await expect(placeOrder(checkoutInput([{ id: "alpha", qty: 1 }], { couponCode: "ONCE" }), null)).rejects.toMatchObject({ status: 400 });
    expect(await stockOf("alpha")).toBe(9); // the refused order took nothing
  });

  it("refuses card payment while Stripe isn't configured", async () => {
    await expect(placeOrder(checkoutInput([{ id: "alpha", qty: 1 }], { payment: "card" }), null)).rejects.toMatchObject({ status: 400 });
  });
});

describe("cancelOrder", () => {
  it("restocks, releases the coupon use, and is safe to call twice", async () => {
    await addCoupon({ code: "ONCE", kind: "fixed", value: 5, maxUses: 1 });
    const { id } = await placeOrder(checkoutInput([{ id: "alpha", qty: 4 }], { couponCode: "ONCE" }), null);
    expect(await stockOf("alpha")).toBe(6);

    expect(await cancelOrder(id, "test")).toBe(true);
    expect(await stockOf("alpha")).toBe(10);
    expect((await query("select used from coupons where code = 'ONCE'")).rows[0].used).toBe(0);
    expect((await order(id)).status).toBe("cancelled");

    expect(await cancelOrder(id, "again")).toBe(false);
    expect(await stockOf("alpha")).toBe(10); // not restored twice
  });
});

describe("markOrderPaid", () => {
  it("moves pending -> processing once, then reports 'already'", async () => {
    const { id } = await placeOrder(checkoutInput([{ id: "alpha", qty: 1 }]), null);
    expect(await markOrderPaid(id, "cs_1")).toBe("paid");
    expect(await order(id)).toMatchObject({ status: "processing", payment_status: "paid" });
    expect(await markOrderPaid(id, "cs_1")).toBe("already");
    expect((await query("select count(*)::int n from order_events where order_id = $1 and kind = 'paid'", [id])).rows[0].n).toBe(1);
  });

  it("records a payment that arrives after cancellation without re-taking stock", async () => {
    const { id } = await placeOrder(checkoutInput([{ id: "alpha", qty: 2 }]), null);
    await cancelOrder(id, "expired");
    expect(await markOrderPaid(id, "cs_late")).toBe("late");
    expect(await order(id)).toMatchObject({ status: "cancelled", payment_status: "paid" });
    expect(await stockOf("alpha")).toBe(10);
    expect((await query("select 1 from order_events where order_id = $1 and kind = 'paid_after_cancel'", [id])).rowCount).toBe(1);
  });

  it("reports a missing order", async () => {
    expect(await markOrderPaid("PL-9999", null)).toBe("missing");
  });
});

describe("transitionOrder", () => {
  it("walks pending -> processing -> shipped -> delivered and stores the tracking number", async () => {
    const { id } = await placeOrder(checkoutInput([{ id: "alpha", qty: 1 }]), null);
    await transitionOrder(id, "processing");
    await transitionOrder(id, "shipped", { trackingNumber: "TRK1" });
    await transitionOrder(id, "delivered");
    const row = (await query("select status, tracking_number from orders where id = $1", [id])).rows[0];
    expect(row).toEqual({ status: "delivered", tracking_number: "TRK1" });
  });

  it("refuses jumps and moves out of final states", async () => {
    const { id } = await placeOrder(checkoutInput([{ id: "alpha", qty: 1 }]), null);
    await expect(transitionOrder(id, "shipped")).rejects.toMatchObject({ status: 409 });
    await expect(transitionOrder(id, "delivered")).rejects.toMatchObject({ status: 409 });
    await transitionOrder(id, "cancelled");
    await expect(transitionOrder(id, "processing")).rejects.toMatchObject({ status: 409 });
    await expect(transitionOrder("PL-9999", "processing")).rejects.toMatchObject({ status: 404 });
  });

  it("cancelling through the status change also restocks", async () => {
    const { id } = await placeOrder(checkoutInput([{ id: "alpha", qty: 5 }]), null);
    await transitionOrder(id, "processing");
    await transitionOrder(id, "cancelled");
    expect(await stockOf("alpha")).toBe(10);
  });

  it("treats re-saving the same status as a no-op", async () => {
    const { id } = await placeOrder(checkoutInput([{ id: "alpha", qty: 1 }]), null);
    await transitionOrder(id, "processing");
    await expect(transitionOrder(id, "processing")).resolves.toBe("processing");
  });
});

describe("cancelStaleCardOrders", () => {
  it("cancels only old, unpaid card orders", async () => {
    const old = await placeOrder(checkoutInput([{ id: "alpha", qty: 1 }]), null);
    const recent = await placeOrder(checkoutInput([{ id: "alpha", qty: 1 }]), null);
    const bank = await placeOrder(checkoutInput([{ id: "alpha", qty: 1 }]), null);
    await query("update orders set payment_method = 'card', created_at = now() - interval '2 hours' where id = $1", [old.id]);
    await query("update orders set payment_method = 'card' where id = $1", [recent.id]);
    await query("update orders set created_at = now() - interval '2 hours' where id = $1", [bank.id]); // old but offline

    expect(await cancelStaleCardOrders(45)).toBe(1);
    expect((await order(old.id)).status).toBe("cancelled");
    expect((await order(recent.id)).status).toBe("pending");
    expect((await order(bank.id)).status).toBe("pending");
  });
});
