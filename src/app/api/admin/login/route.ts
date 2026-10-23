import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSession } from "@/lib/admin-auth";
import { clearFailures, clientIp, isThrottled, logAudit, recordFailure } from "@/server/admin";
import { query } from "@/server/db";
import { env } from "@/server/env";
import { handle, HttpError, parseBody } from "@/server/http";
import { fakeVerify, verifyPassword } from "@/server/password";

const schema = z.object({ email: z.string().trim().toLowerCase().max(200), password: z.string().max(200) });

export const POST = handle(async (request: Request) => {
  const secret = env().ADMIN_SECRET;
  if (!secret) throw new HttpError(500, "Admin login isn't configured. Set ADMIN_SECRET in .env.local.");

  const { email, password } = await parseBody(request, schema);
  const ipKey = `ip:${clientIp(request)}`;
  const emailKey = `email:${email}`;
  if ((await isThrottled(ipKey, 20)) || (await isThrottled(emailKey, 5))) {
    throw new HttpError(429, "Too many attempts. Try again in a few minutes.");
  }

  const { rows } = await query<{ id: string; email: string; role: string; password_hash: string; active: boolean }>(
    "select id, email, role, password_hash, active from admin_users where email = $1",
    [email],
  );
  const admin = rows[0];
  const ok = admin ? await verifyPassword(password, admin.password_hash) : (await fakeVerify(password), false);
  if (!admin || !ok || !admin.active) {
    await recordFailure(ipKey);
    await recordFailure(emailKey);
    throw new HttpError(401, "Invalid email or password.");
  }

  await clearFailures(emailKey);
  await query("update admin_users set last_login_at = now() where id = $1", [admin.id]);
  await logAudit(admin, "admin.login", "admin", admin.id);

  const res = NextResponse.json({ ok: true, admin: { email: admin.email, role: admin.role } });
  res.cookies.set(SESSION_COOKIE, await createSession(admin.id, admin.role, secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
});
