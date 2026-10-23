import { z } from "zod";
import { clientIp, isThrottled, recordFailure } from "@/server/admin";
import { query } from "@/server/db";
import { sendNewsletterWelcome } from "@/server/email";
import { handle, HttpError, json, parseBody } from "@/server/http";

const schema = z.object({
  email: z.email("Please enter a valid email address.").trim().toLowerCase().max(200),
  source: z.string().trim().max(50).default("popup"),
  /** Honeypot. */
  website: z.string().max(500).optional(),
});

/** Newsletter signup. Always answers ok, so it can't be used to discover who is subscribed. */
export const POST = handle(async (request: Request) => {
  const body = await parseBody(request, schema);

  const key = `newsletter:${clientIp(request)}`;
  if (await isThrottled(key, 10)) throw new HttpError(429, "Too many attempts. Please try again later.");
  await recordFailure(key);
  if (body.website) return json({ ok: true });

  // New address, or someone who unsubscribed and is signing up again -> welcome email. Already subscribed -> silent.
  const { rows } = await query<{ welcome: boolean }>(
    `insert into newsletter_subscribers (email, source) values ($1, $2)
     on conflict (email) do update set unsubscribed_at = null, source = excluded.source
       where newsletter_subscribers.unsubscribed_at is not null
     returning true as welcome`,
    [body.email, body.source],
  );
  if (rows[0]?.welcome) await sendNewsletterWelcome(body.email);
  return json({ ok: true });
});
