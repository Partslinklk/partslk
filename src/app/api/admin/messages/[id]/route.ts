import { z } from "zod";
import { logAudit, requireAdmin } from "@/server/admin";
import { query } from "@/server/db";
import { handle, HttpError, json, parseBody } from "@/server/http";

type Ctx = RouteContext<"/api/admin/messages/[id]">;

const idSchema = z.uuid();
const statusSchema = z.object({ status: z.enum(["new", "read", "replied"]) });

async function messageId(ctx: Ctx) {
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) throw new HttpError(404, "Message not found.");
  return id;
}

export const PUT = handle(async (request: Request, ctx: Ctx) => {
  const admin = await requireAdmin(request);
  const id = await messageId(ctx);
  const { status } = await parseBody(request, statusSchema);
  const r = await query("update contact_messages set status = $2 where id = $1", [id, status]);
  if (!r.rowCount) throw new HttpError(404, "Message not found.");
  await logAudit(admin, "messages.status", "contact_messages", id, { after: status });
  return json({ ok: true, status });
});

export const DELETE = handle(async (request: Request, ctx: Ctx) => {
  const admin = await requireAdmin(request);
  const id = await messageId(ctx);
  const r = await query("delete from contact_messages where id = $1 returning name, email", [id]);
  if (!r.rowCount) throw new HttpError(404, "Message not found.");
  await logAudit(admin, "messages.delete", "contact_messages", id, { before: r.rows[0] });
  return json({ ok: true });
});
