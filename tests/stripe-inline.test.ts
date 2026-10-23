/* eslint-disable @typescript-eslint/no-explicit-any -- test rows are loosely typed */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { query } from "@/server/db";
import { placeOrder } from "@/server/checkout";
import { checkoutInput, closeDb, seedStore } from "./helpers";

// Stripe itself is replaced: the PaymentIntent a customer's browser would confirm is simulated here.
const intents = new Map<string, any>();
vi.mock("@/server/stripe", async (orig) => ({
  ...(await orig<typeof import("@/server/stripe")>()),
  stripeEnabled: () => true,
  stripeInlineEnabled: () => true,
  createPaymentIntent: async (o: { id: string; total: number }) => {
    const id = `pi_test_${o.id}`;
    intents.set(id, { id, amount: Math.round(o.total * 100), currency: "lkr", status: "requires_payment_method", metadata: { orderId: o.id } });
    return { id, clientSecret: `${id}_secret_x`, amount: Math.round(o.total * 100), currency: "lkr" };
  },
  retrievePaymentIntent: async (id: string) => intents.get(id),
}));

const { POST: confirm } = await import("@/app/api/stripe/confirm/route");

afterAll(closeDb);
beforeEach(async () => {
  intents.clear();
  await seedStore();
});

const post = (body: object) =>
  confirm(new Request("http://localhost:3000/api/stripe/confirm", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3000" }, body: JSON.stringify(body) }) as any);
const orderRow = async (id: string) =>
  (await query<{ status: string; payment_status: string; payment_ref: string | null }>("select status, payment_status, payment_ref from orders where id = $1", [id])).rows[0];

describe("inline card payment (Stripe.js on our page)", () => {
  it("returns a client secret instead of a redirect and remembers the PaymentIntent", async () => {
    const placed = await placeOrder(checkoutInput([{ id: "alpha", qty: 1 }], { payment: "card", cardFields: true }), null);
    expect(placed.clientSecret).toMatch(/^pi_test_/);
    expect(placed.paymentUrl).toBeUndefined();
    expect((await orderRow(placed.id)).payment_ref).toBe(`pi_test_${placed.id}`);
  });

  it("marks the order paid once Stripe says the intent succeeded", async () => {
    const placed = await placeOrder(checkoutInput([{ id: "alpha", qty: 1 }], { payment: "card", cardFields: true }), null);
    intents.get(`pi_test_${placed.id}`).status = "succeeded";
    const res = await post({ orderId: placed.id, paymentIntentId: `pi_test_${placed.id}` });
    expect(res.status).toBe(200);
    expect((await orderRow(placed.id)).payment_status).toBe("paid");
  });

  it("does not trust the browser: an unpaid intent leaves the order unpaid", async () => {
    const placed = await placeOrder(checkoutInput([{ id: "alpha", qty: 1 }], { payment: "card", cardFields: true }), null);
    const res = await post({ orderId: placed.id, paymentIntentId: `pi_test_${placed.id}` });
    expect(res.status).toBe(402);
    expect((await orderRow(placed.id)).payment_status).toBe("unpaid");
  });

  it("rejects a PaymentIntent that belongs to another order or has a different amount", async () => {
    const a = await placeOrder(checkoutInput([{ id: "alpha", qty: 1 }], { payment: "card", cardFields: true }), null);
    const b = await placeOrder(checkoutInput([{ id: "bravo", qty: 1 }], { payment: "card", cardFields: true }), null);
    intents.get(`pi_test_${b.id}`).status = "succeeded";
    expect((await post({ orderId: a.id, paymentIntentId: `pi_test_${b.id}` })).status).toBe(400);

    const cheap = intents.get(`pi_test_${a.id}`);
    cheap.status = "succeeded";
    cheap.amount = 100;
    expect((await post({ orderId: a.id, paymentIntentId: cheap.id })).status).toBe(400);
    expect((await orderRow(a.id)).payment_status).toBe("unpaid");
  });
});
