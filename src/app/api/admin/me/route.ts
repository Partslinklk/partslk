import { requireAdmin } from "@/server/admin";
import { handle, json } from "@/server/http";

/** Who is signed in (id, email). */
export const GET = handle(async (request: Request) => json(await requireAdmin(request)));
