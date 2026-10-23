import { logAudit, requireAdmin } from "@/server/admin";
import { markOrderPaid } from "@/server/checkout";
import { handle, HttpError, json } from "@/server/http";

/** Marks an order paid by hand (bank transfer received, cash collected, ...). Manager or owner. */
export const POST = handle(async (request: Request, ctx: RouteContext<"/api/admin/orders/[id]/paid">) => {
  const admin = await requireAdmin(request, "manager");
  const { id } = await ctx.params;
  const result = await markOrderPaid(id, null, `admin:${admin.email}`);
  if (result === "missing") throw new HttpError(404, "Order not found.");
  if (result === "already") throw new HttpError(409, "That order is already marked paid.");
  await logAudit(admin, "orders.paid", "orders", id, { result });
  return json({ ok: true, result });
});
