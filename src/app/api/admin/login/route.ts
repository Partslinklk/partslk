import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSession } from "@/lib/admin-auth";
import { signingKeys } from "@/server/admin-keys";
import { ENV_ADMIN_ID, clearFailures, clientIp, isThrottled, logAudit, recordFailure } from "@/server/admin";
import { env } from "@/server/env";
import { handle, HttpError, parseBody } from "@/server/http";

const schema = z.object({ email: z.string().trim().toLowerCase().max(200), password: z.string().max(200) });

/** Constant-time string comparison (hashes first so the lengths always match). */
const safeEqual = (a: string, b: string) =>
  timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());

export const POST = handle(async (request: Request) => {
  const { email, password } = await parseBody(request, schema);
  const ipKey = `ip:${clientIp(request)}`;
  const emailKey = `email:${email}`;
  if ((await isThrottled(ipKey, 20)) || (await isThrottled(emailKey, 5))) {
    throw new HttpError(429, "Too many attempts. Try again in a few minutes.");
  }

  const adminEmail = env().ADMIN_EMAIL?.toLowerCase();
  const adminPassword = env().ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) throw new HttpError(500, "Admin login isn't configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.");

  if (!(safeEqual(email, adminEmail) && safeEqual(password, adminPassword))) {
    await recordFailure(ipKey);
    await recordFailure(emailKey);
    throw new HttpError(401, "Invalid email or password.");
  }

  await clearFailures(emailKey);
  await logAudit({ email: adminEmail }, "admin.login", "admin", null);

  const res = NextResponse.json({ ok: true, admin: { email: adminEmail } });
  res.cookies.set(SESSION_COOKIE, await createSession(ENV_ADMIN_ID, (await signingKeys()).current), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
});
