import { addressSchema, countAddresses, createAddress, listAddresses, MAX_ADDRESSES } from "@/server/addresses";
import { requireCustomer } from "@/server/customer-auth";
import { handle, HttpError, json, parseBody } from "@/server/http";

export const GET = handle(async () => json(await listAddresses((await requireCustomer()).id)));

export const POST = handle(async (request: Request) => {
  const me = await requireCustomer();
  const body = await parseBody(request, addressSchema);
  if ((await countAddresses(me.id)) >= MAX_ADDRESSES) throw new HttpError(400, `You can save up to ${MAX_ADDRESSES} addresses.`);
  return json(await createAddress(me.id, body), { status: 201 });
});
