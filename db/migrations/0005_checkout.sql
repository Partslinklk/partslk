-- Phase 6: checkout, stock ledger, shipping methods, coupons, payments.

-- Human-friendly order numbers for new orders: PL-1001, PL-1002, ...
create sequence if not exists order_number_seq start 1001;

alter table orders add column if not exists payment_method text;                 -- bank | check | cod | card
alter table orders add column if not exists payment_status text not null default 'unpaid';
alter table orders add column if not exists payment_ref text;                    -- Stripe Checkout Session id
alter table orders add column if not exists discount numeric(12,2) not null default 0;
alter table orders add column if not exists coupon_code text;
alter table orders add column if not exists tracking_number text;
alter table orders add column if not exists lookup_token text not null default encode(gen_random_bytes(16), 'hex');

do $$ begin
  alter table orders add constraint orders_payment_status_check
    check (payment_status in ('unpaid', 'paid', 'failed', 'refunded'));
exception when duplicate_object then null; end $$;
create index if not exists orders_payment_ref_idx on orders (payment_ref) where payment_ref is not null;

create table if not exists order_events (
  id         bigserial primary key,
  order_id   text not null references orders(id) on delete cascade,
  kind       text not null,                       -- created, paid, cancelled, status, payment_failed ...
  detail     jsonb,
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on order_events (order_id, id);

create table if not exists stock_movements (
  id         bigserial primary key,
  product_id text not null references products(id),
  delta      integer not null,                    -- negative = sold, positive = restock / cancel
  reason     text not null,                       -- order | cancel | restock | adjust
  order_id   text references orders(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists stock_movements_product_idx on stock_movements (product_id, id);

create table if not exists shipping_methods (
  id            text primary key,
  label         text not null,
  cost          numeric(12,2) not null check (cost >= 0),
  free_over     numeric(12,2),                     -- cost becomes 0 once the subtotal reaches this
  min_subtotal  numeric(12,2) not null default 0,  -- method is only offered from this subtotal up
  countries     text[] not null default '{}',      -- ISO codes or names; empty = everywhere
  active        boolean not null default true,
  position      integer not null default 0
);

create table if not exists coupons (
  code          text primary key check (code = upper(code)),
  kind          text not null check (kind in ('percent', 'fixed')),
  value         numeric(12,2) not null check (value > 0),
  min_subtotal  numeric(12,2) not null default 0,
  max_uses      integer check (max_uses is null or max_uses > 0),
  used          integer not null default 0 check (used >= 0),
  starts_at     timestamptz,
  expires_at    timestamptz,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100)
);

-- Processed Stripe webhook events (idempotency).
create table if not exists stripe_events (
  id           text primary key,
  type         text not null,
  processed_at timestamptz not null default now()
);

alter table order_events     enable row level security;
alter table stock_movements  enable row level security;
alter table shipping_methods enable row level security;
alter table coupons          enable row level security;
alter table stripe_events    enable row level security;

-- Defaults that match the storefront's previous hard-coded options.
insert into shipping_methods (id, label, cost, min_subtotal, position) values
  ('free',   'Free shipping', 0, 100, 0),
  ('pickup', 'Local pickup',  5,   0, 1),
  ('flat',   'Flat rate',    10,   0, 2)
on conflict (id) do nothing;
