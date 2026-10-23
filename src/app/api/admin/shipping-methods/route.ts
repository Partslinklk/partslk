import { logAudit, requireAdmin } from "@/server/admin";
import { createShippingMethod, listShippingMethods, shippingSchema } from "@/server/commerce-admin";
import { handle, HttpError, json, parseBody } from "@/server/http";

export const GET = handle(async (request: Request) => {
  await requireAdmin(request, "staff");
  return json(await listShippingMethods());
});

export const POST = handle(async (request: Request) => {
  const admin = await requireAdmin(request, "manager");
  const method = await parseBody(request, shippingSchema);
  if (!(await createShippingMethod(method))) throw new HttpError(409, `"${method.id}" already exists.`);
  await logAudit(admin, "shipping.create", "shipping_methods", method.id, { after: method });
  return json(method, { status: 201 });
});
