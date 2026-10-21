import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSession } from "@/lib/admin-auth";

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function POST(request: Request) {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_SECRET } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_SECRET) {
    return NextResponse.json(
      { error: "Admin login isn't configured. Set ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_SECRET in .env.local." },
      { status: 500 }
    );
  }
  const { email, password } = (await request.json().catch(() => ({}))) as { email?: string; password?: string };
  if (!same(String(email ?? "").trim().toLowerCase(), ADMIN_EMAIL.toLowerCase()) || !same(String(password ?? ""), ADMIN_PASSWORD)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSession(ADMIN_EMAIL, ADMIN_SECRET), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
