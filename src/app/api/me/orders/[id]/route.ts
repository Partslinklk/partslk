import { readCustomerOrders } from "@/lib/db";
import { requireCustomer } from "@/server/customer-auth";
import { handle, HttpError, json } from "@/server/http";

export const GET = handle(async (_req: Request, ctx: RouteContext<"/api/me/orders/[id]">) => {
  const me = await requireCustomer();
  const { id } = await ctx.params;
  // Scoped by customer_id, so another customer's order id looks exactly like a missing one.
  const order = (await readCustomerOrders(me.id)).find((o) => o.id === id);
  if (!order) throw new HttpError(404, "Order not found.");
  return json(order);
});
