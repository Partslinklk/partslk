-- Phase 2: SKU, soft delete and full-text search for products.
alter table products add column if not exists sku text;
alter table products add column if not exists deleted_at timestamptz;
alter table products add column if not exists search tsvector
  generated always as (
    to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(description, ''))
  ) stored;

create unique index if not exists products_sku_key on products (sku) where sku is not null;
create index if not exists products_search_idx on products using gin (search);
create index if not exists products_live_idx on products (position) where deleted_at is null;
create index if not exists products_price_idx on products (price);
