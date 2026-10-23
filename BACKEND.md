# Partslk — Backend Design & Implementation Plan

Status of this document: **complete**. All phases 0–9 are done (payments run against a simulated Stripe until real keys are added). See DEPLOY.md for the runbook.
Stack: Next.js 16 (App Router, route handlers) · Supabase Postgres (via `pg`) · Supabase Auth / Storage · Stripe · Mailtrap.

> Next.js 16 has breaking changes vs. older versions. Before writing any route handler, proxy, caching or `use cache` code, read the matching guide in `node_modules/next/dist/docs/` (see `AGENTS.md`).

---

## 1. Where we are today

| Area | Current state | Gap |
|---|---|---|
| Catalogue (products, categories, brands, makes, deals, featured, popular, testimonials) | In Postgres. `src/lib/db.ts` exposes `readCollection` / `writeCollection` (whole-collection replace) | Admin saves rewrite entire tables; no per-row API, no validation, no pagination/search |
| Orders | `orders` + `order_items`; `POST /api/orders` re-prices from the catalogue and inserts | No stock check/decrement, no payment, no emails, no customer link, no order lookup |
| Customer accounts | `AuthModal` / `AccountPage` are front-end only | No real sign-up, login, sessions, addresses, order history |
| Admin auth | Single `ADMIN_EMAIL` / `ADMIN_PASSWORD` in env, HMAC cookie (`admin-auth.ts`, `proxy.ts`) | One shared login, plaintext password in env, no roles, no audit trail |
| Images | `/api/admin/upload` writes to `public/uploads` | Won't work on Vercel (read-only FS) |
| Forms | Contact form, newsletter popup, search: UI only | Nothing persisted or sent |
| Payments | Checkout offers "bank transfer" / "check" labels | No payment processor |
| Observability / security | None | No rate limiting, logging, validation layer, backups policy |

---

## 2. Target architecture

```
Browser ──► Next.js (App Router)
              ├─ Server Components  ──► src/server/services/*  ──► Postgres (pg pool, server only)
              ├─ Route handlers  /api/**  (zod-validated, thin) ─┘
              ├─ proxy.ts  (admin + account route protection)
              └─ Webhooks  /api/webhooks/stripe
Supabase:  Postgres · Auth (customers) · Storage (product images)
External:  Stripe (payments) · Mailtrap (email)
```

Principles:

1. **Server-only data access.** The browser never talks to Supabase tables. RLS stays enabled with *no* policies on every table; only the server (direct `pg` connection) reads/writes. The service-role key and `DATABASE_URL` never get a `NEXT_PUBLIC_` prefix.
2. **Layers.** `route handler → zod validation → service → repository (SQL)`. Handlers stay thin; business rules (pricing, stock, status transitions) live in services so they can be unit-tested.
3. **Never trust the client for money.** Prices, shipping cost, discounts and totals are recomputed on the server (already true for item prices; extend to shipping/coupons).
4. **Atomic writes.** Anything that touches several tables (order + items + stock) runs in one transaction.
5. **Migrations are versioned SQL**, not edits to one schema file (see Phase 1).

Suggested folder layout:

```
db/migrations/0001_init.sql ...        # ordered, applied by scripts/migrate.mjs
src/server/
  db.ts            # pool + tx() helper
  repos/           # products.ts, orders.ts, customers.ts ...  (SQL only)
  services/        # checkout.ts, pricing.ts, inventory.ts, auth.ts ...
  validation/      # zod schemas shared by handlers
  email/           # templates + sender
  http.ts          # json(), error mapper, rate limit, requireAdmin(), requireCustomer()
src/app/api/...    # route handlers
```

---

## 3. Data model

### 3.1 Existing tables (done)
`categories`, `category_links`, `brands`, `makes`, `products`, `product_categories`, `deals`, `featured_products`, `popular_products`, `testimonials`, `orders`, `order_items`. See `db/schema.sql`.

### 3.2 Changes to existing tables

```sql
-- products: stable slug, soft delete, SKU, search
alter table products
  add column if not exists sku text unique,
  add column if not exists deleted_at timestamptz,
  add column if not exists search tsvector
    generated always as (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(description,''))) stored;
create index if not exists products_search_idx on products using gin (search);

-- orders: link to customer, payment + fulfilment fields, public lookup token
alter table orders
  add column if not exists customer_id uuid references customers(id) on delete set null,
  add column if not exists payment_status text not null default 'unpaid'
      check (payment_status in ('unpaid','paid','failed','refunded')),
  add column if not exists payment_ref text,            -- Stripe PaymentIntent / session id
  add column if not exists discount numeric(12,2) not null default 0,
  add column if not exists coupon_code text,
  add column if not exists tracking_number text,
  add column if not exists lookup_token text not null default encode(gen_random_bytes(16),'hex');
create index if not exists orders_customer_idx on orders (customer_id);
```

### 3.3 New tables

```sql
-- Customers: id matches Supabase Auth user id (auth.users.id)
create table customers (
  id          uuid primary key,
  email       text not null unique,
  first_name  text not null default '',
  last_name   text not null default '',
  phone       text not null default '',
  created_at  timestamptz not null default now()
);

create table customer_addresses (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  label       text not null default 'Home',
  country text not null, address text not null, city text not null, postcode text not null,
  is_default  boolean not null default false
);

-- Admin users (replaces ADMIN_EMAIL/ADMIN_PASSWORD)
create table admin_users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  password_hash text not null,                       -- argon2id or bcrypt
  role          text not null default 'staff' check (role in ('owner','manager','staff')),
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table audit_log (
  id         bigserial primary key,
  admin_id   uuid references admin_users(id) on delete set null,
  action     text not null,                          -- 'product.update', 'order.status' ...
  entity     text not null, entity_id text,
  diff       jsonb,
  created_at timestamptz not null default now()
);

create table product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id text not null references products(id) on delete cascade,
  url        text not null,
  position   integer not null default 0
);

create table reviews (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null references products(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  rating      smallint not null check (rating between 1 and 5),
  title text not null default '', body text not null default '',
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at  timestamptz not null default now()
);

create table wishlist_items (
  customer_id uuid not null references customers(id) on delete cascade,
  product_id  text not null references products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (customer_id, product_id)
);

create table shipping_methods (
  id text primary key, label text not null,
  cost numeric(12,2) not null check (cost >= 0),
  free_over numeric(12,2),                           -- free shipping threshold
  countries text[] not null default '{}',            -- empty = everywhere
  active boolean not null default true, position integer not null default 0
);

create table coupons (
  code text primary key,
  kind text not null check (kind in ('percent','fixed')),
  value numeric(12,2) not null check (value > 0),
  min_subtotal numeric(12,2) not null default 0,
  max_uses integer, used integer not null default 0,
  starts_at timestamptz, expires_at timestamptz,
  active boolean not null default true
);

create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null, email text not null, subject text not null default '', message text not null,
  status text not null default 'new' check (status in ('new','read','replied')),
  created_at timestamptz not null default now()
);

create table newsletter_subscribers (
  email text primary key, source text not null default 'popup',
  unsubscribed_at timestamptz, created_at timestamptz not null default now()
);

create table order_events (                          -- status history + payment events
  id bigserial primary key,
  order_id text not null references orders(id) on delete cascade,
  kind text not null, detail jsonb, created_at timestamptz not null default now()
);

create table stock_movements (                       -- optional but recommended inventory ledger
  id bigserial primary key,
  product_id text not null references products(id),
  delta integer not null, reason text not null,      -- 'order','cancel','restock','adjust'
  order_id text references orders(id), created_at timestamptz not null default now()
);
```

Enable RLS on every new table (no policies), exactly like the existing ones.

---

## 4. API surface

All JSON. Errors: `{ "error": "message", "fields"?: { "email": "…" } }` with correct status codes (400 validation, 401, 403, 404, 409 conflict, 429 rate limit).

### 4.1 Public storefront
| Method & path | Purpose |
|---|---|
| `GET /api/products?q=&category=&brand=&color=&min=&max=&sort=&page=&limit=` | Search / filter / paginate (uses `search` tsvector, only `published` & not deleted) |
| `GET /api/products/:id` | Product detail + approved reviews + related |
| `GET /api/categories`, `/api/brands`, `/api/makes` | Lookups |
| `GET /api/shipping-methods?country=` | Options with computed cost for a cart |
| `POST /api/coupons/validate` | `{ code, subtotal }` → discount preview |
| `POST /api/checkout` | Validate cart → price → reserve stock → create order + Stripe session → `{ orderId, paymentUrl }` |
| `GET /api/orders/:id?token=` | Guest order lookup (uses `lookup_token`) |
| `POST /api/contact` | Store message + email staff (rate-limited, honeypot) |
| `POST /api/newsletter` | Upsert subscriber |
| `GET /api/geo`, `/api/countries` | Already exist |

(The homepage/category pages can keep calling `getStoreData()` directly from Server Components — no HTTP hop needed.)

### 4.2 Customer (requires Supabase session)
| Method & path | Purpose |
|---|---|
| `POST /api/auth/*` | Thin wrappers over Supabase Auth: sign-up, login, logout, forgot/reset password |
| `GET/PATCH /api/me` | Profile |
| `GET/POST/PATCH/DELETE /api/me/addresses` | Address book |
| `GET /api/me/orders`, `GET /api/me/orders/:id` | Order history |
| `GET/PUT/DELETE /api/me/wishlist` | Wishlist |
| `POST /api/products/:id/reviews` | Submit review (must have purchased; goes to `pending`) |

### 4.3 Admin (requires admin session; role-checked)
Replace the whole-collection `PUT /api/admin/data/:collection` with per-row REST (keep the old route only until the admin UI is migrated):

| Method & path | Purpose |
|---|---|
| `POST /api/admin/login`, `POST /api/admin/logout` | Existing, now backed by `admin_users` |
| `GET/POST /api/admin/products`, `GET/PUT/DELETE /api/admin/products/:id` | CRUD (PUT = full replace of fields), soft delete, stock adjust |
| same shape for `categories`, `brands`, `makes`, `deals`, `featured`, `popular`, `testimonials` | CRUD + `PUT …/reorder` (`{ ids: [...] }`) |
| `GET /api/admin/orders?status=&q=&page=`, `GET/PATCH /api/admin/orders/:id` | List, detail, status/tracking update (validates allowed transitions), refund |
| `GET /api/admin/customers` | Customers + lifetime spend |
| `GET/PATCH /api/admin/reviews`, `GET/PATCH /api/admin/messages`, `GET /api/admin/subscribers` | Moderation / inbox |
| `GET/POST/PATCH /api/admin/coupons`, `…/shipping-methods` | Commerce settings |
| `GET /api/admin/dashboard` | Revenue, orders by status, low stock, top products (SQL aggregates, not client-side math) |
| `POST /api/admin/upload` | Image upload → Supabase Storage |
| `GET /api/admin/audit` | Audit trail (owner only) |

### 4.4 Webhooks
`POST /api/webhooks/stripe` — verify signature; on `checkout.session.completed` mark order `paid`, set `processing`, send confirmation email; on `payment_intent.payment_failed` / `checkout.session.expired` release reserved stock. Must be idempotent (store processed event ids in `order_events`).

---

## 5. Step-by-step implementation

Do the phases in order; each ends in a working, testable state. Commit after every phase.

### Phase 0 — Database foundation ✅ (done)
Schema, seed, `pg` data layer, `POST /api/orders` on Postgres, `npm run db:migrate`.

### Phase 1 — Foundations ✅ (done)
1. **Versioned migrations.** Move `db/schema.sql` → `db/migrations/0001_init.sql`. Add a `schema_migrations(name, applied_at)` table; make `scripts/migrate.mjs` run each unapplied file in order inside a transaction. Seed stays a separate `--seed` step.
2. **Env validation.** Create `src/server/env.ts` (zod) that fails fast if `DATABASE_URL`, `ADMIN_SECRET`, etc. are missing. Document every variable in `.env.example` (no real values).
3. **DB helper.** `src/server/db.ts`: shared pool + `tx(fn)` helper (begin/commit/rollback). Re-point `src/lib/db.ts` to it.
4. **HTTP helpers.** `src/server/http.ts`: `json()`, `parseBody(schema)`, central error mapper (zod → 400, pg `23505` → 409, unknown → 500 with a request id, no stack in prod).
5. **Pooler for serverless.** In production use the **transaction pooler** (port 6543) for `DATABASE_URL` and keep the session pooler (5432) for migrations (`MIGRATION_DATABASE_URL`). Keep pool `max` low (3–5).

### Phase 2 — Catalogue API & admin per-row CRUD ✅ (done)
1. Write repos + services for products, categories, brands, makes, deals, featured, popular, testimonials with **single-row** `insert/update/delete` (no more delete-missing-ids).
2. Add zod schemas (price ≥ 0, rating 0–5, unique id/slug, valid highlight/size…).
3. Add the public `GET /api/products` (search, filters, pagination, sort) using the `search` tsvector and the indexes in §3.2.
4. Add `/api/admin/<resource>` routes (§4.3). Keep `/api/admin/data/:collection` working while you update `src/admin/features/store/*` pages (`use-collection.ts`) to call the new endpoints, then delete it.
5. Add `deleted_at` soft delete for products (orders reference product ids by value, so history stays intact).
6. Revalidate cached storefront pages after each admin write (`revalidateTag` / `revalidatePath` — check the Next 16 caching docs for the current API).

### Phase 3 — Images in Supabase Storage ✅ (done; multi-image product galleries added later via `product_images`)
1. Create a public bucket `product-images` in Supabase (read-public, write via service role only).
2. Rewrite `/api/admin/upload`: validate type/size (already done), sniff magic bytes, upload with the server-side Supabase client (`@supabase/supabase-js`, service-role key), return the public URL.
3. Add the Supabase hostname to `images.remotePatterns` in `next.config.ts`.
4. One-off script: upload everything in `public/uploads` and rewrite stored URLs in `products` etc.
5. Optional: populate `product_images` for galleries.

### Phase 4 — Admin authentication ✅ (done; passwords use scrypt instead of argon2/bcrypt — built into Node, no native build)
1. Create `admin_users`. Add `scripts/create-admin.mjs <email>` that prompts for a password and stores an **argon2id** (or bcrypt) hash. Seed the first `owner`.
2. `POST /api/admin/login`: look up user, verify hash in constant time, add rate limiting + generic error, then issue the existing HMAC cookie containing `adminId` and `role` (and a short expiry; refresh on activity).
3. `src/server/http.ts`: `requireAdmin(req, minRole)` used by every admin handler (defence in depth — `proxy.ts` stays as the first gate).
4. Write to `audit_log` on every admin mutation (who, what, before/after).
5. Remove `ADMIN_EMAIL` / `ADMIN_PASSWORD` from env once migrated; keep `ADMIN_SECRET` (signing key).

### Phase 5 — Customer accounts ✅ (done; auth is server-mediated — the browser never talks to Supabase, so no `NEXT_PUBLIC_SUPABASE_*` keys are needed)
Recommendation: **Supabase Auth** (we already have the project) — it handles password hashing, email verification, reset flows and OAuth.
1. Enable email auth in the Supabase dashboard; configure the site URL and email templates (or custom SMTP via Mailtrap).
2. Install `@supabase/supabase-js` and `@supabase/ssr`; create server/browser clients using the **publishable (anon) key** (add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — these two are safe to expose; the service-role key is not).
3. Wire `AuthModal` to sign-up / login / forgot-password. Sessions live in httpOnly cookies refreshed by `proxy.ts`.
4. On first login create the `customers` row (Postgres trigger on `auth.users` insert, or lazily in `requireCustomer()`).
5. Build `/api/me`, `/api/me/addresses`, `/api/me/orders`, wishlist; connect `AccountPage` tabs (orders, addresses, profile) to them.
6. Link orders: `checkout` sets `orders.customer_id` when a session exists; guests keep working via `lookup_token`.
7. Protect `/my-account` in `proxy.ts`.

### Phase 6 — Checkout, stock & payments ✅ (done; Stripe session creation not exercised against real Stripe — no keys yet)
1. **Pricing service** `computePricing(items, shippingMethodId, couponCode, country)` → `{ lines, subtotal, shipping, discount, total }`. All server-side; the client sends only `{ id, qty }`.
2. **Inventory.** In one transaction per order: `update products set stock = stock - $qty where id = $id and stock >= $qty` for every line; if any row updates 0 rows → rollback with a 409 "out of stock". Write `stock_movements`. On cancel/expiry/refund, add stock back (also a movement).
3. **Orders.** Create the order as `pending` / `unpaid`, write `order_events`. Use a DB sequence (e.g. `order_number_seq`) for human-friendly ids instead of timestamp suffixes.
4. **Stripe.** Install `stripe`; `POST /api/checkout` creates a Checkout Session (line items from the *server-computed* lines, `metadata.orderId`), returns the URL; the success page reads the order via `lookup_token`.
5. **Webhook** `/api/webhooks/stripe` per §4.4 (signature verification with the raw body, idempotency, release stock on failure/expiry — also add a scheduled job that cancels `unpaid` orders older than 30 min).
6. Keep "bank transfer / check" as offline methods: order stays `unpaid`; admin marks it paid manually (audit-logged).
7. Coupons: validate window, usage count, min subtotal; increment `used` inside the order transaction.
8. Replace the hard-coded shipping options in `CheckoutPage.tsx` with `GET /api/shipping-methods`.

### Phase 7 — Email & forms ✅ (done; plain `fetch` to the Mailtrap sending API (domain partslinkstore.lk) instead of an SDK)
1. Mailtrap sending API via `fetch`; `src/server/email/` with React or plain-HTML templates.
2. Send: order confirmation, payment received, shipped (with tracking), welcome, password reset (if using custom SMTP), contact-form copy to staff.
3. `POST /api/contact` and `POST /api/newsletter` persist to their tables first, *then* email; add a honeypot field + per-IP rate limit.
4. Wire `ContactPage` and `NewsletterPopup` to those endpoints; add Inbox / Subscribers pages to the admin.

### Phase 8 — Reviews, wishlist, dashboard ✅ (done)
1. Reviews: only customers with a `delivered` order containing the product can post; default `pending`; admin approves; a trigger or service recomputes `products.rating` / `review_count` from approved reviews.
2. Wishlist endpoints + heart button persisted for logged-in users (local fallback for guests).
3. Dashboard endpoint: revenue by day, orders by status, top products, low-stock list, new customers — as SQL aggregates; point `src/admin/features/dashboard` at it.

### Phase 9 — Hardening, testing, deploy ✅ (done; see DEPLOY.md. Not done: Sentry (needs an account), real Stripe run, secret rotation (dashboards))
1. **Rate limiting** on login, checkout, contact, newsletter, coupon validation (Upstash Redis via Vercel Marketplace, or a Postgres-backed counter for low volume).
2. **Security headers** (CSP, HSTS, X-Content-Type-Options) in `next.config.ts`; strict CORS (same-origin only); CSRF is covered by `SameSite=Lax` cookies + JSON-only bodies — still verify `Origin` on mutating admin routes.
3. **Tests.** Vitest for services (pricing, inventory race, coupon rules, status transitions) against a throwaway Supabase branch or a local Postgres; Playwright smoke test for browse → add to cart → checkout (Stripe test mode).
4. **Observability.** Structured logs with a request id; error tracking (Sentry or Vercel); alert on 5xx and webhook failures.
5. **Backups.** Confirm Supabase backup plan (daily on Pro; enable PITR for production). Keep migrations in git — they are the source of truth.
6. **Deploy.** Set every env var in Vercel (Production + Preview), use separate Supabase projects for staging/production, run migrations as a CI step before promoting, register the Stripe webhook URL.
7. **Rotate secrets.** The DB password and service-role key were pasted into a chat/markdown file — rotate both before launch and delete `Required credentials.md`.

---

## 6. Environment variables

| Variable | Used for | Exposed to browser? |
|---|---|---|
| `DATABASE_URL` | Runtime Postgres (transaction pooler in prod) | No |
| `MIGRATION_DATABASE_URL` | Migrations (session pooler / direct) | No |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Storage uploads, admin tasks | No |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Customer auth client | Yes (publishable) |
| `ADMIN_SECRET` | Signs admin session cookies | No |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Payments (publishable key enables the inline card form) | No |
| `EMAIL_PROVIDER` (`mailtrap`), `MAILTRAP_API_TOKEN`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `STAFF_NOTIFY_EMAIL`, optional `MAILTRAP_INBOX_ID` (sandbox) | Email | No |
| `NEXT_PUBLIC_SITE_URL` | Redirect URLs, emails | Yes |

Commit a `.env.example` listing these names with empty values. `.env*` is already git-ignored.

---

## 7. Cross-cutting rules

- **Validation:** every handler parses input with zod; never spread `req.json()` into SQL. Use parameterised queries only.
- **Money:** `numeric(12,2)` in DB, parsed to numbers at the edge. For Stripe convert to integer cents with `Math.round(x * 100)`.
- **IDs:** keep human-readable slugs for catalogue rows (URLs already use them); UUIDs for new user-owned rows.
- **Order status machine:** `pending → processing → shipped → delivered`; `pending|processing → cancelled`; refunds from `paid` only. Enforce in the service and write an `order_events` row for every change.
- **Authorisation:** customers can only touch rows where `customer_id = session.user.id`; admin routes check role (`owner` > `manager` > `staff`).
- **Privacy:** orders store customer PII — never log it, exclude it from error reports, and provide an admin "anonymise customer" action for deletion requests.
- **Idempotency:** webhooks and checkout creation must be safe to retry.

---

## 8. Suggested order of work (summary checklist)

- [x] 0. Postgres schema, seed, data layer
- [x] 1. Versioned migrations, env validation, tx/http helpers
- [x] 2. Per-row catalogue CRUD + public product search API
- [x] 3. Supabase Storage for images
- [x] 4. Admin users table, hashed passwords, roles, audit log
- [x] 5. Customer accounts (Supabase Auth), addresses, order history
- [x] 6. Checkout: server pricing, atomic stock, Stripe, webhook, coupons, shipping
- [x] 7. Transactional email, contact + newsletter persistence
- [x] 8. Reviews, wishlist, real dashboard analytics
- [x] 9. Rate limits, headers, tests, monitoring, backups, deploy, rotate secrets

---

## 9. Later additions
- **Product galleries** (`product_images`, migration 0009): any number of photos per product; the first is the cover (`products.image`).
- **Homepage lists link to products** (migration 0010): `featured_products` and `popular_products` store only a product id + order; `deals` stores a product id, a deal price and an end time. Name, image, rating, regular price and button label are read live from `products`, so editing a product updates the homepage. A running deal also lowers that product's price at checkout (`src/server/pricing.ts`).
- **PayPal (removed):** the PayPal integration code was removed; migration 0011 (`payments`, `paypal_events` tables) stays applied and is unused, ready for the next gateway (PayHere, not built yet).
