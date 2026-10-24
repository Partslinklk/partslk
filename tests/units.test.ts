import { afterAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { NextRequest } from "next/server";
import { signingKeys } from "@/server/admin-keys";
import { closeDb } from "./helpers";
import { errorResponse, HttpError, parseBody } from "@/server/http";
import * as t from "@/server/email/templates";
import { createSession, verifySession } from "@/lib/admin-auth";
import { proxy } from "@/proxy";

describe("admin session token", () => {
  const secret = "unit-test-secret-0123456789";

  it("round-trips and exposes the admin id", async () => {
    const token = await createSession("env-admin", secret);
    expect(await verifySession(token, secret)).toMatchObject({ adminId: "env-admin" });
  });

  it("accepts any of several keys (rotation grace period)", async () => {
    const token = await createSession("env-admin", "old-key-0123456789abcdef");
    expect(await verifySession(token, [secret, "old-key-0123456789abcdef"])).toMatchObject({ adminId: "env-admin" });
  });

  it("rejects tampering, a wrong secret, junk, and expired tokens", async () => {
    const token = await createSession("abc", secret);
    const [id, exp, sig] = token.split(".");
    expect(await verifySession(`other.${exp}.${sig}`, secret)).toBeNull(); // different admin id
    expect(await verifySession(token, "another-secret-0123456789")).toBeNull();
    expect(await verifySession("junk", secret)).toBeNull();
    expect(await verifySession(undefined, secret)).toBeNull();
    expect(await verifySession(token, undefined)).toBeNull();
    expect(await verifySession(`${id}.${Date.now() - 1000}.${sig}`, secret)).toBeNull();
  });
});

describe("admin signing keys", () => {
  it("are created once, then reused", async () => {
    const first = await signingKeys();
    const second = await signingKeys();
    expect(first.current).toHaveLength(64);
    expect(second.current).toBe(first.current);
    expect(first.all).toContain(first.current);
  });
});

describe("HTTP error mapping", () => {
  it("maps HttpError, validation and database errors without leaking internals", async () => {
    const e1 = errorResponse(new HttpError(409, "Nope", { a: "b" }));
    expect(e1.status).toBe(409);
    expect(await e1.json()).toEqual({ error: "Nope", fields: { a: "b" } });

    const zerr = z.object({ n: z.number() }).safeParse({ n: "x" }).error!;
    expect(errorResponse(zerr).status).toBe(400);
    expect(errorResponse({ code: "23505" }).status).toBe(409);
    expect(errorResponse({ code: "23503" }).status).toBe(409);
    expect(errorResponse({ code: "22P02" }).status).toBe(400);

    const unknown = errorResponse(new Error("secret database detail: password=hunter2"));
    const body = await unknown.json();
    expect(unknown.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("hunter2");
    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("parseBody rejects bad JSON and schema mismatches with a 400", async () => {
    const schema = z.object({ n: z.number().min(1) });
    const req = (body: string) => new Request("http://x/api", { method: "POST", body });
    await expect(parseBody(req("not json"), schema)).rejects.toMatchObject({ status: 400 });
    await expect(parseBody(req('{"n":0}'), schema)).rejects.toMatchObject({ status: 400, fields: { n: expect.any(String) } });
    await expect(parseBody(req('{"n":2}'), schema)).resolves.toEqual({ n: 2 });
  });
});

describe("email templates", () => {
  const order: t.EmailOrder = {
    id: "PL-1", firstName: "<img src=x onerror=alert(1)>", email: "a@b.co",
    items: [{ name: "<script>bad()</script>", qty: 2, price: 10 }],
    subtotal: 20, discount: 2, couponCode: "SAVE", shippingLabel: "Flat", shippingCost: 5, total: 23,
    paymentMethod: "bank", paymentLabel: "Direct bank transfer", trackingNumber: "T<1>",
  };

  it("escapes every user-supplied value in HTML", () => {
    for (const html of [t.orderConfirmation(order, false).html, t.orderShipped(order).html, t.paymentReceived(order).html]) {
      expect(html).not.toContain("<script>");
      expect(html).not.toContain("<img src=x");
    }
    expect(t.orderShipped(order).html).toContain("T&lt;1&gt;");
  });

  it("keeps the contact subject on one line (no header injection) and escapes the message", () => {
    const r = t.contactStaff({ name: "N", email: "a@b.co", subject: "Hi\r\nBcc: evil@x.co", message: "<b>x</b>" });
    expect(r.subject).not.toMatch(/[\r\n]/);
    expect(r.html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });

  it("states payment instructions only for unpaid orders", () => {
    expect(t.orderConfirmation(order, false).html).toContain("transfer the total");
    expect(t.orderConfirmation(order, true).html).toContain("payment has been received");
    expect(t.orderConfirmation(order, true).subject).toContain("confirmed and paid");
  });
});

describe("proxy: CSRF, CSP and route guards", () => {
  const req = (path: string, init: { method?: string; headers?: Record<string, string> } = {}) =>
    new NextRequest(`http://localhost:3000${path}`, { method: init.method ?? "GET", headers: init.headers });

  it("blocks cross-site and 'null' origins on state-changing API calls", async () => {
    for (const origin of ["https://evil.example", "null"]) {
      const res = await proxy(req("/api/checkout", { method: "POST", headers: { origin } }));
      expect(res.status).toBe(403);
    }
  });

  it("allows same-origin calls, missing Origin (non-browser clients), safe methods and webhooks", async () => {
    for (const r of [
      req("/api/checkout", { method: "POST", headers: { origin: "http://localhost:3000" } }),
      req("/api/checkout", { method: "POST" }),
      req("/api/products", { method: "GET", headers: { origin: "https://evil.example" } }),
      req("/api/webhooks/stripe", { method: "POST", headers: { origin: "https://stripe.example" } }),
    ]) {
      expect((await proxy(r)).status).toBe(200);
    }
  });

  it("gives every request an id, and every page a fresh nonce-based CSP", async () => {
    const a = await proxy(req("/products"));
    const b = await proxy(req("/products"));
    const cspA = a.headers.get("content-security-policy")!;
    const cspB = b.headers.get("content-security-policy")!;
    expect(cspA).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(cspA).toContain("frame-ancestors 'none'");
    expect(cspA).toContain("object-src 'none'");
    expect(cspA).not.toBe(cspB); // new nonce each time
    expect(a.headers.get("x-request-id")).toBeTruthy();
    expect(a.headers.get("x-request-id")).not.toBe(b.headers.get("x-request-id"));
  });

  it("keeps a caller-supplied request id", async () => {
    const res = await proxy(req("/api/health", { headers: { "x-request-id": "abc-123" } }));
    expect(res.headers.get("x-request-id")).toBe("abc-123");
  });

  it("guards the admin area and the customer area", async () => {
    expect((await proxy(req("/api/admin/orders"))).status).toBe(401);
    const page = await proxy(req("/admin/orders"));
    expect(page.status).toBe(307);
    expect(page.headers.get("location")).toContain("/admin/sign-in");
    const account = await proxy(req("/my-account"));
    expect(account.status).toBe(307);
    expect(account.headers.get("location")).toContain("/?login=1");
    expect((await proxy(req("/admin/sign-in"))).status).toBe(200); // public
  });

  it("accepts a valid admin cookie", async () => {
    const token = await createSession("env-admin", (await signingKeys()).current);
    const res = await proxy(req("/api/admin/orders", { headers: { cookie: `admin_session=${token}` } }));
    expect(res.status).toBe(200);
  });
});

afterAll(closeDb);
