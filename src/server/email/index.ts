import { createHmac, timingSafeEqual } from "crypto";
import { after } from "next/server";
import { query } from "../db";
import { env } from "../env";
import { siteUrl } from "../site";
import * as t from "./templates";
import type { EmailOrder, Rendered } from "./templates";

export type Outgoing = Rendered & { kind: string; to: string; replyTo?: string; orderId?: string };

const MAX_ATTEMPTS = 5;

/**
 * Reserved / non-routable domains (RFC 2606, RFC 6761): test data uses them, nothing can ever receive mail there,
 * and the hard bounces would hurt the sender reputation of a real domain. These are recorded but never sent.
 */
const RESERVED_DOMAIN = /(^|\.)(example\.(com|net|org)|example|test|invalid|localhost|local)$/i;
export const isReservedEmailDomain = (email: string) => RESERVED_DOMAIN.test(email.split("@").pop() ?? "");

type OutboxRow = {
  id: string; to_email: string; reply_to: string | null; kind: string; subject: string; html: string; text_body: string; attempts: number;
};

/** Sends one outbox row. Never throws: the outcome is recorded on the row. */
async function deliver(id: string): Promise<void> {
  // Claim the row so a retry and the original send can't both fire.
  const claimed = await query<OutboxRow>(
    `update email_outbox set status = 'sending', attempts = attempts + 1
      where id = $1 and status in ('pending', 'failed') and attempts < $2
      returning id, to_email, reply_to, kind, subject, html, text_body, attempts`,
    [id, MAX_ATTEMPTS],
  );
  const row = claimed.rows[0];
  if (!row) return;

  if (isReservedEmailDomain(row.to_email)) {
    await query("update email_outbox set status = 'skipped', last_error = $2 where id = $1", [
      id, "Reserved test domain (example.com, .test, ...): recorded, not sent.",
    ]);
    return;
  }

  const e = env();
  if (!e.MAILTRAP_API_TOKEN || !e.EMAIL_FROM) {
    await query("update email_outbox set status = 'skipped', last_error = $2 where id = $1", [
      id, "Email isn't configured (MAILTRAP_API_TOKEN / EMAIL_FROM).",
    ]);
    console.log(`[email skipped] to=${row.to_email} subject="${row.subject}"`);
    return;
  }

  // Sandbox inbox (testing) when MAILTRAP_INBOX_ID is set, otherwise the live sending API.
  const url = e.MAILTRAP_INBOX_ID
    ? `https://sandbox.api.mailtrap.io/api/send/${e.MAILTRAP_INBOX_ID}`
    : `${e.MAILTRAP_API_URL}/api/send`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${e.MAILTRAP_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: { email: e.EMAIL_FROM, name: e.EMAIL_FROM_NAME },
        to: [{ email: row.to_email }],
        ...(row.reply_to ? { reply_to: { email: row.reply_to } } : {}),
        subject: row.subject,
        html: row.html,
        text: row.text_body,
        category: row.kind,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as { success?: boolean; message_ids?: string[]; errors?: string[] };
    if (!res.ok || body.success === false) {
      throw new Error(`Mailtrap ${res.status}: ${(body.errors ?? ["request failed"]).join("; ")}`);
    }
    await query("update email_outbox set status = 'sent', sent_at = now(), provider_id = $2, last_error = null where id = $1", [
      id, body.message_ids?.[0] ?? null,
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[email failed] to=${row.to_email} attempt=${row.attempts}: ${msg}`);
    await query("update email_outbox set status = 'failed', last_error = $2 where id = $1", [id, msg.slice(0, 500)]);
  }
}

/**
 * Records an email in the outbox and sends it after the response has gone out (so a slow mail
 * provider never delays checkout). If sending fails, the row stays 'failed' and housekeeping (src/server/housekeeping.ts) retries it.
 */
export async function queueEmail(m: Outgoing): Promise<string | null> {
  try {
    const { rows } = await query<{ id: string }>(
      `insert into email_outbox (kind, to_email, reply_to, subject, html, text_body, order_id)
       values ($1,$2,$3,$4,$5,$6,$7) returning id`,
      [m.kind, m.to, m.replyTo ?? null, m.subject, m.html, m.text, m.orderId ?? null],
    );
    const id = rows[0].id;
    try {
      after(() => deliver(id));
    } catch {
      void deliver(id); // outside a request scope (scripts/tests)
    }
    return id;
  } catch (err) {
    console.error("could not queue email", err); // email trouble must never fail the caller's business operation
    return null;
  }
}

/** Retries emails that failed (or were left mid-send). Returns how many it attempted. */
export async function retryOutbox(limit = 50): Promise<number> {
  await query("update email_outbox set status = 'pending' where status = 'sending' and created_at < now() - interval '10 minutes'");
  const { rows } = await query<{ id: string }>(
    "select id from email_outbox where status in ('pending', 'failed') and attempts < $1 order by created_at limit $2",
    [MAX_ATTEMPTS, limit],
  );
  for (const r of rows) await deliver(r.id);
  return rows.length;
}

// ---------------------------------------------------------------- order emails

async function loadOrder(id: string): Promise<EmailOrder | null> {
  const o = (
    await query<{
      id: string; first_name: string; email: string; subtotal: number; discount: number | null; coupon_code: string | null;
      shipping_label: string; shipping_cost: number; total: number; payment_method: string | null; payment: string;
      tracking_number: string | null;
    }>("select * from orders where id = $1", [id])
  ).rows[0];
  if (!o) return null;
  const items = (
    await query<{ name: string; qty: number; price: number }>(
      "select name, qty, price from order_items where order_id = $1 order by position",
      [id],
    )
  ).rows;
  return {
    id: o.id, firstName: o.first_name, email: o.email,
    items: items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
    subtotal: o.subtotal, discount: o.discount ?? 0, couponCode: o.coupon_code,
    shippingLabel: o.shipping_label, shippingCost: o.shipping_cost, total: o.total,
    paymentMethod: o.payment_method, paymentLabel: o.payment, trackingNumber: o.tracking_number,
  };
}

/** After an order is placed (offline methods) or paid (card): the confirmation. */
export async function sendOrderConfirmation(orderId: string, paid: boolean) {
  const o = await loadOrder(orderId);
  if (o) await queueEmail({ kind: "order_confirmation", to: o.email, orderId, ...t.orderConfirmation(o, paid) });
}

/** An offline payment (bank transfer, cash...) was marked received by staff. */
export async function sendPaymentReceived(orderId: string) {
  const o = await loadOrder(orderId);
  if (o) await queueEmail({ kind: "payment_received", to: o.email, orderId, ...t.paymentReceived(o) });
}

export async function sendOrderShipped(orderId: string) {
  const o = await loadOrder(orderId);
  if (o) await queueEmail({ kind: "shipped", to: o.email, orderId, ...t.orderShipped(o) });
}

export const sendWelcome = (to: string, firstName: string) =>
  queueEmail({ kind: "welcome", to, ...t.welcome(firstName, siteUrl()) });

// ---------------------------------------------------------------- newsletter links

function tokenSecret() {
  const s = env().EMAIL_TOKEN_SECRET;
  if (!s) throw new Error("Set EMAIL_TOKEN_SECRET to sign unsubscribe links.");
  return s;
}

export const unsubscribeToken = (email: string) =>
  createHmac("sha256", tokenSecret()).update(`unsubscribe:${email.toLowerCase()}`).digest("hex");

export function validUnsubscribeToken(email: string, token: string) {
  const a = Buffer.from(token);
  const b = Buffer.from(unsubscribeToken(email));
  return a.length === b.length && timingSafeEqual(a, b);
}

export const unsubscribeUrl = (email: string) =>
  `${siteUrl()}/unsubscribe?email=${encodeURIComponent(email)}&token=${unsubscribeToken(email)}`;

export const sendNewsletterWelcome = (email: string) =>
  queueEmail({ kind: "newsletter_welcome", to: email, ...t.newsletterWelcome(unsubscribeUrl(email)) });

export const sendContactToStaff = async (m: { name: string; email: string; subject: string; message: string }) => {
  const to = env().STAFF_NOTIFY_EMAIL;
  if (!to) {
    // The message is already saved and shows up on the admin Messages page.
    console.log("[email skipped] STAFF_NOTIFY_EMAIL isn't set; contact message saved only");
    return null;
  }
  return queueEmail({ kind: "contact_staff", to, replyTo: m.email, ...t.contactStaff(m) });
};
