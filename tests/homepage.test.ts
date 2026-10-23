import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { query } from "@/server/db";
import { createResource, getResource, listResource, removeResource, reorderResource, updateResource } from "@/server/catalog";
import { placeOrder } from "@/server/checkout";
import { computePricing } from "@/server/pricing";
import { dealSchema, featuredSchema } from "@/server/validation/catalog";
import { addProduct, checkoutInput, closeDb, seedStore } from "./helpers";

beforeEach(seedStore);
afterAll(closeDb);

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

describe("featured / popular lists link to real products", () => {
  it("returns live product data, in the order you set", async () => {
    await createResource("featured", featuredSchema.parse({ id: "alpha" }));
    await createResource("featured", featuredSchema.parse({ id: "bravo" }));
    let list = await listResource("featured");
    expect(list.map((i) => i.id)).toEqual(["alpha", "bravo"]);
    expect(list[0]).toMatchObject({ name: "Alpha", price: 50, ctaLabel: "Add To Cart", published: true });

    await reorderResource("featured", ["bravo", "alpha"]);
    list = await listResource("featured");
    expect(list.map((i) => i.id)).toEqual(["bravo", "alpha"]);
  });

  it("follows later changes to the product (price, name) without re-saving the list", async () => {
    await createResource("popular", featuredSchema.parse({ id: "alpha" }));
    await query("update products set name = 'Alpha Pro', price = 65, original_price = 80 where id = 'alpha'");
    const [item] = await listResource("popular");
    expect(item).toMatchObject({ name: "Alpha Pro", price: 65, originalPrice: 80 });
  });

  it("refuses an unknown product and a duplicate", async () => {
    await expect(createResource("featured", featuredSchema.parse({ id: "ghost" }))).rejects.toMatchObject({ status: 400 });
    expect(await createResource("featured", featuredSchema.parse({ id: "alpha" }))).toBe(true);
    expect(await createResource("featured", featuredSchema.parse({ id: "alpha" }))).toBe(false);
  });

  it("drops out when the product is deleted or removed from the list, and flags hidden products", async () => {
    await createResource("featured", featuredSchema.parse({ id: "alpha" }));
    await createResource("featured", featuredSchema.parse({ id: "bravo" }));
    await query("update products set published = false where id = 'bravo'");
    expect((await listResource("featured")).find((i) => i.id === "bravo")).toMatchObject({ published: false });

    await query("update products set deleted_at = now() where id = 'alpha'"); // what the admin's delete does
    expect((await listResource("featured")).map((i) => i.id)).toEqual(["bravo"]);

    expect(await removeResource("featured", "bravo")).toBe(true);
    expect(await listResource("featured")).toEqual([]);
  });
});

describe("Deal of the Week", () => {
  const deal = (price: number, endsAt = inDays(3)) => dealSchema.parse({ id: "alpha", price, endsAt });

  it("shows the deal price with the regular price struck through", async () => {
    await createResource("deals", deal(35));
    expect((await getResource("deals", "alpha"))).toMatchObject({ id: "alpha", name: "Alpha", price: 35, originalPrice: 50 });
  });

  it("can be edited (price and end time)", async () => {
    await createResource("deals", deal(35));
    expect(await updateResource("deals", "alpha", deal(30, inDays(10)))).toBe(true);
    expect((await getResource("deals", "alpha"))).toMatchObject({ price: 30 });
    expect(await updateResource("deals", "bravo", dealSchema.parse({ id: "bravo", price: 1, endsAt: inDays(1) }))).toBe(false);
  });

  it("is charged at checkout while it runs, so the customer pays what the page showed", async () => {
    await createResource("deals", deal(35));
    const p = await computePricing({ items: [{ id: "alpha", qty: 2 }], shippingId: "flat", country: "LK" });
    expect(p.lines[0].price).toBe(35);
    expect(p.subtotal).toBe(70);

    const placed = await placeOrder(checkoutInput([{ id: "alpha", qty: 2 }]), null);
    const total = (await query<{ total: number }>("select total from orders where id = $1", [placed.id])).rows[0].total;
    expect(total).toBe(80); // 2 x 35 + 10 shipping
  });

  it("stops applying once it has ended, and never raises a price", async () => {
    await createResource("deals", deal(35, inDays(1)));
    await query("update deals set ends_at = now() - interval '1 minute' where id = 'alpha'");
    expect((await computePricing({ items: [{ id: "alpha", qty: 1 }], shippingId: "flat", country: "LK" })).lines[0].price).toBe(50);

    await query("update deals set ends_at = now() + interval '1 day', deal_price = 999 where id = 'alpha'");
    expect((await computePricing({ items: [{ id: "alpha", qty: 1 }], shippingId: "flat", country: "LK" })).lines[0].price).toBe(50);
  });

  it("only applies to its own product", async () => {
    await addProduct({ id: "charlie", price: 20 });
    await createResource("deals", deal(35));
    expect((await computePricing({ items: [{ id: "charlie", qty: 1 }], shippingId: "flat", country: "LK" })).lines[0].price).toBe(20);
  });

  it("validates the deal", () => {
    expect(dealSchema.safeParse({ id: "alpha", price: -1, endsAt: inDays(1) }).success).toBe(false);
    expect(dealSchema.safeParse({ id: "alpha", price: 5, endsAt: "not a date" }).success).toBe(false);
  });
});
