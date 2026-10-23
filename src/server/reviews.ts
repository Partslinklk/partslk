import { z } from "zod";
import { query, tx, type PoolClient } from "./db";
import { HttpError } from "./http";

export const reviewSchema = z.object({
  rating: z.number().int().min(1, "Please choose a star rating.").max(5),
  title: z.string().trim().max(120).default(""),
  body: z.string().trim().min(10, "Please write at least 10 characters.").max(2000),
});
export type ReviewInput = z.infer<typeof reviewSchema>;

export type Eligibility = { canReview: boolean; reason: "signin" | "not_purchased" | "already_reviewed" | null };

/** A customer may review a product once, and only after an order containing it was delivered. */
export async function eligibility(customerId: string | null, productId: string): Promise<Eligibility> {
  if (!customerId) return { canReview: false, reason: "signin" };
  const { rows } = await query<{ bought: boolean; reviewed: boolean }>(
    `select exists (select 1 from order_items oi join orders o on o.id = oi.order_id
                     where o.customer_id = $1 and o.status = 'delivered' and oi.product_id = $2) as bought,
            exists (select 1 from reviews where customer_id = $1 and product_id = $2) as reviewed`,
    [customerId, productId],
  );
  if (rows[0].reviewed) return { canReview: false, reason: "already_reviewed" };
  if (!rows[0].bought) return { canReview: false, reason: "not_purchased" };
  return { canReview: true, reason: null };
}

/** Approved reviews + the real star breakdown (replaces the placeholder numbers on the product page). */
export async function publicReviews(productId: string, limit = 20, offset = 0) {
  const [list, dist] = await Promise.all([
    query<{ id: string; author_name: string; rating: number; title: string; body: string; created_at: Date }>(
      `select id, author_name, rating, title, body, created_at from reviews
        where product_id = $1 and status = 'approved' order by created_at desc limit $2 offset $3`,
      [productId, limit, offset],
    ),
    query<{ rating: number; n: number }>(
      "select rating, count(*)::int as n from reviews where product_id = $1 and status = 'approved' group by rating",
      [productId],
    ),
  ]);
  const byStar = new Map(dist.rows.map((r) => [r.rating, r.n]));
  const breakdown = [5, 4, 3, 2, 1].map((star) => ({ star, count: byStar.get(star) ?? 0 }));
  const count = breakdown.reduce((n, b) => n + b.count, 0);
  const average = count ? Math.round((breakdown.reduce((s, b) => s + b.star * b.count, 0) / count) * 10) / 10 : 0;
  return {
    summary: { average, count, breakdown },
    reviews: list.rows.map((r) => ({
      id: r.id, author: r.author_name, rating: r.rating, title: r.title, body: r.body, createdAt: r.created_at.toISOString(),
    })),
  };
}

/** Recomputes products.rating / review_count from approved reviews. Call inside the transaction that changed a review. */
export async function recomputeRating(c: PoolClient, productId: string) {
  await c.query(
    `update products p set
       rating = coalesce((select round(avg(r.rating)::numeric, 1) from reviews r where r.product_id = p.id and r.status = 'approved'), 0),
       review_count = (select count(*)::int from reviews r where r.product_id = p.id and r.status = 'approved')
     where p.id = $1`,
    [productId],
  );
}

const shortName = (first: string, last: string) => {
  const f = first.trim();
  const l = last.trim();
  return (f ? (l ? `${f} ${l[0].toUpperCase()}.` : f) : "Customer").slice(0, 60);
};

export async function createReview(
  customer: { id: string; firstName: string; lastName: string },
  productId: string,
  input: ReviewInput,
) {
  const e = await eligibility(customer.id, productId);
  if (!e.canReview) {
    throw new HttpError(
      e.reason === "already_reviewed" ? 409 : 403,
      e.reason === "already_reviewed"
        ? "You've already reviewed this product."
        : "Only customers who received this product can review it.",
    );
  }
  try {
    const { rows } = await query<{ id: string }>(
      `insert into reviews (product_id, customer_id, author_name, rating, title, body)
       values ($1,$2,$3,$4,$5,$6) returning id`,
      [productId, customer.id, shortName(customer.firstName, customer.lastName), input.rating, input.title, input.body],
    );
    return rows[0].id;
  } catch (err) {
    if ((err as { code?: string }).code === "23505") throw new HttpError(409, "You've already reviewed this product.");
    throw err;
  }
}

// ------------------------------------------------------------------ admin

export type AdminReview = {
  id: string; productId: string; productName: string | null; author: string; email: string | null;
  rating: number; title: string; body: string; status: "pending" | "approved" | "rejected"; createdAt: string;
};

export async function adminReviews(): Promise<AdminReview[]> {
  const { rows } = await query<{
    id: string; product_id: string; product_name: string | null; author_name: string; email: string | null;
    rating: number; title: string; body: string; status: AdminReview["status"]; created_at: Date;
  }>(
    `select r.id, r.product_id, p.name as product_name, r.author_name, c.email, r.rating, r.title, r.body, r.status, r.created_at
       from reviews r left join products p on p.id = r.product_id left join customers c on c.id = r.customer_id
      order by (r.status = 'pending') desc, r.created_at desc limit 500`,
  );
  return rows.map((r) => ({
    id: r.id, productId: r.product_id, productName: r.product_name, author: r.author_name, email: r.email,
    rating: r.rating, title: r.title, body: r.body, status: r.status, createdAt: r.created_at.toISOString(),
  }));
}

export function moderateReview(id: string, status: "pending" | "approved" | "rejected") {
  return tx(async (c) => {
    const { rows } = await c.query<{ product_id: string }>(
      "update reviews set status = $2, moderated_at = now() where id = $1 returning product_id",
      [id, status],
    );
    if (!rows[0]) return null;
    await recomputeRating(c, rows[0].product_id);
    return rows[0];
  });
}

export function deleteReview(id: string) {
  return tx(async (c) => {
    const { rows } = await c.query<{ product_id: string; author_name: string; rating: number }>(
      "delete from reviews where id = $1 returning product_id, author_name, rating",
      [id],
    );
    if (!rows[0]) return null;
    await recomputeRating(c, rows[0].product_id);
    return rows[0];
  });
}
