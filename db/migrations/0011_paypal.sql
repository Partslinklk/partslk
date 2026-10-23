-- PayPal payments: one row per PayPal order we create, updated when it is captured / refunded.
create table if not exists payments (
  id                uuid primary key default gen_random_uuid(),
  order_id          text not null references orders(id) on delete cascade,
  provider          text not null default 'paypal',
  provider_order_id text not null unique,            -- PayPal order id
  capture_id        text,                            -- PayPal capture id (needed for refunds)
  status            text not null default 'created'
                    check (status in ('created', 'pending', 'completed', 'denied', 'refunded', 'partially_refunded')),
  amount            numeric(12,2) not null,          -- what PayPal is asked to charge, in `currency`
  currency          text not null,                   -- PayPal currency (PayPal doesn't support LKR)
  store_amount      numeric(12,2) not null,          -- the order total in the store's currency (LKR)
  exchange_rate     numeric(14,6) not null default 1,-- store currency units per 1 `currency`
  fee               numeric(12,2),                   -- PayPal's fee, in `currency`
  net               numeric(12,2),                   -- what lands in the PayPal balance, in `currency`
  refunded          numeric(12,2) not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists payments_order_idx on payments (order_id);
create index if not exists payments_created_idx on payments (created_at desc);
create index if not exists payments_status_idx on payments (status);
create unique index if not exists payments_capture_key on payments (capture_id) where capture_id is not null;

-- Processed PayPal webhook events (idempotency).
create table if not exists paypal_events (
  id           text primary key,
  type         text not null,
  processed_at timestamptz not null default now()
);

alter table payments      enable row level security;
alter table paypal_events enable row level security;
