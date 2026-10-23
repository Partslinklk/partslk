import { query, tx, type PoolClient } from "./db";
import { HttpError } from "./http";
import type { ResourceName } from "./validation/catalog";

type Row = Record<string, unknown>;
type Field = { key: string; col: string; def?: unknown; ts?: boolean };

/** Flat tables: one row per item, ordered by `position`. */
const FLAT: Record<string, { table: string; fields: Field[] }> = {
  brands: { table: "brands", fields: [{ key: "name", col: "name" }] },
  makes: { table: "makes", fields: [{ key: "name", col: "name" }, { key: "logo", col: "logo", def: "" }] },
  testimonials: {
    table: "testimonials",
    fields: [
      { key: "quote", col: "quote" },
      { key: "name", col: "name" },
      { key: "meta", col: "meta", def: "" },
      { key: "rating", col: "rating", def: 5 },
      { key: "avatar", col: "avatar", def: "" },
    ],
  },
};

const TABLES: Record<ResourceName, string> = {
  products: "products",
  categories: "categories",
  brands: "brands",
  makes: "makes",
  deals: "deals",
  featured: "featured_products",
  popular: "popular_products",
  testimonials: "testimonials",
};

// ---------- row mappers ----------

const PRODUCT_CATEGORIES = `(select coalesce(array_agg(category_id order by position), '{}')
                               from product_categories where product_id = p.id) as categories`;

const PRODUCT_IMAGES = `(select coalesce(array_agg(url order by position), '{}')
                            from product_images where product_id = p.id) as images`;

function mapProduct(r: Row) {
  const gallery = (r.images as string[] | undefined) ?? [];
  return {
    id: r.id,
    name: r.name,
    image: r.image,
    images: gallery.length ? gallery : r.image ? [r.image] : [],
    description: r.description,
    categories: r.categories,
    brand: r.brand,
    colors: r.colors,
    size: r.size,
    price: r.price,
    ...(r.original_price != null ? { originalPrice: r.original_price } : {}),
    rating: r.rating,
    reviewCount: r.review_count,
    action: r.action,
    ...(r.highlight ? { highlight: r.highlight } : {}),
    stock: r.stock,
    published: r.published,
    ...(r.sku ? { sku: r.sku } : {}),
  };
}

function mapFlat(name: string, r: Row): Row {
  const o: Row = { id: r.id };
  for (const f of FLAT[name].fields) o[f.key] = f.ts ? new Date(r[f.col] as string).toISOString() : r[f.col];
  return o;
}

// ---------- reads ----------

async function listCategories(id?: string): Promise<Row[]> {
  const { rows } = await query(
    `select c.id, c.name, c.image, c.featured,
            coalesce(array_agg(l.label order by l.position) filter (where l.label is not null), '{}') as links
       from categories c left join category_links l on l.category_id = c.id
      ${id ? "where c.id = $1" : ""}
      group by c.id order by c.position, c.id`,
    id ? [id] : [],
  );
  return rows.map((r) => ({ id: r.id, name: r.name, image: r.image, links: r.links, featured: r.featured }));
}

async function listProducts(id?: string): Promise<Row[]> {
  const { rows } = await query(
    `select p.*, ${PRODUCT_CATEGORIES}, ${PRODUCT_IMAGES} from products p
      where p.deleted_at is null ${id ? "and p.id = $1" : ""} order by p.position, p.id`,
    id ? [id] : [],
  );
  return rows.map(mapProduct);
}

async function listFlat(name: string, id?: string): Promise<Row[]> {
  const { table, fields } = FLAT[name];
  const { rows } = await query(
    `select id, ${fields.map((f) => f.col).join(", ")} from ${table} ${id ? "where id = $1" : ""} order by position, id`,
    id ? [id] : [],
  );
  return rows.map((r) => mapFlat(name, r));
}

// ---------- homepage lists that point at real products ----------
// featured / popular: just a product + an order.  deals: a product + deal price + end time.
// Name, image, rating, regular price and button label are read live from `products`.

const REF_TABLES = { deals: "deals", featured: "featured_products", popular: "popular_products" } as const;
type RefName = keyof typeof REF_TABLES;
const isRef = (name: string): name is RefName => name in REF_TABLES;

async function listRefs(name: RefName, id?: string): Promise<Row[]> {
  const t = REF_TABLES[name];
  const dealCols = name === "deals" ? ", l.deal_price, l.ends_at" : "";
  const { rows } = await query(
    `select l.id, p.name, p.image, p.rating, p.price as regular_price, p.original_price, p.action, p.published${dealCols}
       from ${t} l join products p on p.id = l.id
      where p.deleted_at is null ${id ? "and l.id = $1" : ""} order by l.position, l.id`,
    id ? [id] : [],
  );
  return rows.map((r) => {
    const base = { id: r.id, name: r.name, image: r.image, rating: r.rating, published: r.published };
    if (name === "deals") {
      return { ...base, price: r.deal_price, originalPrice: r.regular_price, endsAt: new Date(r.ends_at as string).toISOString() };
    }
    return {
      ...base,
      price: r.regular_price,
      priceMax: 0,
      ctaLabel: r.action,
      ...(name === "popular" ? { originalPrice: r.original_price ?? 0 } : {}),
    };
  });
}

async function createRef(c: PoolClient, name: RefName, item: Row): Promise<boolean> {
  const t = REF_TABLES[name];
  const exists = await c.query("select 1 from products where id = $1 and deleted_at is null", [item.id]);
  if (!exists.rowCount) throw new HttpError(400, "That product doesn't exist (it may have been deleted).");
  const cols = name === "deals" ? ", deal_price, ends_at" : "";
  const vals = name === "deals" ? ", $2, $3" : "";
  const r = await c.query(
    `insert into ${t} (id, position${cols}) select $1, coalesce(max(position), -1) + 1${vals} from ${t} on conflict (id) do nothing`,
    name === "deals" ? [item.id, item.price, item.endsAt] : [item.id],
  );
  return !!r.rowCount;
}

async function updateRef(c: PoolClient, name: RefName, id: string, item: Row): Promise<boolean> {
  if (name !== "deals") return !!(await c.query(`select 1 from ${REF_TABLES[name]} where id = $1`, [id])).rowCount;
  const r = await c.query("update deals set deal_price = $2, ends_at = $3 where id = $1", [id, item.price, item.endsAt]);
  return !!r.rowCount;
}

export function listResource(name: ResourceName): Promise<Row[]> {
  if (name === "products") return listProducts();
  if (name === "categories") return listCategories();
  if (isRef(name)) return listRefs(name);
  return listFlat(name);
}

export async function getResource(name: ResourceName, id: string): Promise<Row | null> {
  const rows =
    name === "products" ? await listProducts(id)
    : name === "categories" ? await listCategories(id)
    : isRef(name) ? await listRefs(name, id)
    : await listFlat(name, id);
  return rows[0] ?? null;
}

// ---------- writes (single row) ----------

const productParams = (p: Row) => [
  p.name, p.image ?? "", p.description ?? "", p.brand ?? "", p.colors ?? [], p.size ?? "Medium", p.price,
  p.originalPrice || null, p.rating ?? 0, p.reviewCount ?? 0, p.action ?? "Add To Cart", p.highlight || null,
  p.stock ?? 0, p.published !== false, p.sku || null,
];

async function setProductCategories(c: PoolClient, id: string, categories: unknown) {
  await c.query("delete from product_categories where product_id = $1", [id]);
  // Unknown category ids are dropped rather than failing the whole save.
  await c.query(
    `insert into product_categories (product_id, category_id, position)
     select $1, t.id, t.ord - 1 from unnest($2::text[]) with ordinality as t(id, ord)
      where exists (select 1 from categories where id = t.id)
     on conflict do nothing`,
    [id, categories ?? []],
  );
}

async function setProductImages(c: PoolClient, id: string, images: unknown) {
  await c.query("delete from product_images where product_id = $1", [id]);
  const list = (images as string[] | undefined) ?? [];
  if (list.length) {
    await c.query(
      `insert into product_images (product_id, position, url)
       select $1, ord - 1, url from unnest($2::text[]) with ordinality as t(url, ord)`,
      [id, list],
    );
  }
}

async function setCategoryLinks(c: PoolClient, id: string, links: unknown) {
  await c.query("delete from category_links where category_id = $1", [id]);
  const list = (links as string[] | undefined) ?? [];
  if (list.length) {
    await c.query(
      `insert into category_links (category_id, position, label)
       select $1, ord - 1, label from unnest($2::text[]) with ordinality as t(label, ord)`,
      [id, list],
    );
  }
}

/** Returns false when the id is already taken. */
export function createResource(name: ResourceName, item: Row): Promise<boolean> {
  return tx(async (c) => {
    const id = item.id as string;
    if (name === "products") {
      // A soft-deleted product with the same id is revived (overwritten); a live one is a conflict.
      const r = await c.query(
        `insert into products (id, name, image, description, brand, colors, size, price, original_price,
                               rating, review_count, action, highlight, stock, published, sku, position)
         select $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, coalesce(max(position), -1) + 1 from products
         on conflict (id) do update set name = excluded.name, image = excluded.image, description = excluded.description,
           brand = excluded.brand, colors = excluded.colors, size = excluded.size, price = excluded.price,
           original_price = excluded.original_price, rating = excluded.rating, review_count = excluded.review_count,
           action = excluded.action, highlight = excluded.highlight, stock = excluded.stock,
           published = excluded.published, sku = excluded.sku, position = excluded.position,
           deleted_at = null, updated_at = now()
         where products.deleted_at is not null`,
        [id, ...productParams(item)],
      );
      if (!r.rowCount) return false;
      await setProductCategories(c, id, item.categories);
      await setProductImages(c, id, item.images);
      return true;
    }
    if (name === "categories") {
      const r = await c.query(
        `insert into categories (id, name, image, featured, position)
         select $1,$2,$3,$4, coalesce(max(position), -1) + 1 from categories on conflict (id) do nothing`,
        [id, item.name, item.image ?? "", !!item.featured],
      );
      if (!r.rowCount) return false;
      await setCategoryLinks(c, id, item.links);
      return true;
    }
    if (isRef(name)) return createRef(c, name, item);
    const { table, fields } = FLAT[name];
    const cols = fields.map((f) => f.col);
    const r = await c.query(
      `insert into ${table} (id, position, ${cols.join(", ")})
       select $1, coalesce(max(position), -1) + 1, ${cols.map((_, i) => `$${i + 2}`).join(", ")} from ${table}
       on conflict (id) do nothing`,
      [id, ...fields.map((f) => item[f.key] ?? f.def ?? null)],
    );
    return !!r.rowCount;
  });
}

/** Full replace of the row's fields. Returns false when the id doesn't exist. */
export function updateResource(name: ResourceName, id: string, item: Row): Promise<boolean> {
  return tx(async (c) => {
    if (name === "products") {
      const prev = (await c.query<{ stock: number }>("select stock from products where id = $1 and deleted_at is null for update", [id])).rows[0];
      const r = await c.query(
        `update products set name=$2, image=$3, description=$4, brand=$5, colors=$6, size=$7, price=$8,
                original_price=$9, rating=$10, review_count=$11, action=$12, highlight=$13, stock=$14,
                published=$15, sku=$16, updated_at=now()
          where id = $1 and deleted_at is null`,
        [id, ...productParams(item)],
      );
      if (!r.rowCount) return false;
      const delta = Number(item.stock ?? 0) - (prev?.stock ?? 0);
      if (delta !== 0) await c.query("insert into stock_movements (product_id, delta, reason) values ($1, $2, 'adjust')", [id, delta]);
      await setProductCategories(c, id, item.categories);
      await setProductImages(c, id, item.images);
      return true;
    }
    if (name === "categories") {
      const r = await c.query("update categories set name=$2, image=$3, featured=$4 where id = $1", [
        id, item.name, item.image ?? "", !!item.featured,
      ]);
      if (!r.rowCount) return false;
      await setCategoryLinks(c, id, item.links);
      return true;
    }
    if (isRef(name)) return updateRef(c, name, id, item);
    const { table, fields } = FLAT[name];
    const r = await c.query(
      `update ${table} set ${fields.map((f, i) => `${f.col} = $${i + 2}`).join(", ")} where id = $1`,
      [id, ...fields.map((f) => item[f.key] ?? f.def ?? null)],
    );
    return !!r.rowCount;
  });
}

/** Products are soft-deleted (orders keep referencing them by id); everything else is removed. */
export async function removeResource(name: ResourceName, id: string): Promise<boolean> {
  const r =
    name === "products"
      ? await query("update products set deleted_at = now() where id = $1 and deleted_at is null", [id])
      : await query(`delete from ${TABLES[name]} where id = $1`, [id]);
  return !!r.rowCount;
}

/** Sets display order to the given id sequence (ids not listed keep their relative position after them). */
export async function reorderResource(name: ResourceName, ids: string[]): Promise<void> {
  const table = TABLES[name];
  await tx(async (c) => {
    await c.query(
      `update ${table} t set position = v.ord - 1
         from unnest($1::text[]) with ordinality as v(id, ord) where t.id = v.id`,
      [ids],
    );
    await c.query(
      `update ${table} set position = position + $2 where id <> all($1::text[])`,
      [ids, ids.length],
    );
  });
}

// ---------- public product search ----------

export type ProductQuery = {
  q?: string;
  category?: string;
  brand?: string;
  color?: string;
  min?: number;
  max?: number;
  sort: "position" | "price_asc" | "price_desc" | "rating" | "newest" | "name";
  page: number;
  limit: number;
};

const SORTS: Record<ProductQuery["sort"], string> = {
  position: "p.position, p.id",
  price_asc: "p.price asc, p.id",
  price_desc: "p.price desc, p.id",
  rating: "p.rating desc, p.review_count desc, p.id",
  newest: "p.created_at desc, p.id",
  name: "lower(p.name), p.id",
};

/** "brake pad" -> "brake:* & pad:*" (prefix match on every word; only [a-z0-9] survives). */
function toTsQuery(q: string) {
  const words = q.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return words.slice(0, 8).map((w) => `${w}:*`).join(" & ");
}

export async function searchProducts(opts: ProductQuery) {
  const where = ["p.deleted_at is null", "p.published = true"];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    where.push(sql.replace("?", `$${params.length}`));
  };

  const tsq = opts.q ? toTsQuery(opts.q) : "";
  if (tsq) add("p.search @@ to_tsquery('simple', ?)", tsq);
  if (opts.category) add("exists (select 1 from product_categories pc where pc.product_id = p.id and pc.category_id = ?)", opts.category);
  if (opts.brand) add("lower(p.brand) = lower(?)", opts.brand);
  if (opts.color) add("? = any(p.colors)", opts.color.toLowerCase());
  if (opts.min != null) add("p.price >= ?", opts.min);
  if (opts.max != null) add("p.price <= ?", opts.max);

  const whereSql = where.join(" and ");
  const total = (await query<{ n: number }>(`select count(*)::int as n from products p where ${whereSql}`, params)).rows[0].n;

  params.push(opts.limit, (opts.page - 1) * opts.limit);
  const { rows } = await query(
    `select p.*, ${PRODUCT_CATEGORIES}, ${PRODUCT_IMAGES} from products p where ${whereSql}
      order by ${SORTS[opts.sort]} limit $${params.length - 1} offset $${params.length}`,
    params,
  );
  return {
    items: rows.map(mapProduct),
    total,
    page: opts.page,
    limit: opts.limit,
    pages: Math.max(1, Math.ceil(total / opts.limit)),
  };
}
