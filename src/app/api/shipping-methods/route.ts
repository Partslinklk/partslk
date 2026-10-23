import { z } from "zod";
import { handle, HttpError, json } from "@/server/http";
import { availableShipping } from "@/server/pricing";

const schema = z.object({
  country: z.string().trim().max(100).default(""),
  subtotal: z.coerce.number().min(0).max(100_000_000).default(0),
});

/** Shipping options (with the cost that would be charged) for a subtotal and destination: ?country=&subtotal= */
export const GET = handle(async (request: Request) => {
  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) throw new HttpError(400, "Invalid query.");
  return json(await availableShipping(parsed.data.subtotal, parsed.data.country));
});
