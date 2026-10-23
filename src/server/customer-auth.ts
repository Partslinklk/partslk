import { cookies } from "next/headers";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { query } from "./db";
import { env } from "./env";
import { HttpError } from "./http";
import { sendWelcome } from "./email";

/**
 * Customer auth = Supabase Auth (password hashing, email verification, reset mails) driven
 * entirely from the server. The browser never talks to Supabase: it calls /api/auth/*, and the
 * session lives in httpOnly cookies set here.
 */
export const ACCESS_COOKIE = "cust_access";
export const REFRESH_COOKIE = "cust_refresh";
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

export type Customer = { id: string; email: string; firstName: string; lastName: string; phone: string };

/** A fresh client per call: sessions must never be shared between requests. */
export function authClient(): SupabaseClient {
  const e = env();
  const key = e.SUPABASE_ANON_KEY ?? e.SUPABASE_SERVICE_ROLE_KEY;
  if (!e.SUPABASE_URL || !key) throw new HttpError(503, "Customer accounts aren't configured (SUPABASE_URL / key).");
  return createClient(e.SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function adminClient(): SupabaseClient {
  const e = env();
  if (!e.SUPABASE_URL || !e.SUPABASE_SERVICE_ROLE_KEY) {
    throw new HttpError(503, "Customer accounts aren't configured (SUPABASE_SERVICE_ROLE_KEY).");
  }
  return createClient(e.SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export { siteUrl } from "./site";

type Tokens = { access_token: string; refresh_token: string; expires_in?: number };

const cookieOpts = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

export async function setSession(t: Tokens) {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, t.access_token, cookieOpts(t.expires_in ?? 3600));
  jar.set(REFRESH_COOKIE, t.refresh_token, cookieOpts(REFRESH_MAX_AGE));
}

export async function clearSession() {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  jar.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
}

// Short-lived cache so one page load (several API calls) doesn't hit Supabase for every request.
const g = globalThis as unknown as { tokenCache?: Map<string, { user: User; until: number }> };
const tokenCache = (g.tokenCache ??= new Map());

/** `cache: false` forces a live check with Supabase — use it for sensitive operations (reset, session hand-off). */
export async function userFromAccessToken(token: string, { cache = true } = {}): Promise<User | null> {
  const hit = cache ? tokenCache.get(token) : undefined;
  if (hit && hit.until > Date.now()) return hit.user;
  const { data, error } = await authClient().auth.getUser(token);
  if (error || !data.user) return null;
  if (cache) {
    if (tokenCache.size > 500) tokenCache.clear();
    tokenCache.set(token, { user: data.user, until: Date.now() + 20_000 });
  }
  return data.user;
}

/** Creates the customers row on first sight of an auth user (names come from sign-up metadata). */
async function ensureCustomer(user: User): Promise<Customer> {
  const meta = (user.user_metadata ?? {}) as { first_name?: string; last_name?: string };
  const { rows } = await query<{ id: string; email: string; first_name: string; last_name: string; phone: string; created: boolean }>(
    `insert into customers (id, email, first_name, last_name) values ($1, $2, $3, $4)
     on conflict (id) do update set email = excluded.email
     returning id, email, first_name, last_name, phone, (xmax = 0) as created`,
    [user.id, user.email ?? "", String(meta.first_name ?? "").slice(0, 100), String(meta.last_name ?? "").slice(0, 100)],
  );
  const r = rows[0];
  if (r.created) await sendWelcome(r.email, r.first_name); // first time we see this verified account
  return { id: r.id, email: r.email, firstName: r.first_name, lastName: r.last_name, phone: r.phone };
}

/** The signed-in customer (refreshing an expired access token when possible), or null. */
export async function getCustomer(): Promise<Customer | null> {
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  const refresh = jar.get(REFRESH_COOKIE)?.value;

  let user = access ? await userFromAccessToken(access) : null;
  if (!user && refresh) {
    const { data, error } = await authClient().auth.refreshSession({ refresh_token: refresh });
    if (error || !data.session || !data.user) {
      await clearSession().catch(() => undefined);
      return null;
    }
    await setSession(data.session).catch(() => undefined); // read-only contexts (server components) can't set cookies
    user = data.user;
  }
  return user ? ensureCustomer(user) : null;
}

export async function requireCustomer(): Promise<Customer> {
  const customer = await getCustomer();
  if (!customer) throw new HttpError(401, "Please sign in.");
  return customer;
}

/** Expiry (seconds from now) read from a JWT, only used to size the cookie; the token is validated separately. */
export function tokenTtl(jwt: string): number {
  try {
    const exp = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString()).exp as number;
    return Math.max(60, exp - Math.floor(Date.now() / 1000));
  } catch {
    return 3600;
  }
}
