import { z } from "zod";
import { isThrottled, logAudit, recordFailure, requireAdmin } from "@/server/admin";
import { queueEmail, unsubscribeUrl } from "@/server/email";
import * as t from "@/server/email/templates";
import { handle, HttpError, parseBody } from "@/server/http";
import { siteUrl } from "@/server/site";

const SAMPLE_ORDER: t.EmailOrder = {
  id: "PL-1001",
  firstName: "Alex",
  email: "alex@example.com",
  items: [
    { name: "ESP High Output Performance Alternator", qty: 1, price: 245 },
    { name: "Motul 7100 10W50 Synthetic Engine Oil 4L", qty: 2, price: 64 },
  ],
  subtotal: 373,
  discount: 37.3,
  couponCode: "WELCOME10",
  shippingLabel: "Flat rate",
  shippingCost: 10,
  total: 345.7,
  paymentMethod: "bank",
  paymentLabel: "Direct bank transfer",
  trackingNumber: "LK123456789",
};

const TEMPLATES = [
  "order_confirmation",
  "order_confirmation_paid",
  "payment_received",
  "shipped",
  "welcome",
  "contact_staff",
  "newsletter_welcome",
] as const;
type TemplateName = (typeof TEMPLATES)[number];

function render(name: TemplateName, to: string): t.Rendered {
  switch (name) {
    case "order_confirmation":
      return t.orderConfirmation(SAMPLE_ORDER, false);
    case "order_confirmation_paid":
      return t.orderConfirmation({ ...SAMPLE_ORDER, paymentMethod: "card", paymentLabel: "Credit / debit card" }, true);
    case "payment_received":
      return t.paymentReceived(SAMPLE_ORDER);
    case "shipped":
      return t.orderShipped(SAMPLE_ORDER);
    case "welcome":
      return t.welcome("Alex", siteUrl());
    case "contact_staff":
      return t.contactStaff({ name: "Alex Example", email: "alex@example.com", subject: "Fitment question", message: "Does this alternator fit a 2015 Honda Civic?" });
    case "newsletter_welcome":
      return t.newsletterWelcome(unsubscribeUrl(to));
  }
}

const templateSchema = z.enum(TEMPLATES);

/** Owner only. Opens the rendered email in the browser: /api/admin/email-preview?template=order_confirmation */
export const GET = handle(async (request: Request) => {
  await requireAdmin(request, "owner");
  const name = new URL(request.url).searchParams.get("template") ?? "";
  const parsed = templateSchema.safeParse(name);
  if (!parsed.success) {
    return new Response(`Pick one: ${TEMPLATES.map((n) => `?template=${n}`).join("  ")}`, { status: 400 });
  }
  return new Response(render(parsed.data, "preview@example.com").html, { headers: { "content-type": "text/html; charset=utf-8" } });
});

const sendSchema = z.object({ template: templateSchema, to: z.email().trim().toLowerCase().max(200) });

/** Owner only. Sends a sample email through the normal outbox: { "template": "...", "to": "you@example.com" } */
export const POST = handle(async (request: Request) => {
  const admin = await requireAdmin(request, "owner");
  const { template, to } = await parseBody(request, sendSchema);

  const key = `email-test:${admin.id}`;
  if (await isThrottled(key, 10)) throw new HttpError(429, "Too many test emails. Try again later.");
  await recordFailure(key);

  const rendered = render(template, to);
  const id = await queueEmail({ kind: "test", to, ...rendered, subject: `[TEST] ${rendered.subject}` });
  if (!id) throw new HttpError(500, "Could not queue the email.");
  await logAudit(admin, "email.test", "email_outbox", id, { template, to });
  return Response.json({ ok: true, id, note: "Queued. Check email_outbox for sent / failed / skipped." });
});
