// Usage:
//   node scripts/storage.mjs setup             create the public image bucket (idempotent)
//   node scripts/storage.mjs migrate-uploads   upload public/uploads/* and rewrite /uploads/... URLs in the database
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

for (const f of [".env.local", ".env"]) if (existsSync(f)) process.loadEnvFile(f);
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL } = process.env;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "product-images";
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

async function setup() {
  const { data } = await supabase.storage.listBuckets();
  const options = { public: true, fileSizeLimit: 5 * 1024 * 1024, allowedMimeTypes: Object.values(MIME).filter((v, i, a) => a.indexOf(v) === i) };
  if (data?.some((b) => b.name === bucket)) {
    const { error } = await supabase.storage.updateBucket(bucket, options);
    if (error) throw error;
    console.log(`bucket "${bucket}" already exists (settings refreshed)`);
  } else {
    const { error } = await supabase.storage.createBucket(bucket, options);
    if (error) throw error;
    console.log(`bucket "${bucket}" created (public read, 5 MB limit, images only)`);
  }
}

async function migrateUploads() {
  const dir = path.join(process.cwd(), "public", "uploads");
  if (!existsSync(dir)) return console.log("No public/uploads folder — nothing to migrate.");
  const db = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  const targets = [["products", "image"], ["categories", "image"], ["makes", "logo"], ["deals", "image"], ["featured_products", "image"], ["popular_products", "image"], ["testimonials", "avatar"]];
  try {
    for (const file of readdirSync(dir)) {
      const type = MIME[path.extname(file).toLowerCase()];
      if (!type) continue;
      const dest = `products/${file}`;
      const { error } = await supabase.storage.from(bucket).upload(dest, readFileSync(path.join(dir, file)), { contentType: type, cacheControl: "31536000", upsert: true });
      if (error) throw new Error(`${file}: ${error.message}`);
      const url = supabase.storage.from(bucket).getPublicUrl(dest).data.publicUrl;
      let n = 0;
      for (const [table, col] of targets) n += (await db.query(`update ${table} set ${col} = $2 where ${col} = $1`, [`/uploads/${file}`, url])).rowCount;
      console.log(`${file} -> ${url} (${n} row(s) updated)`);
    }
  } finally {
    await db.end();
  }
}

const cmd = process.argv[2];
try {
  if (cmd === "setup") await setup();
  else if (cmd === "migrate-uploads") await migrateUploads();
  else console.log("Usage: node scripts/storage.mjs setup | migrate-uploads");
} catch (e) {
  console.error("failed:", e.message ?? e);
  process.exitCode = 1;
}
