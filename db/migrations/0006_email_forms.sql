-- Phase 7: contact messages, newsletter subscribers, outgoing email outbox.

create table if not exists contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  subject     text not null default '',
  message     text not null default '',
  status      text not null default 'new' check (status in ('new', 'read', 'replied')),
  created_at  timestamptz not null default now()
);
create index if not exists contact_messages_created_idx on contact_messages (created_at desc);
create index if not exists contact_messages_status_idx on contact_messages (status);

create table if not exists newsletter_subscribers (
  email            text primary key check (email = lower(email)),
  source           text not null default 'popup',
  unsubscribed_at  timestamptz,
  created_at       timestamptz not null default now()
);

-- Every email is written here first, then delivered; failures are retried by /api/cron/send-emails.
create table if not exists email_outbox (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null,                      -- order_confirmation, payment_received, shipped, welcome, contact_staff, newsletter_welcome
  to_email     text not null,
  reply_to     text,
  subject      text not null,
  html         text not null,
  text_body    text not null,
  order_id     text references orders(id) on delete set null,
  status       text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts     integer not null default 0,
  last_error   text,
  provider_id  text,
  created_at   timestamptz not null default now(),
  sent_at      timestamptz
);
create index if not exists email_outbox_status_idx on email_outbox (status, created_at);
create index if not exists email_outbox_order_idx on email_outbox (order_id);

alter table contact_messages       enable row level security;
alter table newsletter_subscribers enable row level security;
alter table email_outbox           enable row level security;
