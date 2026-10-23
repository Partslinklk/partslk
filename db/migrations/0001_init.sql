-- Partslk storefront schema. Idempotent: safe to re-run (scripts/migrate.mjs).
-- Tables are only reachable through the server (direct Postgres). RLS is enabled
-- with no policies so Supabase's public REST/anon API cannot read or write them.

create table if not exists categories (
  id        text primary key,
  name      text not null,
  image     text not null default '',
  featured  boolean not null default false,
  position  integer not null default 0
);

create table if not exists category_links (
  category_id text not null references categories(id) on delete cascade on update cascade,
  position    integer not null,
  label       text not null,
  primary key (category_id, position)
);

create table if not exists brands (
  id        text primary key,
  name      text not null unique,
  position  integer not null default 0
);

create table if not exists makes (
  id        text primary key,
  name      text not null,
  logo      text not null default '',
  position  integer not null default 0
);

create table if not exists products (
  id             text primary key,
  name           text not null,
  image          text not null default '',
  description    text not null default '',
  brand          text not null default '',
  colors         text[] not null default '{}',
  size           text not null default 'Medium' check (size in ('Small', 'Medium')),
  price          numeric(12,2) not null check (price >= 0),
  original_price numeric(12,2) check (original_price >= 0),
  rating         numeric(2,1) not null default 0 check (rating between 0 and 5),
  review_count   integer not null default 0 check (review_count >= 0),
  action         text not null default 'Add To Cart',
  highlight      text check (highlight in ('best-seller', 'new-arrival')),
  stock          integer not null default 0 check (stock >= 0),
  published      boolean not null default true,
  position       integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists products_published_idx on products (published);
create index if not exists products_brand_idx on products (brand);

create table if not exists product_categories (
  product_id  text not null references products(id) on delete cascade on update cascade,
  category_id text not null references categories(id) on delete cascade on update cascade,
  position    integer not null default 0,
  primary key (product_id, category_id)
);
create index if not exists product_categories_category_idx on product_categories (category_id);

-- Homepage merchandising rows. They carry their own display prices and may
-- reference items that are not in `products`, so no FK to it.
create table if not exists deals (
  id             text primary key,
  name           text not null,
  image          text not null default '',
  rating         numeric(2,1) not null default 0 check (rating between 0 and 5),
  price          numeric(12,2) not null check (price >= 0),
  original_price numeric(12,2) not null default 0,
  ends_at        timestamptz not null,
  position       integer not null default 0
);

create table if not exists featured_products (
  id         text primary key,
  name       text not null,
  image      text not null default '',
  rating     numeric(2,1) not null default 0 check (rating between 0 and 5),
  price      numeric(12,2) not null check (price >= 0),
  price_max  numeric(12,2) not null default 0,
  cta_label  text not null default 'Add To Cart',
  position   integer not null default 0
);

create table if not exists popular_products (
  id             text primary key,
  name           text not null,
  image          text not null default '',
  rating         numeric(2,1) not null default 0 check (rating between 0 and 5),
  price          numeric(12,2) not null check (price >= 0),
  price_max      numeric(12,2) not null default 0,
  original_price numeric(12,2) not null default 0,
  cta_label      text not null default 'Add To Cart',
  position       integer not null default 0
);

create table if not exists testimonials (
  id        text primary key,
  quote     text not null,
  name      text not null,
  meta      text not null default '',
  rating    numeric(2,1) not null default 5 check (rating between 0 and 5),
  avatar    text not null default '',
  position  integer not null default 0
);

create table if not exists orders (
  id             text primary key,
  created_at     timestamptz not null default now(),
  status         text not null default 'pending'
                 check (status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  first_name     text not null,
  last_name      text not null default '',
  email          text not null,
  phone          text not null default '',
  country        text not null default '',
  address        text not null default '',
  city           text not null default '',
  postcode       text not null default '',
  shipping_label text not null default '',
  shipping_cost  numeric(12,2) not null default 0 check (shipping_cost >= 0),
  payment        text not null default '',
  note           text not null default '',
  subtotal       numeric(12,2) not null check (subtotal >= 0),
  total          numeric(12,2) not null check (total >= 0)
);
create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists orders_email_idx on orders (lower(email));
create index if not exists orders_status_idx on orders (status);

create table if not exists order_items (
  order_id   text not null references orders(id) on delete cascade on update cascade,
  position   integer not null,
  product_id text not null,
  name       text not null,
  image      text not null default '',
  price      numeric(12,2) not null check (price >= 0),
  qty        integer not null check (qty > 0),
  primary key (order_id, position)
);

alter table categories         enable row level security;
alter table category_links     enable row level security;
alter table brands             enable row level security;
alter table makes              enable row level security;
alter table products           enable row level security;
alter table product_categories enable row level security;
alter table deals              enable row level security;
alter table featured_products  enable row level security;
alter table popular_products   enable row level security;
alter table testimonials       enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;
