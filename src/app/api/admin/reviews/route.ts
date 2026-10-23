import { requireAdmin } from "@/server/admin";
import { handle, json } from "@/server/http";
import { adminReviews } from "@/server/reviews";

/** All reviews, pending first. */
export const GET = handle(async (request: Request) => {
  await requireAdmin(request, "manager");
  return json(await adminReviews());
});
