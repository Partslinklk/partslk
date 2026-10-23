import { z } from "zod";
import { clientIp, isThrottled, recordFailure } from "@/server/admin";
import { handle, HttpError, json, parseBody } from "@/server/http";
import { evaluateCoupon } from "@/server/pricing";

const schema = z.object({ code: z.string().trim().min(1).max(50), subtotal: z.number().min(0).max(100_000_000) });

/** Previews a promo code: { code, subtotal } -> { code, discount }. The real discount is recomputed at checkout. */
export const POST = handle(async (request: Request) => {
  const { code, subtotal } = await parseBody(request, schema);
  const key = `coupon:${clientIp(request)}`;
  if (await isThrottled(key, 20)) throw new HttpError(429, "Too many attempts. Try again in a few minutes.");
  await recordFailure(key);

  const { coupon, discount } = await evaluateCoupon(code, subtotal);
  return json({ code: coupon.code, kind: coupon.kind, value: coupon.value, discount });
});
