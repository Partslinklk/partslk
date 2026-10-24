import { z } from "zod";
import { logAudit, requireAdmin } from "@/server/admin";
import { query } from "@/server/db";
import { handle, HttpError, json, parseBody } from "@/server/http";

/** Newsletter subscribers, newest first. Manager or owner (it's customer personal data). */
export const GET = handle(async (request: Request) => {
  await requireAdmin(request);
  const { rows } = await query(
    "select email, source, unsubscribed_at, created_at from newsletter_subscribers order by created_at desc limit 5000",
  );
  return json(
    rows.map((r) => ({
      email: r.email,
      source: r.source,
      createdAt: new Date(r.created_at as string).toISOString(),
      unsubscribedAt: r.unsubscribed_at ? new Date(r.unsubscribed_at as string).toISOString() : null,
    })),
  );
});

/** Removes a subscriber entirely (e.g. a data-deletion request). */
export const DELETE = handle(async (request: Request) => {
  const admin = await requireAdmin(request);
  const { email } = await parseBody(request, z.object({ email: z.email().toLowerCase() }));
  const r = await query("delete from newsletter_subscribers where email = $1", [email]);
  if (!r.rowCount) throw new HttpError(404, "Subscriber not found.");
  await logAudit(admin, "subscribers.delete", "newsletter_subscribers", email);
  return json({ ok: true });
});
