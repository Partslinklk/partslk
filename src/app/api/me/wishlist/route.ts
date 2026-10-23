import { z } from "zod";
import { query } from "@/server/db";
import { requireCustomer } from "@/server/customer-auth";
import { handle, HttpError, json, parseBody } from "@/server/http";
import { idSchema } from "@/server/validation/catalog";

const body = z.object({ productId: idSchema });

/** The customer's wishlist as full product rows (published, non-deleted products only). */
export const GET = handle(async () => {
  const me = await requireCustomer();
  const { rows } = await query(
    `select p.id, p.name, p.image, p.price, p.original_price, p.rating, p.action
       from wishlist_items w join products p on p.id = w.product_id
      where w.customer_id = $1 and p.deleted_at is null and p.published
      order by w.created_at desc`,
    [me.id],
  );
  return json(
    rows.map((r) => ({
      id: r.id, name: r.name, image: r.image, price: r.price,
      ...(r.original_price != null ? { originalPrice: r.original_price } : {}),
      rating: r.rating, action: r.action,
    })),
  );
});

/** Adds a product (idempotent). */
export const PUT = handle(async (request: Request) => {
  const me = await requireCustomer();
  const { productId } = await parseBody(request, body);
  const ok = await query("select 1 from products where id = $1 and deleted_at is null", [productId]);
  if (!ok.rowCount) throw new HttpError(404, "Product not found.");
  await query("insert into wishlist_items (customer_id, product_id) values ($1, $2) on conflict do nothing", [me.id, productId]);
  return json({ ok: true });
});

/** Removes a product: DELETE /api/me/wishlist?productId=... */
export const DELETE = handle(async (request: Request) => {
  const me = await requireCustomer();
  const productId = new URL(request.url).searchParams.get("productId") ?? "";
  if (!idSchema.safeParse(productId).success) throw new HttpError(400, "productId is required.");
  await query("delete from wishlist_items where customer_id = $1 and product_id = $2", [me.id, productId]);
  return json({ ok: true });
});
