import { expect, test } from "@playwright/test";
import pg from "pg";

process.loadEnvFile?.(".env");

const EMAIL = "e2e-smoke@example.com";
const PRODUCT = "e2e-smoke-product";

async function withDb<T>(fn: (db: pg.Client) => Promise<T>): Promise<T | undefined> {
  const url = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) return undefined;
  const db = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await db.connect();
  try {
    return await fn(db);
  } finally {
    await db.end();
  }
}

// The test brings its own product, so it works on an empty store too.
test.beforeAll(async () => {
  await withDb(async (db) => {
    await db.query("delete from products where id = $1", [PRODUCT]);
    await db.query(
      "insert into products (id, name, price, stock, published, image) values ($1, 'E2E Smoke Product', 100, 5, true, '/product-1.png')",
      [PRODUCT],
    );
    await db.query("insert into product_images (product_id, position, url) values ($1, 0, '/product-1.png'), ($1, 1, '/product-2.png')", [PRODUCT]);
  });
});

// Remove the order and the product (items, events, ledger rows and gallery go with them).
test.afterAll(async () => {
  await withDb(async (db) => {
    await db.query("delete from stock_movements where order_id in (select id from orders where email = $1)", [EMAIL]);
    await db.query("delete from orders where email = $1", [EMAIL]);
    await db.query("delete from products where id = $1", [PRODUCT]);
  });
});

test("health endpoint and security headers", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ ok: true, db: "up" });

  const home = await request.get("/");
  const h = home.headers();
  expect(h["content-security-policy"]).toContain("script-src 'self' 'nonce-");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["strict-transport-security"]).toContain("max-age=");
  expect(h["x-powered-by"]).toBeUndefined();
  expect(h["x-request-id"]).toBeTruthy();
});

test("a cross-site POST to the API is blocked", async ({ request }) => {
  const res = await request.post("/api/newsletter", { data: { email: "x@example.com" }, headers: { origin: "https://evil.example" } });
  expect(res.status()).toBe(403);
});

test("browse -> add to cart -> checkout (bank transfer) -> order placed", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    // Ignore browser-extension noise; fail on anything the app itself reports as a CSP violation.
    if (m.type() === "error" && /Content Security Policy|Refused to/.test(m.text())) consoleErrors.push(m.text());
  });

  // Keep the newsletter popup out of the way (it only shows if it hasn't been dismissed before).
  await page.addInitScript(() => localStorage.setItem("newsletter-popup-dismissed", "1"));

  await page.goto("/products");
  await page.getByRole("link", { name: /E2E Smoke Product/i }).first().click();

  await expect(page).toHaveURL(new RegExp(`/products/${PRODUCT}`));
  // Two gallery photos -> two thumbnails; picking the second swaps the main photo.
  await expect(page.locator(".pdp-thumb")).toHaveCount(2);
  await page.locator(".pdp-thumb").nth(1).click();
  await expect(page.locator(".pdp-thumb").nth(1)).toHaveAttribute("aria-current", "true");
  await page.getByRole("button", { name: "Add To Cart" }).first().click();
  await page.goto("/checkout");

  // Shipping options come from the API; the form is only usable once they have loaded.
  await expect(page.getByRole("radio", { name: /Local pickup|Flat rate|Free shipping/ }).first()).toBeVisible();
  await page.locator("#ck-firstName").fill("E2E");
  await page.locator("#ck-phone").fill("0771234567");
  await page.locator("#ck-address").fill("12 Smoke Test Road");
  await page.locator("#ck-postcode").fill("00100");
  await page.locator("#ck-email").fill(EMAIL);
  await page.getByRole("radio", { name: "Direct bank transfer" }).check();
  await page.getByRole("button", { name: "PLACE ORDER" }).click();

  await expect(page.getByText("Thank you! Your order has been placed.")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/PL-\d+/).first()).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
