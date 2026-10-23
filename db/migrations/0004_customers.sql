-- Phase 5: customer accounts. customers.id = Supabase Auth user id (auth.users.id).
create table if not exists customers (
  id          uuid primary key,
  email       text not null,
  first_name  text not null default '',
  last_name   text not null default '',
  phone       text not null default '',
  created_at  timestamptz not null default now()
);
create unique index if not exists customers_email_key on customers (lower(email));

create table if not exists customer_addresses (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  label       text not null default 'Home',
  first_name  text not null default '',
  last_name   text not null default '',
  phone       text not null default '',
  country     text not null,
  address     text not null,
  city        text not null,
  postcode    text not null,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists customer_addresses_customer_idx on customer_addresses (customer_id);
-- at most one default address per customer
create unique index if not exists customer_addresses_default_key on customer_addresses (customer_id) where is_default;

create table if not exists wishlist_items (
  customer_id uuid not null references customers(id) on delete cascade,
  product_id  text not null references products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (customer_id, product_id)
);

alter table orders add column if not exists customer_id uuid references customers(id) on delete set null;
create index if not exists orders_customer_idx on orders (customer_id);

alter table customers          enable row level security;
alter table customer_addresses enable row level security;
alter table wishlist_items     enable row level security;
