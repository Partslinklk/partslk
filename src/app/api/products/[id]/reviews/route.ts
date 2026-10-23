import { clientIp, isThrottled, recordFailure } from "@/server/admin";
import { query } from "@/server/db";
import { getCustomer, requireCustomer } from "@/server/customer-auth";
import { handle, HttpError, json, parseBody } from "@/server/http";
import { createReview, eligibility, publicReviews, reviewSchema } from "@/server/reviews";
import { idSchema } from "@/server/validation/catalog";

type Ctx = RouteContext<"/api/products/[id]/reviews">;

async function productId(ctx: Ctx) {
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) throw new HttpError(404, "Product not found.");
  const found = await query("select 1 from products where id = $1 and deleted_at is null and published", [id]);
  if (!found.rowCount) throw new HttpError(404, "Product not found.");
  return id;
}

/** Approved reviews, the real star breakdown, and whether the current visitor may post one. */
export const GET = handle(async (request: Request, ctx: Ctx) => {
  const id = await productId(ctx);
  const p = new URL(request.url).searchParams;
  const limit = Math.min(50, Math.max(1, Number(p.get("limit")) || 20));
  const offset = Math.max(0, Number(p.get("offset")) || 0);
  const customer = await getCustomer().catch(() => null);
  const [data, elig] = await Promise.all([publicReviews(id, limit, offset), eligibility(customer?.id ?? null, id)]);
  return json({ ...data, eligibility: elig });
});

/** Submit a review (signed-in customers who received this product). It waits for moderation. */
export const POST = handle(async (request: Request, ctx: Ctx) => {
  const id = await productId(ctx);
  const me = await requireCustomer();
  const input = await parseBody(request, reviewSchema);

  const key = `review:${clientIp(request)}`;
  if (await isThrottled(key, 10)) throw new HttpError(429, "Too many reviews submitted. Try again later.");
  await recordFailure(key);

  await createReview(me, id, input);
  return json({ ok: true, status: "pending" }, { status: 201 });
});
