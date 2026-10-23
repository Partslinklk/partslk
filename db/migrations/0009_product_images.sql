-- Product galleries: any number of images per product (front, back, sides, details...).
-- products.image stays as the cover (= first gallery image) so cards, carts and orders keep working.
create table if not exists product_images (
  product_id text not null references products(id) on delete cascade on update cascade,
  position   integer not null,
  url        text not null,
  primary key (product_id, position)
);

-- Existing products: their single image becomes the first gallery image.
insert into product_images (product_id, position, url)
select id, 0, image from products
 where image <> '' and not exists (select 1 from product_images pi where pi.product_id = products.id);

alter table product_images enable row level security;
