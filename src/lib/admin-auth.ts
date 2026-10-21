/** Signed-cookie admin session (HMAC-SHA256, Web Crypto so it also runs in proxy). */
export const SESSION_COOKIE = "admin_session";
const MAX_AGE_S = 60 * 60 * 24 * 7;

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sign(payload: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

export async function createSession(email: string, secret: string) {
  const payload = `${encodeURIComponent(email)}.${Date.now() + MAX_AGE_S * 1000}`;
  return `${payload}.${await sign(payload, secret)}`;
}

export async function verifySession(token: string | undefined, secret: string | undefined) {
  if (!token || !secret) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const expected = await sign(payload, secret);
  const given = token.slice(i + 1);
  if (expected.length !== given.length) return false;
  let diff = 0;
  for (let n = 0; n < expected.length; n++) diff |= expected.charCodeAt(n) ^ given.charCodeAt(n);
  const expires = Number(payload.slice(payload.lastIndexOf(".") + 1));
  return diff === 0 && Number.isFinite(expires) && expires > Date.now();
}

export const SESSION_MAX_AGE = MAX_AGE_S;
