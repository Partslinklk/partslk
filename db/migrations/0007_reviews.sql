-- Phase 8: product reviews (verified buyers only, moderated).
create table if not exists reviews (
  id           uuid primary key default gen_random_uuid(),
  product_id   text not null references products(id) on delete cascade,
  customer_id  uuid references customers(id) on delete set null,
  author_name  text not null,
  rating       smallint not null check (rating between 1 and 5),
  title        text not null default '',
  body         text not null,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz not null default now(),
  moderated_at timestamptz
);
-- one review per customer per product (customer_id may become null if the account is deleted)
create unique index if not exists reviews_one_per_customer on reviews (product_id, customer_id) where customer_id is not null;
create index if not exists reviews_product_status_idx on reviews (product_id, status, created_at desc);
create index if not exists reviews_status_idx on reviews (status, created_at desc);

alter table reviews enable row level security;
