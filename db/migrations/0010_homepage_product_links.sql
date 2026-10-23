-- Homepage sections now point at real products instead of keeping their own copy of name/image/price.
--   featured_products / popular_products : just "which product, in what order"
--   deals                                : which product + the deal price + when it ends
-- Name, image, rating, regular price and button label always come live from `products`.

-- Rows that don't match a product can't be kept (there is nothing to link them to).
delete from featured_products where id not in (select id from products);
delete from popular_products  where id not in (select id from products);
delete from deals             where id not in (select id from products);

alter table featured_products
  drop column if exists name, drop column if exists image, drop column if exists rating,
  drop column if exists price, drop column if exists price_max, drop column if exists cta_label;
alter table popular_products
  drop column if exists name, drop column if exists image, drop column if exists rating,
  drop column if exists price, drop column if exists price_max, drop column if exists original_price,
  drop column if exists cta_label;
alter table deals
  drop column if exists name, drop column if exists image, drop column if exists rating,
  drop column if exists original_price;

do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = current_schema() and table_name = 'deals' and column_name = 'price') then
    alter table deals rename column price to deal_price;
  end if;
end $$;

do $$ begin
  alter table featured_products add constraint featured_products_product_fk foreign key (id) references products(id) on delete cascade on update cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table popular_products add constraint popular_products_product_fk foreign key (id) references products(id) on delete cascade on update cascade;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table deals add constraint deals_product_fk foreign key (id) references products(id) on delete cascade on update cascade;
exception when duplicate_object then null; end $$;
