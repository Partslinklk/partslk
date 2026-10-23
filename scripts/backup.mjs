// Usage: npm run db:backup            -> writes backups/<timestamp>/<table>.json for every public table
//        npm run db:backup -- --out some/dir
// A portable safety net on top of Supabase's own backups (daily on paid plans, point-in-time with the PITR add-on).
// The files contain customer data (names, emails, addresses, orders): keep them private. backups/ is git-ignored.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import pg from "pg";

for (const f of [".env.local", ".env"]) if (existsSync(f)) process.loadEnvFile(f);

const url = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("Set MIGRATION_DATABASE_URL (or DATABASE_URL) in .env");
  process.exit(1);
}

const outIdx = process.argv.indexOf("--out");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dir = outIdx >= 0 ? process.argv[outIdx + 1] : path.join("backups", stamp);
mkdirSync(dir, { recursive: true });

// Short-lived or rebuildable tables aren't worth keeping.
const SKIP = new Set(["rate_limits"]);

const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await db.connect();
try {
  // One transaction + REPEATABLE READ = a consistent snapshot across all tables.
  await db.query("begin isolation level repeatable read read only");
  const { rows } = await db.query("select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1");
  const manifest = { createdAt: new Date().toISOString(), tables: {} };
  for (const { table_name: t } of rows) {
    if (SKIP.has(t)) continue;
    const data = (await db.query(`select * from "${t}"`)).rows;
    writeFileSync(path.join(dir, `${t}.json`), JSON.stringify(data));
    manifest.tables[t] = data.length;
    console.log(`  ${t.padEnd(24)} ${data.length} rows`);
  }
  await db.query("commit");
  writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`\nBackup written to ${dir}`);
} catch (e) {
  await db.query("rollback").catch(() => {});
  console.error("backup failed:", e.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
