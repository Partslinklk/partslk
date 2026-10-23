import { z } from "zod";
import { query } from "@/server/db";
import { validUnsubscribeToken } from "@/server/email";
import { handle, HttpError, json, parseBody } from "@/server/http";

const schema = z.object({ email: z.email().trim().toLowerCase().max(200), token: z.string().min(10).max(200) });

/** POST (not GET) so email scanners that pre-fetch links can't unsubscribe people by accident. */
export const POST = handle(async (request: Request) => {
  const { email, token } = await parseBody(request, schema);
  if (!validUnsubscribeToken(email, token)) throw new HttpError(400, "This unsubscribe link isn't valid.");
  await query("update newsletter_subscribers set unsubscribed_at = coalesce(unsubscribed_at, now()) where email = $1", [email]);
  return json({ ok: true });
});
