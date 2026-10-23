-- Phase 4: real admin accounts + audit trail (replaces ADMIN_EMAIL / ADMIN_PASSWORD).
create table if not exists admin_users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique check (email = lower(email)),
  password_hash text not null,                       -- scrypt$N$r$p$salt$hash (see src/server/password.ts)
  role          text not null default 'staff' check (role in ('owner', 'manager', 'staff')),
  active        boolean not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists audit_log (
  id          bigserial primary key,
  admin_id    uuid references admin_users(id) on delete set null,
  admin_email text,                                  -- kept even if the admin is later deleted
  action      text not null,                         -- 'products.update', 'order.status', 'admin.login' ...
  entity      text not null,
  entity_id   text,
  diff        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_log_created_idx on audit_log (created_at desc);
create index if not exists audit_log_entity_idx on audit_log (entity, entity_id);

alter table admin_users enable row level security;
alter table audit_log   enable row level security;
