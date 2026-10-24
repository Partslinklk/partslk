import { z } from "zod";
import { readOrder } from "@/lib/db";
import { logAudit, requireAdmin } from "@/server/admin";
import { transitionOrder } from "@/server/checkout";
import { handle, HttpError, json, parseBody } from "@/server/http";
import { deleteOrder } from "@/server/orders";
import { orderStatusSchema } from "@/server/validation/catalog";

type Ctx = RouteContext<"/api/admin/orders/[id]">;

const updateSchema = orderStatusSchema.extend({ trackingNumber: z.string().trim().max(100).optional() });

export const GET = handle(async (request: Request, ctx: Ctx) => {
  await requireAdmin(request);
  const { id } = await ctx.params;
  const order = await readOrder(id);
  if (!order) throw new HttpError(404, "Order not found.");
  return json(order);
});

/**
 * Moves the order along pending → processing → shipped → delivered, or cancels it from pending/processing
 * (which returns the stock and the promo-code use). Other moves are refused with 409.
 */
export const PUT = handle(async (request: Request, ctx: Ctx) => {
  const admin = await requireAdmin(request);
  const { id } = await ctx.params;
  const { status, trackingNumber } = await parseBody(request, updateSchema);
  const previous = await transitionOrder(id, status, { trackingNumber, by: admin.email });
  if (previous !== status) await logAudit(admin, "orders.status", "orders", id, { before: previous, after: status, trackingNumber });
  return json({ ok: true, status });
});

export const DELETE = handle(async (request: Request, ctx: Ctx) => {
  const admin = await requireAdmin(request);
  const { id } = await ctx.params;
  const before = await readOrder(id);
  if (!(await deleteOrder(id))) throw new HttpError(404, "Order not found.");
  await logAudit(admin, "orders.delete", "orders", id, { before });
  return json({ ok: true });
});
