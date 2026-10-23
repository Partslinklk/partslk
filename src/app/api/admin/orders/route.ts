import { readCollection } from "@/lib/db";
import { requireAdmin } from "@/server/admin";
import { handle, json } from "@/server/http";

export const GET = handle(async (request: Request) => {
  await requireAdmin(request, "staff");
  return json(await readCollection("orders"));
});
