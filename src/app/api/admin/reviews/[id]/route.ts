import { z } from "zod";
import { logAudit, requireAdmin } from "@/server/admin";
import { handle, HttpError, json, parseBody } from "@/server/http";
import { deleteReview, moderateReview } from "@/server/reviews";

type Ctx = RouteContext<"/api/admin/reviews/[id]">;

const statusSchema = z.object({ status: z.enum(["pending", "approved", "rejected"]) });

async function reviewId(ctx: Ctx) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new HttpError(404, "Review not found.");
  return id;
}

/** Approve / reject. The product's rating and review count are recomputed in the same transaction. */
export const PUT = handle(async (request: Request, ctx: Ctx) => {
  const admin = await requireAdmin(request, "manager");
  const id = await reviewId(ctx);
  const { status } = await parseBody(request, statusSchema);
  if (!(await moderateReview(id, status))) throw new HttpError(404, "Review not found.");
  await logAudit(admin, "reviews.moderate", "reviews", id, { after: status });
  return json({ ok: true, status });
});

export const DELETE = handle(async (request: Request, ctx: Ctx) => {
  const admin = await requireAdmin(request, "manager");
  const id = await reviewId(ctx);
  const removed = await deleteReview(id);
  if (!removed) throw new HttpError(404, "Review not found.");
  await logAudit(admin, "reviews.delete", "reviews", id, { before: removed });
  return json({ ok: true });
});
