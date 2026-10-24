import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/admin/login/route";
import { SESSION_COOKIE } from "@/lib/admin-auth";
import { requireAdmin } from "@/server/admin";
import { closeDb, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(closeDb);

// ADMIN_EMAIL / ADMIN_PASSWORD come from vitest.config.mts
const attempt = (email: string, password: string, ip = "10.0.0.1") =>
  login(new Request("http://localhost:3000/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ email, password }),
  }));

describe("admin login (credentials from env)", () => {
  it("signs in with the env credentials and the cookie then authenticates API calls", async () => {
    const res = await attempt("ADMIN@example.com", "vitest-admin-password");
    expect(res.status).toBe(200);
    const cookie = res.headers.getSetCookie().find((c) => c.startsWith(`${SESSION_COOKIE}=`))!;
    expect(cookie).toContain("HttpOnly");

    const admin = await requireAdmin(new Request("http://localhost:3000/api/admin/me", { headers: { cookie: cookie.split(";")[0] } }));
    expect(admin.email).toBe("admin@example.com");
  });

  it("rejects wrong credentials without saying which part was wrong", async () => {
    for (const [email, password] of [["admin@example.com", "nope-nope-nope"], ["someone@example.com", "vitest-admin-password"]]) {
      const res = await attempt(email, password);
      expect(res.status).toBe(401);
      expect((await res.json()).error).toBe("Invalid email or password.");
    }
  });

  it("locks out an address after repeated failures", async () => {
    for (let i = 0; i < 5; i++) await attempt("admin@example.com", "wrong-password", "10.0.0.2");
    expect((await attempt("admin@example.com", "vitest-admin-password", "10.0.0.3")).status).toBe(429);
  });

  it("rejects requests with no or a forged session", async () => {
    await expect(requireAdmin(new Request("http://localhost:3000/api/admin/me"))).rejects.toMatchObject({ status: 401 });
    const forged = `${SESSION_COOKIE}=env-admin.${Date.now() + 60_000}.deadbeef`;
    await expect(requireAdmin(new Request("http://localhost:3000/api/admin/me", { headers: { cookie: forged } }))).rejects.toMatchObject({ status: 401 });
  });
});
