import { searchProducts } from "@/server/catalog";
import { handle, HttpError, json } from "@/server/http";
import { productQuerySchema } from "@/server/validation/catalog";

/** Public catalogue search: ?q=&category=&brand=&color=&min=&max=&sort=&page=&limit= */
export const GET = handle(async (request: Request) => {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = productQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid query.", Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message])));
  }
  return json(await searchProducts(parsed.data));
});
