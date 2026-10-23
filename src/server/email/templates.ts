import { formatPrice } from "@/lib/format-price";

export type Rendered = { subject: string; html: string; text: string };

export type EmailOrder = {
  id: string;
  firstName: string;
  email: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  shippingLabel: string;
  shippingCost: number;
  total: number;
  paymentMethod: string | null;
  paymentLabel: string;
  trackingNumber: string | null;
};

const STORE = "Partslk";
const BRAND = "#1b7bb8";

/** Everything user-supplied goes through this before it is put into HTML. */
export const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string, footer = "") {
  return `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2933">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden">
<tr><td style="background:${BRAND};padding:20px 28px;color:#fff;font-size:22px;font-weight:700">${STORE}</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:20px">${esc(title)}</h1>
${body}
</td></tr>
<tr><td style="padding:16px 28px;background:#f9fafb;color:#6b7280;font-size:12px">${footer || `You are receiving this email because of activity on ${STORE}.`}</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (html: string) => `<p style="margin:0 0 14px;line-height:1.55;font-size:15px">${html}</p>`;

function orderTable(o: EmailOrder) {
  const rows = o.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #eef0f2">${esc(i.qty)} &times; ${esc(i.name)}</td>` +
        `<td align="right" style="padding:8px 0;border-bottom:1px solid #eef0f2">${esc(formatPrice(i.price * i.qty))}</td></tr>`,
    )
    .join("");
  const line = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:6px 0;${bold ? "font-weight:700;border-top:2px solid #1f2933;" : "color:#4b5563;"}">${label}</td>` +
    `<td align="right" style="padding:6px 0;${bold ? "font-weight:700;border-top:2px solid #1f2933;" : "color:#4b5563;"}">${value}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:8px 0 18px">${rows}
${line("Subtotal", esc(formatPrice(o.subtotal)))}
${o.discount > 0 ? line(`Promo ${esc(o.couponCode ?? "")}`, "-" + esc(formatPrice(o.discount))) : ""}
${line(`Shipping (${esc(o.shippingLabel)})`, esc(formatPrice(o.shippingCost)))}
${line("Total", esc(formatPrice(o.total)), true)}</table>`;
}

function orderText(o: EmailOrder) {
  return [
    ...o.items.map((i) => `${i.qty} x ${i.name}  ${formatPrice(i.price * i.qty)}`),
    `Subtotal: ${formatPrice(o.subtotal)}`,
    ...(o.discount > 0 ? [`Promo ${o.couponCode}: -${formatPrice(o.discount)}`] : []),
    `Shipping (${o.shippingLabel}): ${formatPrice(o.shippingCost)}`,
    `Total: ${formatPrice(o.total)}`,
  ].join("\n");
}

const PAY_NOTE: Record<string, string> = {
  bank: "Please transfer the total to our bank account and use your order number as the payment reference. We will start processing your order once the payment arrives.",
  check: "Please send your check with your order number written on it. We will start processing your order once it is received.",
  cod: "You will pay in cash when your order is delivered.",
};

export function orderConfirmation(o: EmailOrder, paid: boolean): Rendered {
  const note = paid ? "Your payment has been received - thank you!" : PAY_NOTE[o.paymentMethod ?? ""] ?? "";
  const subject = `${STORE} order ${o.id} ${paid ? "confirmed and paid" : "received"}`;
  return {
    subject,
    html: layout(
      `Thanks for your order, ${o.firstName}!`,
      p(`Your order <strong>${esc(o.id)}</strong> has been ${paid ? "confirmed" : "received"}.`) +
        orderTable(o) +
        (note ? p(esc(note)) : "") +
        p(`Payment method: ${esc(o.paymentLabel)}`),
    ),
    text: `Thanks for your order, ${o.firstName}!\n\nOrder ${o.id} has been ${paid ? "confirmed" : "received"}.\n\n${orderText(o)}\n\n${note}\nPayment method: ${o.paymentLabel}`,
  };
}

export function paymentReceived(o: EmailOrder): Rendered {
  return {
    subject: `Payment received for order ${o.id}`,
    html: layout(
      "We've received your payment",
      p(`Hi ${esc(o.firstName)}, we have received your payment of <strong>${esc(formatPrice(o.total))}</strong> for order <strong>${esc(o.id)}</strong>.`) +
        p("We are now preparing your order and will email you again when it ships."),
    ),
    text: `Hi ${o.firstName},\n\nWe have received your payment of ${formatPrice(o.total)} for order ${o.id}. We are now preparing your order and will email you when it ships.`,
  };
}

export function orderShipped(o: EmailOrder): Rendered {
  const tracking = o.trackingNumber
    ? p(`Tracking number: <strong>${esc(o.trackingNumber)}</strong>`)
    : p("A tracking number will follow if one is available.");
  return {
    subject: `Your order ${o.id} is on its way`,
    html: layout(
      "Your order has shipped",
      p(`Hi ${esc(o.firstName)}, good news - order <strong>${esc(o.id)}</strong> is on its way to you.`) + tracking + orderTable(o),
    ),
    text: `Hi ${o.firstName},\n\nOrder ${o.id} is on its way.${o.trackingNumber ? `\nTracking number: ${o.trackingNumber}` : ""}\n\n${orderText(o)}`,
  };
}

export function welcome(firstName: string, siteUrl: string): Rendered {
  const name = firstName || "there";
  return {
    subject: `Welcome to ${STORE}`,
    html: layout(
      `Welcome, ${name}!`,
      p("Your account is ready. You can track your orders, save addresses and keep a wishlist.") +
        p(`<a href="${esc(siteUrl)}/my-account" style="color:${BRAND}">Go to your account</a>`),
    ),
    text: `Welcome, ${name}!\n\nYour account is ready: ${siteUrl}/my-account`,
  };
}

export function contactStaff(m: { name: string; email: string; subject: string; message: string }): Rendered {
  const subject = m.subject ? `Contact form: ${m.subject}` : `Contact form message from ${m.name}`;
  return {
    subject: subject.replace(/[\r\n]+/g, " ").slice(0, 200),
    html: layout(
      "New contact form message",
      p(`<strong>${esc(m.name)}</strong> (<a href="mailto:${esc(m.email)}">${esc(m.email)}</a>)`) +
        (m.subject ? p(`Subject: ${esc(m.subject)}`) : "") +
        `<div style="white-space:pre-wrap;line-height:1.55;font-size:15px;background:#f9fafb;border-radius:6px;padding:14px">${esc(m.message) || "<em>(no message)</em>"}</div>`,
    ),
    text: `New contact form message\n\nFrom: ${m.name} <${m.email}>\n${m.subject ? `Subject: ${m.subject}\n` : ""}\n${m.message || "(no message)"}`,
  };
}

export function newsletterWelcome(unsubscribeUrl: string): Rendered {
  return {
    subject: `You're subscribed to ${STORE} updates`,
    html: layout(
      "Thanks for subscribing",
      p("You will now hear from us about new arrivals and offers. We will never share your email address."),
      `Changed your mind? <a href="${esc(unsubscribeUrl)}" style="color:#6b7280">Unsubscribe</a>.`,
    ),
    text: `Thanks for subscribing to ${STORE} updates.\n\nUnsubscribe: ${unsubscribeUrl}`,
  };
}
