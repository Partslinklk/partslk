/* eslint-disable @typescript-eslint/no-explicit-any -- test rows are loosely typed */
import { createHash } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { query } from "@/server/db";
import { placeOrder } from "@/server/checkout";
import { payhereEnabled } from "@/server/payhere";
import { POST as notify } from "@/app/api/webhooks/payhere/route";
import { checkoutInput, closeDb, seedStore } from "./helpers";

afterAll(closeDb);
beforeEach(seedStore);

const md5 = (s: string) => createHash("md5").update(s).digest("hex").toUpperCase();
const SECRET = md5("test-merchant-secret");
const orderRow = async (id: string) =>
  (await query<{ status: string; payment_status: string }>("select status, payment_status from orders where id = $1", [id])).rows[0];

function send(fields: Record<string, string>, sign = true) {
  const body = new URLSearchParams({ merchant_id: "1200000", payhere_currency: "LKR", ...fields });
  if (sign) body.set("md5sig", md5(body.get("merchant_id")! + body.get("order_id")! + body.get("payhere_amount")! + body.get("payhere_currency")! + body.get("status_code")! + SECRET));
  else body.set("md5sig", "BAD");
  return notify(new Request("http://localhost:3000/api/webhooks/payhere", { method: "POST", body }) as any);
}

const place = () => placeOrder(checkoutInput([{ id: "alpha", qty: 1 }], { payment: "payhere" }), null);

describe("PayHere", () => {
  it("is enabled and hands the page a signed payment for the pop-up", async () => {
    expect(payhereEnabled()).toBe(true);
    const placed = await place();
    const p = placed.payhere!;
    expect(placed.paymentUrl).toBeUndefined();
    expect(p.order_id).toBe(placed.id);
    expect(p.currency).toBe("LKR");
    expect(p.amount).toMatch(/^\d+\.\d{2}$/);
    expect(p.hash).toBe(md5(`1200000${placed.id}${p.amount}LKR${SECRET}`));
    expect(p.sandbox).toBe(true);
  });

  it("marks the order paid only on a correctly signed success notification", async () => {
    const placed = await place();
    const amount = placed.payhere!.amount;
    expect((await send({ order_id: placed.id, payhere_amount: amount, status_code: "2" }, false)).status).toBe(400);
    expect((await orderRow(placed.id)).payment_status).toBe("unpaid");
    expect((await send({ order_id: placed.id, payhere_amount: amount, status_code: "2", payment_id: "320032" })).status).toBe(200);
    expect((await orderRow(placed.id)).payment_status).toBe("paid");
    expect((await send({ order_id: placed.id, payhere_amount: amount, status_code: "2" })).status).toBe(200); // a retry is harmless
  });

  it("does not trust a signed notification with the wrong amount", async () => {
    const placed = await place();
    await send({ order_id: placed.id, payhere_amount: "1.00", status_code: "2" });
    expect((await orderRow(placed.id)).payment_status).toBe("unpaid");
  });

  it("cancels the order (and frees stock) when the payment is cancelled", async () => {
    const placed = await place();
    await send({ order_id: placed.id, payhere_amount: placed.payhere!.amount, status_code: "-1" });
    expect((await orderRow(placed.id)).status).toBe("cancelled");
  });
});
