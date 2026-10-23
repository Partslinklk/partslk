import { logAudit, requireAdmin } from "@/server/admin";
import { couponSchema, deleteCoupon, getCoupon, updateCoupon } from "@/server/commerce-admin";
import { handle, HttpError, json, parseBody } from "@/server/http";

type Ctx = RouteContext<"/api/admin/coupons/[code]">;

export const GET = handle(async (request: Request, ctx: Ctx) => {
  await requireAdmin(request, "manager");
  const found = await getCoupon((await ctx.params).code);
  if (!found) throw new HttpError(404, "Coupon not found.");
  return json(found);
});

export const PUT = handle(async (request: Request, ctx: Ctx) => {
  const admin = await requireAdmin(request, "manager");
  const { code } = await ctx.params;
  const coupon = await parseBody(request, couponSchema);
  if (coupon.code !== code.toUpperCase()) throw new HttpError(400, "The code in the body must match the URL.");
  const before = await getCoupon(code);
  if (!(await updateCoupon(code, coupon))) throw new HttpError(404, "Coupon not found.");
  await logAudit(admin, "coupons.update", "coupons", coupon.code, { before, after: coupon });
  return json(coupon);
});

export const DELETE = handle(async (request: Request, ctx: Ctx) => {
  const admin = await requireAdmin(request, "manager");
  const { code } = await ctx.params;
  const before = await getCoupon(code);
  if (!(await deleteCoupon(code))) throw new HttpError(404, "Coupon not found.");
  await logAudit(admin, "coupons.delete", "coupons", code.toUpperCase(), { before });
  return json({ ok: true });
});
