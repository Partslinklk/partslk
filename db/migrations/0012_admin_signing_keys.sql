-- The admin login now lives in env (ADMIN_EMAIL / ADMIN_PASSWORD); no admin_users table is needed.
-- audit_log keeps admin_email; admin_id is no longer written.
alter table audit_log drop constraint if exists audit_log_admin_id_fkey;
drop table if exists admin_users;

-- Auto-generated, auto-rotating keys that sign admin session cookies (see src/server/admin-keys.ts).
create table if not exists admin_signing_keys (
  id         uuid primary key default gen_random_uuid(),
  secret     text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists admin_signing_keys_created_idx on admin_signing_keys (created_at desc);
alter table admin_signing_keys enable row level security;
