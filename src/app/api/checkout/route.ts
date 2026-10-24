import { clientIp, isThrottled, recordFailure } from "@/server/admin";
import { checkoutSchema, placeOrder } from "@/server/checkout";
import { getCustomer } from "@/server/customer-auth";
import { scheduleHousekeeping } from "@/server/housekeeping";
import { handle, HttpError, json, parseBody } from "@/server/http";

/** Prices the cart server-side, reserves stock and creates the order (plus a Stripe session for card payments). */
export const POST = handle(async (request: Request) => {
  const input = await parseBody(request, checkoutSchema);
  scheduleHousekeeping();

  const key = `checkout:${clientIp(request)}`;
  if (await isThrottled(key, 20)) throw new HttpError(429, "Too many orders from this connection. Try again later.");
  await recordFailure(key);

  // Link the order to the signed-in customer (guests check out as before).
  const customer = await getCustomer().catch(() => null);
  return json(await placeOrder(input, customer?.id ?? null));
});
