import { SESSION_COOKIE, verifySession } from "@/lib/admin-auth";
import { signingKeys } from "./admin-keys";
import { query } from "./db";
import { env } from "./env";
import { HttpError } from "./http";

export type Admin = { id: string; email: string };

/** The one admin lives in env (ADMIN_EMAIL / ADMIN_PASSWORD), not in the database; this is its session id. */
export const ENV_ADMIN_ID = "env-admin";

function readCookie(request: Request, name: string) {
  for (const part of (request.headers.get("cookie") ?? "").split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return undefined;
}

/** Authenticates an admin request from the signed session cookie. The proxy is the first gate; this re-checks the signature. */
export async function requireAdmin(request: Request): Promise<Admin> {
  const { ADMIN_EMAIL } = env();
  const session = await verifySession(readCookie(request, SESSION_COOKIE), (await signingKeys()).all);
  if (!session || session.adminId !== ENV_ADMIN_ID || !ADMIN_EMAIL) throw new HttpError(401, "Unauthorized");
  return { id: ENV_ADMIN_ID, email: ADMIN_EMAIL.toLowerCase() };
}

/** Records an admin action. Never throws: a logging failure must not undo or fail the change itself. */
export async function logAudit(
  admin: Pick<Admin, "email">,
  action: string,
  entity: string,
  entityId?: string | null,
  diff?: unknown,
) {
  try {
    await query(
      "insert into audit_log (admin_email, action, entity, entity_id, diff) values ($1,$2,$3,$4,$5)",
      [admin.email, action, entity, entityId ?? null, diff === undefined ? null : JSON.stringify(diff)],
    );
  } catch (e) {
    console.error("audit log failed", e);
  }
}

// ---- rate limiting lives in ./rate-limit (Postgres); re-exported so route handlers keep one import ----
export { clearFailures, isThrottled, recordFailure } from "./rate-limit";

/**
 * Client IP for rate-limit keys. On Vercel the platform sets x-forwarded-for to the real client address
 * (it overwrites anything the client sent), so the first entry can be trusted there.
 */
export const clientIp = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
