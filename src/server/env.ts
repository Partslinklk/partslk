import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (Supabase Postgres connection string)"),
  MIGRATION_DATABASE_URL: z.string().optional(),
  /** PEM of the database server's CA (Supabase: Project Settings -> Database -> SSL). When set, the TLS certificate is verified. */
  DATABASE_CA_CERT: z.string().optional(),
  /** Tests only: run every query inside this Postgres schema (see vitest.setup.ts). */
  PG_SCHEMA: z.string().regex(/^[a-z_][a-z0-9_]*$/).optional(),
  PG_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
  SUPABASE_URL: z.url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  /** Optional publishable key; customer auth calls fall back to the service-role key (server-side only) without it. */
  SUPABASE_ANON_KEY: z.string().min(20).optional(),
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
  /** Currency the shop prices in (the storefront shows LKR). */
  STORE_CURRENCY: z.string().length(3).default("LKR"),
  /** PayHere (Sri Lanka): merchant id + secret from the PayHere merchant portal (Settings > Domains & Credentials). */
  PAYHERE_MERCHANT_ID: z.string().min(3).optional(),
  PAYHERE_MERCHANT_SECRET: z.string().min(8).optional(),
  PAYHERE_ENV: z.enum(["sandbox", "live"]).default("sandbox"),
  STRIPE_SECRET_KEY: z.string().min(8).optional(),
  /** Publishable key (pk_...): safe for the browser; with it the card boxes are shown on our own checkout page. */
  STRIPE_PUBLISHABLE_KEY: z.string().min(8).optional(),
  /** Override the Stripe API address (tests only), e.g. http://localhost:4592 */
  STRIPE_API_URL: z.url().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(8).optional(),
  /** Three-letter ISO code, lower-case (the storefront shows LKR). */
  STRIPE_CURRENCY: z.string().length(3).default("lkr"),
  MAILTRAP_API_TOKEN: z.string().min(8).optional(),
  /** Live sending API; the Sandbox is used instead when MAILTRAP_INBOX_ID is set. */
  MAILTRAP_API_URL: z.url().default("https://send.api.mailtrap.io"),
  MAILTRAP_INBOX_ID: z.string().regex(/^\d+$/, "MAILTRAP_INBOX_ID must be the numeric inbox id").optional(),
  /** Sender address - must be on a domain verified in Mailtrap (partslinkstore.lk). */
  EMAIL_FROM: z.email().optional(),
  EMAIL_FROM_NAME: z.string().min(1).max(100).default("Partslk"),
  /** Where contact-form messages are sent. */
  STAFF_NOTIFY_EMAIL: z.email().optional(),
  /** Signs unsubscribe links. */
  EMAIL_TOKEN_SECRET: z.string().min(16).optional(),
  SUPABASE_STORAGE_BUCKET: z.string().min(3).default("product-images"),
  /** The single admin login (kept in env, no database table). */
  ADMIN_EMAIL: z.email().optional(),
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD must be at least 8 characters").optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/**
 * Validated server environment. Parsed lazily on first use (not at import time) so
 * `next build` doesn't need secrets, but the first request fails loudly and clearly
 * when something is missing.
 */
export function env(): Env {
  if (cached) return cached;
  // A blank value (e.g. STRIPE_SECRET_KEY= copied from .env.example) means "not set".
  const parsed = schema.safeParse(Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== "")));
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${lines}`);
  }
  if (parsed.data.NODE_ENV === "production") {
    // A production deploy that is missing any of these would fail in confusing ways later (broken emails, no admin login...).
    const d = parsed.data;
    const missing: string[] = [];
    if (!d.EMAIL_TOKEN_SECRET) missing.push("EMAIL_TOKEN_SECRET");
    if (!d.ADMIN_EMAIL) missing.push("ADMIN_EMAIL");
    if (!d.ADMIN_PASSWORD) missing.push("ADMIN_PASSWORD");
    if (!d.SUPABASE_URL) missing.push("SUPABASE_URL");
    if (!d.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!d.NEXT_PUBLIC_SITE_URL) missing.push("NEXT_PUBLIC_SITE_URL");
    else if (!d.NEXT_PUBLIC_SITE_URL.startsWith("https://")) missing.push("NEXT_PUBLIC_SITE_URL (must be https://)");
    if (missing.length) throw new Error(`Invalid environment configuration:\n  - required in production: ${missing.join(", ")}`);
  }
  return (cached = parsed.data);
}
