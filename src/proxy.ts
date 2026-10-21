import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/admin-auth";

const PUBLIC = ["/admin/sign-in", "/api/admin/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.includes(pathname)) return NextResponse.next();

  const ok = await verifySession(request.cookies.get(SESSION_COOKIE)?.value, process.env.ADMIN_SECRET);
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL("/admin/sign-in", request.url);
  url.searchParams.set("redirect", pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
