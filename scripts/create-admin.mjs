// Usage:
//   node scripts/create-admin.mjs <email> [--role owner|manager|staff]   (prompts for the password, hidden)
//   NEW_ADMIN_PASSWORD=... node scripts/create-admin.mjs <email>          (non-interactive, e.g. CI)
// If the email already exists its password and role are replaced (use this to reset a password).
import { existsSync } from "node:fs";
import { randomBytes, scrypt } from "node:crypto";
import readline from "node:readline";
import pg from "pg";

for (const f of [".env.local", ".env"]) if (existsSync(f)) process.loadEnvFile(f);

// Keep in sync with src/server/password.ts
const N = 2 ** 15, R = 8, P = 1, KEYLEN = 64, MAXMEM = 128 * 1024 * 1024;
const hashPassword = (password) =>
  new Promise((resolve, reject) => {
    const salt = randomBytes(16);
    scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM }, (err, key) =>
      err ? reject(err) : resolve(["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$")),
    );
  });

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s);
        else if (s === "\r\n" || s === "\n") rl.output.write(s);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

const args = process.argv.slice(2);
const email = (args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--role") ?? "").trim().toLowerCase();
const roleIdx = args.indexOf("--role");
const role = roleIdx >= 0 ? args[roleIdx + 1] : "owner";

if (!/^\S+@\S+\.\S+$/.test(email) || !["owner", "manager", "staff"].includes(role)) {
  console.error("Usage: node scripts/create-admin.mjs <email> [--role owner|manager|staff]");
  process.exit(1);
}

let password = process.env.NEW_ADMIN_PASSWORD;
if (!password) {
  password = await ask("Password (min 10 chars): ", { hidden: true });
  if (password !== (await ask("Repeat password: ", { hidden: true }))) {
    console.error("Passwords don't match.");
    process.exit(1);
  }
}
if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

const url = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await db.connect();
try {
  const { rows } = await db.query(
    `insert into admin_users (email, password_hash, role) values ($1, $2, $3)
     on conflict (email) do update set password_hash = excluded.password_hash, role = excluded.role, active = true
     returning id, (xmax = 0) as created`,
    [email, await hashPassword(password), role],
  );
  console.log(`${rows[0].created ? "Created" : "Updated"} ${role} account for ${email}`);
} catch (e) {
  console.error("failed:", e.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
