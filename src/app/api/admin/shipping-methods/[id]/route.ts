import { logAudit, requireAdmin } from "@/server/admin";
import { deleteShippingMethod, getShippingMethod, shippingSchema, updateShippingMethod } from "@/server/commerce-admin";
import { handle, HttpError, json, parseBody } from "@/server/http";

type Ctx = RouteContext<"/api/admin/shipping-methods/[id]">;

export const GET = handle(async (request: Request, ctx: Ctx) => {
  await requireAdmin(request);
  const found = await getShippingMethod((await ctx.params).id);
  if (!found) throw new HttpError(404, "Shipping method not found.");
  return json(found);
});

export const PUT = handle(async (request: Request, ctx: Ctx) => {
  const admin = await requireAdmin(request);
  const { id } = await ctx.params;
  const method = await parseBody(request, shippingSchema);
  if (method.id !== id) throw new HttpError(400, "The id in the body must match the URL.");
  const before = await getShippingMethod(id);
  if (!(await updateShippingMethod(id, method))) throw new HttpError(404, "Shipping method not found.");
  await logAudit(admin, "shipping.update", "shipping_methods", id, { before, after: method });
  return json(method);
});

export const DELETE = handle(async (request: Request, ctx: Ctx) => {
  const admin = await requireAdmin(request);
  const { id } = await ctx.params;
  const before = await getShippingMethod(id);
  if (!(await deleteShippingMethod(id))) throw new HttpError(404, "Shipping method not found.");
  await logAudit(admin, "shipping.delete", "shipping_methods", id, { before });
  return json({ ok: true });
});
