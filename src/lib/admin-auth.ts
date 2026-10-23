/**
 * Signed-cookie admin session (HMAC-SHA256, Web Crypto so it also runs in proxy).
 * Token: `<adminId>.<role>.<expiresMs>.<signature>`. The role in the token is only a hint for
 * the proxy; handlers re-check the admin (active flag, current role) in the database.
 */
export const SESSION_COOKIE = "admin_session";
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours, refreshed by the proxy while in use

export type SessionPayload = { adminId: string; role: string; expires: number };

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sign(payload: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

export async function createSession(adminId: string, role: string, secret: string) {
  const payload = `${adminId}.${role}.${Date.now() + SESSION_MAX_AGE * 1000}`;
  return `${payload}.${await sign(payload, secret)}`;
}

export async function verifySession(token: string | undefined, secret: string | undefined): Promise<SessionPayload | null> {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [adminId, role, exp, given] = parts;
  const expected = await sign(`${adminId}.${role}.${exp}`, secret);
  if (expected.length !== given.length) return null;
  let diff = 0;
  for (let n = 0; n < expected.length; n++) diff |= expected.charCodeAt(n) ^ given.charCodeAt(n);
  const expires = Number(exp);
  if (diff !== 0 || !Number.isFinite(expires) || expires <= Date.now()) return null;
  return { adminId, role, expires };
}
