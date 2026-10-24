/**
 * Signed-cookie admin session (HMAC-SHA256, Web Crypto so it also runs in proxy).
 * Token: `<adminId>.<expiresMs>.<signature>`.
 */
export const SESSION_COOKIE = "admin_session";
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours, refreshed by the proxy while in use

export type SessionPayload = { adminId: string; expires: number };

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sign(payload: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

export async function createSession(adminId: string, secret: string) {
  const payload = `${adminId}.${Date.now() + SESSION_MAX_AGE * 1000}`;
  return `${payload}.${await sign(payload, secret)}`;
}

/** `secrets` may hold several keys (current + not-yet-expired old ones); the token is valid if any one signed it. */
export async function verifySession(token: string | undefined, secrets: string | string[] | undefined): Promise<SessionPayload | null> {
  const keys = ([] as (string | undefined)[]).concat(secrets).filter((k): k is string => !!k);
  if (!token || !keys.length) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [adminId, exp, given] = parts;
  const expires = Number(exp);
  if (!Number.isFinite(expires) || expires <= Date.now()) return null;
  for (const secret of keys) {
    const expected = await sign(`${adminId}.${exp}`, secret);
    if (expected.length !== given.length) continue;
    let diff = 0;
    for (let n = 0; n < expected.length; n++) diff |= expected.charCodeAt(n) ^ given.charCodeAt(n);
    if (diff === 0) return { adminId, expires };
  }
  return null;
}
