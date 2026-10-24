# Partslk — Deploy, operate, recover

Audience: whoever deploys and runs the store (you, or a developer you hire). Everything here was checked against this codebase; steps that need a dashboard login can't be automated and are marked **(you)**.

---

## 1. Before the first deploy

### 1.1 Two environments, two databases
Use **separate Supabase projects** for production and staging/preview. Never give Preview deployments the production `DATABASE_URL`: a preview build runs your code against whatever database it is given.

| | Production | Preview / staging |
|---|---|---|
| Supabase project | live store | a second, empty project |
| Stripe keys | live keys | test keys |
| Mailtrap | sending domain `partslinkstore.lk` | same token, or a Sandbox inbox (`MAILTRAP_INBOX_ID`) so no real mail goes out |

### 1.2 Environment variables (Vercel → Project → Settings → Environment Variables)
Set each one for the right environment. The app refuses to start in production if a required one is missing (`src/server/env.ts`), and tells you which.

| Variable | Required in prod | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Supabase **transaction pooler** (port **6543**) for the running site |
| `MIGRATION_DATABASE_URL` | yes | **session pooler** (port **5432**); used by the migration step in the build |
| `DATABASE_CA_CERT` | recommended | Supabase CA certificate (PEM, newlines as `\n`) so the database TLS certificate is verified |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | yes | image uploads, account admin tasks. Server-only |
| `EMAIL_TOKEN_SECRET` | yes | ≥ 16 random characters; signs unsubscribe links. Admin session keys are generated and rotated automatically in the database |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | yes | the single admin login (no database table); password ≥ 8 characters |
| `NEXT_PUBLIC_SITE_URL` | yes | `https://partslinkstore.lk` — used in email and auth links; must be https |
| `MAILTRAP_API_TOKEN` | yes | your Mailtrap token |
| `EMAIL_FROM`, `EMAIL_FROM_NAME`, `STAFF_NOTIFY_EMAIL` | yes | e.g. `orders@partslinkstore.lk`, `Partslk`, `support@partslinkstore.lk` |
| `PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET`, `PAYHERE_ENV` | when you enable PayHere | see section 2.1 |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CURRENCY` | when you enable cards | without a key only bank transfer / check / cash on delivery are offered |
| `SUPABASE_ANON_KEY` | optional | customer auth falls back to the service-role key without it |

### 1.3 Supabase dashboard **(you)**
1. **Authentication → URL Configuration:** Site URL `https://partslinkstore.lk`; Redirect URLs: `https://partslinkstore.lk/auth/callback` (and `http://localhost:3000/auth/callback` for local work).
2. **Authentication → Emails:** the built-in sender allows only a few emails an hour. Under *SMTP Settings* connect Mailtrap's SMTP credentials so sign-up/reset mails are not throttled.
3. **Project Settings → Database:** copy the connection strings (pooler URLs) and download the CA certificate.
4. **Storage:** the `product-images` bucket already exists (`npm run storage:setup` recreates it).

### 1.4 Mailtrap **(you)**
Sending Domains → `partslinkstore.lk` must show **Verified** (SPF, DKIM, DMARC records at your DNS host). Send yourself a test from the admin: `POST /api/admin/email-preview` (owner), or look at `email_outbox` after placing a test order.

---

## 2. Deploy on Vercel

1. Import the repository. Framework: Next.js. **Build command** comes from `vercel.json`:
   `node scripts/migrate.mjs --vercel-production-only && next build` — database migrations run automatically on **production** builds only (previews skip them).
2. Add the environment variables above, then deploy.
3. Add the domain `partslinkstore.lk` and follow Vercel's DNS instructions **(you)**.
4. **Admin login:** set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in Vercel, then sign in at `/admin/sign-in`. No database setup is needed; change the password by changing the env var (the session signing key is created automatically and rotates every 7 days, the old one stays valid 3 more days).
5. **Background upkeep:** there are no cron jobs. Abandoned card checkouts are cancelled (stock released), failed emails retried and old bookkeeping rows purged by `src/server/housekeeping.ts`, which runs after checkout and admin-dashboard requests (at most once every 10 minutes per instance).
6. **Stripe (later):** add the keys, then create a webhook endpoint `https://partslinkstore.lk/api/webhooks/stripe` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.canceled`, and paste its signing secret into `STRIPE_WEBHOOK_SECRET`.

### 2.1 PayHere setup **(you)**
PayHere charges in LKR directly, so there is no currency conversion. Checkout opens PayHere's payment window on top of our page (no redirect); the order is marked paid by PayHere's signed server notification to `/api/webhooks/payhere`, which checks the signature, the order and the amount.

1. Create a merchant account at <https://www.payhere.lk> and, for testing, a **sandbox** account at <https://sandbox.payhere.lk>.
2. In the portal: **Settings > Domains & Credentials** > add your domain (`partslinkstore.lk`; the sandbox needs the domain you test on too) and copy the **Merchant ID** and the **Merchant Secret** for that domain.
3. Set `PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET` and `PAYHERE_ENV=sandbox` (use `live` only with live credentials), then redeploy.
4. The notify URL (`https://<site>/api/webhooks/payhere`) must be reachable from the internet: PayHere cannot call `localhost`, so use a tunnel (ngrok) when testing locally, or test on the deployed preview.
5. Sandbox test card: Visa `4916217501611292`, any future expiry, any CVV. Then check the order becomes **paid** in `/admin/orders`.
6. Refunds are done from the PayHere merchant portal (not automated here); cancel the order afterwards in the admin.

### Go-live checklist
- [ ] `https://partslinkstore.lk/api/health` returns `{"ok":true,"db":"up"}`
- [ ] Place a bank-transfer order; confirmation email arrives; order shows in `/admin/orders`
- [ ] Register a customer; verification email arrives and the link lands on `/auth/callback`
- [ ] Contact form message appears in `/admin/messages` and reaches `STAFF_NOTIFY_EMAIL`
- [ ] Upload a product image in the admin (Supabase Storage)
- [ ] Response headers on `/` include `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`
- [ ] Only the production environment has the production database credentials
- [ ] Secrets rotated (section 5)

---

## 3. Running it

### Monitoring
- **Uptime:** point UptimeRobot / Better Stack at `/api/health` (HTTP 503 when the database is down). Alert on any non-200.
- **Logs:** Vercel → Logs. Every server error is one JSON line with `level:"error"`, `requestId`, `path`, `method`. Customers who hit an error are shown the same `requestId`, so search for it. Filter `level:error` and set an alert.
- **Errors in the browser** are not captured yet. If you want that, add Sentry (`npx @sentry/wizard@latest -i nextjs`) — it needs your Sentry account.
- **Email health:** the `email_outbox` table. `failed` rows are retried daily up to 5 times; `skipped` means email isn't configured (or the address is a reserved test domain such as `example.com`).
- **Rate limits** are stored in the database (`rate_limits`), so they hold across servers. Limits: login 5 failures per email / 20 per IP per 15 min, checkout 20, contact 5, newsletter 10, promo codes 20, reviews 10.

### Tests
```bash
npm run typecheck        # TypeScript
npm test                 # 52 integration/unit tests; uses a throwaway schema "vitest_run" in the database from MIGRATION_DATABASE_URL
npm run test:e2e         # browser smoke test with your installed Chrome; places and then removes one bank-transfer order
```
CI (`.github/workflows/ci.yml`) runs type-check, lint, build and — when the repository secret `TEST_DATABASE_URL` points at a **separate** Supabase project — the tests.

### Backups and recovery
- **Supabase backups** are the primary safety net. Check your plan **(you)**: Pro keeps daily backups; enable the **Point-in-Time Recovery** add-on for a live store.
- `npm run db:backup` writes every table to `backups/<timestamp>/*.json` (consistent snapshot). It contains customer data: keep it private; the folder is git-ignored. Run it before any risky change.
- **Migrations** (`db/migrations/*.sql`) are the source of truth for the schema; they are additive and safe to re-run.
- **Rollback a bad deploy:** Vercel → Deployments → previous deployment → *Promote to Production*. Because migrations only add things, the previous code keeps working with the newer schema.
- **Restore a table from a JSON backup:** `insert into <table> select * from json_populate_recordset(null::<table>, '<contents of the .json file>')` in the SQL editor, into an empty copy first.

### Security notes worth knowing
- Every page response carries a per-request Content-Security-Policy nonce; admin pages therefore render dynamically (already set).
- State-changing API calls from another website are refused (Origin check in `src/proxy.ts`); Stripe and PayHere webhooks are authenticated by signature instead.
- Admin: a single login from `ADMIN_EMAIL` / `ADMIN_PASSWORD`; every change is recorded in the audit log (`/api/admin/audit`).
- Client IPs for rate limits come from `x-forwarded-for`, which Vercel overwrites with the real client address. If you ever put another proxy in front, make sure it does the same.

---

## 4. Known gaps (decide when they matter)
- Card payments are built and tested with a simulated Stripe, but have not been run against real Stripe keys.
- No Sentry/APM; no automated alert rules beyond what you configure in your uptime tool and Vercel.
- Editing a product's stock in the admin sends the whole product, so it can overwrite sales made while the form was open.
- Password reset emails, sign-up confirmations and reset links come from Supabase (not Mailtrap) until you set Supabase SMTP.

---

## 5. Rotate secrets before launch **(you)**
The database password and service-role key were pasted into a chat and a markdown file (`Required credentials.md`), and a Mailtrap token was once written into `.env.example`. Treat them all as exposed.

1. Delete `Required credentials.md` from your computer (it is not inside the project folder).
2. **Supabase → Project Settings → Database → Reset database password.** Put the new password (URL-encode `? $ @ : /`) into `DATABASE_URL`, `MIGRATION_DATABASE_URL`, `DATABASE_PASSWORD` locally and in Vercel.
3. **Supabase → Project Settings → API → regenerate the service-role / secret key.** Update `SUPABASE_SERVICE_ROLE_KEY` locally and in Vercel.
4. **Mailtrap → API Tokens → create a new token, delete the old one.** Update `MAILTRAP_API_TOKEN`.
5. Generate a fresh `EMAIL_TOKEN_SECRET` for production (e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
6. Redeploy, then run the go-live checklist again.
