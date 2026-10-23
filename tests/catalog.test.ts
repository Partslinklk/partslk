import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { query } from "@/server/db";
import { createResource, getResource, searchProducts, updateResource } from "@/server/catalog";
import { productSchema } from "@/server/validation/catalog";
import { closeDb, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(closeDb);

const parse = (extra: Record<string, unknown>) => productSchema.safeParse({ id: "wheel", name: "Wheel", price: 100, ...extra });
const img = (n: number) => `https://cdn.example.com/wheel-${n}.jpg`;

describe("product image validation", () => {
  it("makes the first gallery photo the cover", () => {
    const r = parse({ images: [img(1), img(2), img(3)], image: "/ignored.png" });
    expect(r.success && r.data.image).toBe(img(1));
    expect(r.success && r.data.images).toEqual([img(1), img(2), img(3)]);
  });

  it("turns a lone `image` into a one-photo gallery, and an empty product into an empty gallery", () => {
    const one = parse({ image: "/uploads/a.png" });
    expect(one.success && one.data.images).toEqual(["/uploads/a.png"]);
    const none = parse({});
    expect(none.success && none.data).toMatchObject({ image: "", images: [] });
  });

  it("removes duplicates and caps the gallery at 12", () => {
    const dup = parse({ images: [img(1), img(1), img(2)] });
    expect(dup.success && dup.data.images).toEqual([img(1), img(2)]);
    expect(parse({ images: Array.from({ length: 13 }, (_, i) => img(i)) }).success).toBe(false);
  });

  it("rejects addresses that could break out of CSS url() or run script", () => {
    for (const bad of ['javascript:alert(1)', 'https://x.test/a b.png', 'https://x.test/a"b.png', "https://x.test/a'b.png", "https://x.test/a(1).png", "data:image/png;base64,AAAA", "ftp://x.test/a.png"]) {
      expect(parse({ images: [bad] }).success, bad).toBe(false);
    }
    expect(parse({ image: 'javascript:alert(1)' }).success).toBe(false);
    for (const good of ["/uploads/a.png", "https://x.supabase.co/storage/v1/object/public/product-images/products/a-1.png"]) {
      expect(parse({ images: [good] }).success, good).toBe(true);
    }
  });
});

describe("product gallery storage", () => {
  const create = async (images: string[]) => {
    const parsed = productSchema.parse({ id: "wheel", name: "Wheel", price: 100, images });
    expect(await createResource("products", parsed)).toBe(true);
  };

  it("saves, returns and orders every photo (cover = first)", async () => {
    await create([img(1), img(2), img(3), img(4)]);
    const p = (await getResource("products", "wheel"))!;
    expect(p.images).toEqual([img(1), img(2), img(3), img(4)]);
    expect(p.image).toBe(img(1));
  });

  it("re-ordering, removing and adding photos on update is reflected everywhere", async () => {
    await create([img(1), img(2), img(3)]);
    const update = async (images: string[]) =>
      updateResource("products", "wheel", productSchema.parse({ id: "wheel", name: "Wheel", price: 100, images }));

    await update([img(3), img(1)]); // new cover, one removed
    let p = (await getResource("products", "wheel"))!;
    expect(p.images).toEqual([img(3), img(1)]);
    expect(p.image).toBe(img(3));

    await update([img(3), img(1), img(9)]); // one added
    p = (await getResource("products", "wheel"))!;
    expect(p.images).toEqual([img(3), img(1), img(9)]);

    await update([]); // all removed
    p = (await getResource("products", "wheel"))!;
    expect(p.images).toEqual([]);
    expect(p.image).toBe("");
  });

  it("the public product search returns the gallery too", async () => {
    await create([img(1), img(2)]);
    const found = await searchProducts({ sort: "position", page: 1, limit: 10 });
    expect(found.items[0]).toMatchObject({ id: "wheel", image: img(1), images: [img(1), img(2)] });
  });

  it("deleting the product's gallery rows never happens by accident: a legacy single image still shows as a gallery", async () => {
    await query("insert into products (id, name, price, image) values ('legacy', 'Legacy', 5, '/old.png')");
    const p = (await getResource("products", "legacy"))!;
    expect(p.images).toEqual(["/old.png"]);
  });
});
