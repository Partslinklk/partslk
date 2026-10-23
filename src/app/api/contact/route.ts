import { z } from "zod";
import { clientIp, isThrottled, recordFailure } from "@/server/admin";
import { query } from "@/server/db";
import { sendContactToStaff } from "@/server/email";
import { handle, HttpError, json, parseBody } from "@/server/http";

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(100),
  email: z.email("Please enter a valid email address.").trim().max(200),
  subject: z.string().trim().max(150).default(""),
  message: z.string().trim().max(5000).default(""),
  /** Honeypot: hidden from people, filled in by bots. */
  website: z.string().max(500).optional(),
});

/** Contact form: saved first (so it's never lost), then forwarded to staff by email. */
export const POST = handle(async (request: Request) => {
  const body = await parseBody(request, schema);

  const key = `contact:${clientIp(request)}`;
  if (await isThrottled(key, 5)) throw new HttpError(429, "You've sent several messages recently. Please try again later.");
  await recordFailure(key);

  if (body.website) return json({ ok: true }); // a bot: pretend it worked, store nothing

  await query("insert into contact_messages (name, email, subject, message) values ($1,$2,$3,$4)", [
    body.name, body.email, body.subject, body.message,
  ]);
  await sendContactToStaff(body);
  return json({ ok: true });
});
