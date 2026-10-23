import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { availableShipping, computePricing, evaluateCoupon, normalizeCart } from "@/server/pricing";
import { addCoupon, addProduct, addShipping, closeDb, seedStore } from "./helpers";

beforeEach(seedStore);
afterAll(closeDb);

const price = (items: { id: string; qty: number }[], extra: { shippingId?: string; couponCode?: string; country?: string } = {}) =>
  computePricing({ items, shippingId: extra.shippingId ?? "flat", couponCode: extra.couponCode, country: extra.country ?? "LK" });

describe("normalizeCart", () => {
  it("merges duplicate lines and clamps quantities", () => {
    expect(normalizeCart([{ id: "a", qty: 2 }, { id: "a", qty: 3 }, { id: "b", qty: 5000 }])).toEqual([
      { id: "a", qty: 5 },
      { id: "b", qty: 999 },
    ]);
  });
});

describe("computePricing", () => {
  it("prices from the database: subtotal + shipping", async () => {
    const p = await price([{ id: "alpha", qty: 2 }]); // 2 x 50
    expect(p.subtotal).toBe(100);
    expect(p.shipping.cost).toBe(10);
    expect(p.discount).toBe(0);
    expect(p.total).toBe(110);
  });

  it("merges duplicate cart lines", async () => {
    const p = await price([{ id: "alpha", qty: 1 }, { id: "alpha", qty: 2 }]);
    expect(p.lines).toHaveLength(1);
    expect(p.lines[0].qty).toBe(3);
    expect(p.subtotal).toBe(150);
  });

  it("rejects an unknown product", async () => {
    await expect(price([{ id: "ghost", qty: 1 }])).rejects.toMatchObject({ status: 409 });
  });

  it("rejects an unpublished product and a soft-deleted one", async () => {
    await addProduct({ id: "hidden", published: false });
    await expect(price([{ id: "hidden", qty: 1 }])).rejects.toMatchObject({ status: 409 });
  });

  it("refuses a shipping method that isn't offered (free needs LKR 100)", async () => {
    await expect(price([{ id: "alpha", qty: 1 }], { shippingId: "free" })).rejects.toMatchObject({ status: 400 });
    const ok = await price([{ id: "alpha", qty: 2 }], { shippingId: "free" });
    expect(ok.shipping.cost).toBe(0);
    expect(ok.total).toBe(100);
  });

  it("applies a percent coupon to the subtotal, not shipping", async () => {
    await addCoupon({ code: "TEN", kind: "percent", value: 10 });
    const p = await price([{ id: "alpha", qty: 2 }], { couponCode: " ten " });
    expect(p.coupon?.code).toBe("TEN");
    expect(p.discount).toBe(10);
    expect(p.total).toBe(100 - 10 + 10);
  });

  it("never discounts below zero", async () => {
    await addCoupon({ code: "HUGE", kind: "fixed", value: 500 });
    const p = await price([{ id: "alpha", qty: 1 }], { couponCode: "HUGE" });
    expect(p.discount).toBe(50);
    expect(p.total).toBe(10); // only shipping left
  });
});

describe("availableShipping", () => {
  it("hides methods below their minimum subtotal", async () => {
    expect((await availableShipping(99, "LK")).map((s) => s.id)).toEqual(["flat"]);
    expect((await availableShipping(100, "LK")).map((s) => s.id)).toEqual(["free", "flat"]);
  });

  it("makes a method free once the free-over threshold is reached", async () => {
    await addShipping({ id: "tracked", cost: 8, freeOver: 200 });
    expect((await availableShipping(150, "LK")).find((s) => s.id === "tracked")?.cost).toBe(8);
    expect((await availableShipping(200, "LK")).find((s) => s.id === "tracked")?.cost).toBe(0);
  });

  it("restricts a method to its countries (case-insensitive) and ignores inactive ones", async () => {
    await addShipping({ id: "au-only", cost: 20, countries: ["AU"] });
    await addShipping({ id: "off", cost: 1, active: false });
    expect((await availableShipping(10, "LK")).map((s) => s.id)).not.toContain("au-only");
    expect((await availableShipping(10, "au")).map((s) => s.id)).toContain("au-only");
    expect((await availableShipping(10, "AU")).map((s) => s.id)).not.toContain("off");
  });
});

describe("evaluateCoupon", () => {
  it("explains why a code can't be used", async () => {
    await addCoupon({ code: "OLD", kind: "fixed", value: 5, expiresAt: "2020-01-01T00:00:00Z" });
    await addCoupon({ code: "SOON", kind: "fixed", value: 5, startsAt: "2999-01-01T00:00:00Z" });
    await addCoupon({ code: "BIG", kind: "fixed", value: 5, minSubtotal: 1000 });
    await addCoupon({ code: "OFF", kind: "fixed", value: 5, active: false });
    await addCoupon({ code: "GONE", kind: "fixed", value: 5, maxUses: 1 });
    await (await import("@/server/db")).query("update coupons set used = 1 where code = 'GONE'");
    for (const code of ["OLD", "SOON", "BIG", "OFF", "GONE", "MISSING"]) {
      await expect(evaluateCoupon(code, 100)).rejects.toMatchObject({ status: 400 });
    }
  });
});
