import { z } from "zod";
import { addressSchema, deleteAddress, getAddress, updateAddress } from "@/server/addresses";
import { requireCustomer } from "@/server/customer-auth";
import { handle, HttpError, json, parseBody } from "@/server/http";

type Ctx = RouteContext<"/api/me/addresses/[id]">;

async function addressId(ctx: Ctx) {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) throw new HttpError(404, "Address not found.");
  return id;
}

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const me = await requireCustomer();
  const found = await getAddress(me.id, await addressId(ctx));
  if (!found) throw new HttpError(404, "Address not found.");
  return json(found);
});

export const PUT = handle(async (request: Request, ctx: Ctx) => {
  const me = await requireCustomer();
  const updated = await updateAddress(me.id, await addressId(ctx), await parseBody(request, addressSchema));
  if (!updated) throw new HttpError(404, "Address not found.");
  return json(updated);
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const me = await requireCustomer();
  if (!(await deleteAddress(me.id, await addressId(ctx)))) throw new HttpError(404, "Address not found.");
  return json({ ok: true });
});
