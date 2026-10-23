import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSession, verifySession } from "@/lib/admin-auth";

const PUBLIC = ["/admin/sign-in", "/api/admin/login"];
const CUSTOMER_REFRESH_COOKIE = "cust_refresh"; // keep in sync with src/server/customer-auth.ts
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
// Called by Stripe / Vercel Cron (no browser Origin) and authenticated by signature / bearer secret instead.
const NO_ORIGIN_CHECK = ["/api/webhooks/", "/api/cron/"];

/** Content-Security-Policy with a per-request nonce (scripts need it; 'strict-dynamic' lets Next's own chunks load). */
function buildCsp(nonce: string) {
  const dev = process.env.NODE_ENV !== "production";
  const supabase = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).origin : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Inline style="" attributes are used throughout the storefront, so styles allow 'unsafe-inline'.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https://images.unsplash.com https://*.stripe.com https://*.payhere.lk ${supabase}`.trim(),
    "font-src 'self' data:",
    `connect-src 'self' https://*.payhere.lk https://api.stripe.com https://*.stripe.com https://*.stripe.network${dev ? " ws: wss:" : ""}`,
    "frame-src https://maps.google.com https://www.google.com https://*.payhere.lk https://js.stripe.com https://hooks.stripe.com https://*.stripe.network",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();

  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  /** Passes the request on with the request id (and, for pages, the CSP nonce) attached. */
  const next = () => {
    const headers = new Headers(request.headers);
    headers.set("x-request-id", requestId);
    if (!isApi) {
      headers.set("x-nonce", nonce);
      headers.set("content-security-policy", csp);
    }
    const res = NextResponse.next({ request: { headers } });
    return res;
  };
  const finish = (res: NextResponse) => {
    res.headers.set("x-request-id", requestId);
    if (!isApi) res.headers.set("content-security-policy", csp);
    return res;
  };

  // CSRF defence in depth (cookies are already SameSite=Lax): a state-changing browser request must come from our own site.
  if (isApi && !SAFE_METHODS.has(request.method) && !NO_ORIGIN_CHECK.some((p) => pathname.startsWith(p))) {
    const origin = request.headers.get("origin");
    if (origin && origin !== "null") {
      let ok = false;
      try {
        ok = new URL(origin).host === request.nextUrl.host;
      } catch {
        ok = false;
      }
      if (!ok) return finish(NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 }));
    } else if (origin === "null") {
      return finish(NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 }));
    }
  }

  // Customer area: a cheap cookie check here; every /api/me call re-validates the session with Supabase.
  if (pathname === "/my-account" || pathname.startsWith("/my-account/")) {
    if (request.cookies.get(CUSTOMER_REFRESH_COOKIE)?.value) return finish(next());
    return finish(NextResponse.redirect(new URL("/?login=1", request.url)));
  }

  const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (!isAdminArea || PUBLIC.includes(pathname)) return finish(next());

  const secret = process.env.ADMIN_SECRET;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, secret);
  if (session && secret) {
    const res = next();
    // Sliding session: re-issue once less than half the lifetime is left.
    if (session.expires - Date.now() < (SESSION_MAX_AGE * 1000) / 2) {
      res.cookies.set(SESSION_COOKIE, await createSession(session.adminId, session.role, secret), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_MAX_AGE,
      });
    }
    return finish(res);
  }

  if (isApi) return finish(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  const url = new URL("/admin/sign-in", request.url);
  url.searchParams.set("redirect", pathname + request.nextUrl.search);
  return finish(NextResponse.redirect(url));
}

export const config = {
  // Everything except static files, so every page gets the CSP nonce and every API call a request id.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?|txt|xml)$).*)"],
};
