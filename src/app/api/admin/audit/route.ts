import { requireAdmin } from "@/server/admin";
import { query } from "@/server/db";
import { handle, json } from "@/server/http";

/** Audit trail, newest first. Owner only. ?limit= (max 200) &offset= &entity= &action= */
export const GET = handle(async (request: Request) => {
  await requireAdmin(request);
  const p = new URL(request.url).searchParams;
  const limit = Math.min(200, Math.max(1, Number(p.get("limit")) || 50));
  const offset = Math.max(0, Number(p.get("offset")) || 0);

  const where: string[] = [];
  const params: unknown[] = [];
  for (const key of ["entity", "action"] as const) {
    const v = p.get(key);
    if (v) {
      params.push(v);
      where.push(`${key} = $${params.length}`);
    }
  }
  params.push(limit, offset);
  const { rows } = await query(
    `select id, admin_email, action, entity, entity_id, diff, created_at from audit_log
      ${where.length ? "where " + where.join(" and ") : ""}
      order by created_at desc, id desc limit $${params.length - 1} offset $${params.length}`,
    params,
  );
  return json(rows);
});
