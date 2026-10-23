import { requireAdmin } from "@/server/admin";
import { query } from "@/server/db";
import { handle, json } from "@/server/http";

/** Contact-form inbox, newest first. */
export const GET = handle(async (request: Request) => {
  await requireAdmin(request, "staff");
  const { rows } = await query(
    "select id, name, email, subject, message, status, created_at from contact_messages order by created_at desc limit 500",
  );
  return json(rows.map((r) => ({ ...r, createdAt: new Date(r.created_at as string).toISOString(), created_at: undefined })));
});
