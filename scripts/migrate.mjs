// Usage:
//   node scripts/migrate.mjs           apply pending db/migrations/*.sql (in filename order, one transaction each)
//   node scripts/migrate.mjs --status  list applied / pending migrations
//   node scripts/migrate.mjs --seed    seed empty tables from data/*.json (never overwrites existing rows)
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import pg from "pg";

for (const f of [".env.local", ".env"]) if (existsSync(f)) process.loadEnvFile(f);

// `--vercel-production-only`: used as a Vercel build step. Preview deployments skip the migration so they can
// never change the production database; local runs (no VERCEL_ENV) and production builds go ahead.
if (process.argv.includes("--vercel-production-only") && process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
  console.log(`Skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV}).`);
  process.exit(0);
}

const root = process.cwd();
const url = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("Set MIGRATION_DATABASE_URL (or DATABASE_URL) in .env");
  process.exit(1);
}
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

const json = (name) => JSON.parse(readFileSync(path.join(root, "data", `${name}.json`), "utf8"));
const empty = async (table) => (await client.query(`select 1 from ${table} limit 1`)).rowCount === 0;
const ins = async (table, cols, rows) => {
  const sql = `insert into ${table} (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) on conflict do nothing`;
  for (const r of rows) await client.query(sql, r);
  console.log(`  seeded ${table}: ${rows.length}`);
};

async function seed() {
  if (await empty("categories")) {
    const cats = json("categories");
    await ins("categories", ["id", "name", "image", "featured", "position"], cats.map((c, i) => [c.id, c.name, c.image ?? "", !!c.featured, i]));
    await ins("category_links", ["category_id", "position", "label"], cats.flatMap((c) => (c.links ?? []).map((l, i) => [c.id, i, l])));
  }
  if (await empty("brands")) await ins("brands", ["id", "name", "position"], json("brands").map((b, i) => [b.id, b.name, i]));
  if (await empty("makes")) await ins("makes", ["id", "name", "logo", "position"], json("makes").map((m, i) => [m.id, m.name, m.logo ?? "", i]));
  if (await empty("products")) {
    const ps = json("products");
    await ins(
      "products",
      ["id", "name", "image", "description", "brand", "colors", "size", "price", "original_price", "rating", "review_count", "action", "highlight", "stock", "published", "position"],
      ps.map((p, i) => [p.id, p.name, p.image ?? "", p.description ?? "", p.brand ?? "", p.colors ?? [], p.size ?? "Medium", p.price, p.originalPrice || null, p.rating ?? 0, p.reviewCount ?? 0, p.action ?? "Add To Cart", p.highlight || null, p.stock ?? 0, p.published !== false, i]),
    );
    await ins("product_categories", ["product_id", "category_id", "position"], ps.flatMap((p) => (p.categories ?? []).map((c, i) => [p.id, c, i])));
  }
  // deals / featured / popular now link to products in the admin; there is nothing to seed for them.
  if (await empty("testimonials"))
    await ins("testimonials", ["id", "quote", "name", "meta", "rating", "avatar", "position"], json("testimonials").map((t, i) => [t.id, t.quote, t.name, t.meta ?? "", t.rating ?? 5, t.avatar ?? "", i]));
}

async function migrate({ statusOnly }) {
  await client.query(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const applied = new Set((await client.query("select name from schema_migrations")).rows.map((r) => r.name));
  const files = readdirSync(path.join(root, "db", "migrations")).filter((f) => f.endsWith(".sql")).sort();
  const pending = files.filter((f) => !applied.has(f));

  for (const f of files) console.log(`  [${applied.has(f) ? "applied" : "pending"}] ${f}`);
  if (statusOnly) return;
  if (!pending.length) return console.log("Nothing to migrate.");

  for (const f of pending) {
    try {
      await client.query("begin");
      await client.query(readFileSync(path.join(root, "db", "migrations", f), "utf8"));
      await client.query("insert into schema_migrations (name) values ($1)", [f]);
      await client.query("commit");
      console.log(`applied ${f}`);
    } catch (e) {
      await client.query("rollback").catch(() => {});
      throw new Error(`${f}: ${e.message}`);
    }
  }
}

await client.connect();
try {
  if (process.argv.includes("--seed")) {
    await client.query("begin");
    await seed();
    await client.query("commit");
  } else {
    await migrate({ statusOnly: process.argv.includes("--status") });
  }
} catch (e) {
  await client.query("rollback").catch(() => {});
  console.error("failed:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
