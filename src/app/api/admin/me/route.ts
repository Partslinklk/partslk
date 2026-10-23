import { requireAdmin } from "@/server/admin";
import { handle, json } from "@/server/http";

/** Who is signed in (id, email, role) — lets the admin UI tailor itself to the role. */
export const GET = handle(async (request: Request) => json(await requireAdmin(request, "staff")));
