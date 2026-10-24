import { logAudit, requireAdmin } from "@/server/admin";
import { couponSchema, createCoupon, listCoupons } from "@/server/commerce-admin";
import { handle, HttpError, json, parseBody } from "@/server/http";

export const GET = handle(async (request: Request) => {
  await requireAdmin(request);
  return json(await listCoupons());
});

export const POST = handle(async (request: Request) => {
  const admin = await requireAdmin(request);
  const coupon = await parseBody(request, couponSchema);
  if (!(await createCoupon(coupon))) throw new HttpError(409, `Code "${coupon.code}" already exists.`);
  await logAudit(admin, "coupons.create", "coupons", coupon.code, { after: coupon });
  return json(coupon, { status: 201 });
});
