import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { query } from "@/server/db";
import { clearFailures, hits, isThrottled, purgeRateLimits, recordFailure } from "@/server/rate-limit";
import { closeDb, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(closeDb);

describe("rate limiter (Postgres-backed)", () => {
  it("counts hits per key and throttles at the limit", async () => {
    expect(await isThrottled("login:a", 3)).toBe(false);
    for (let i = 1; i <= 3; i++) expect(await recordFailure("login:a")).toBe(i);
    expect(await hits("login:a")).toBe(3);
    expect(await isThrottled("login:a", 3)).toBe(true);
    expect(await isThrottled("login:a", 4)).toBe(false);
  });

  it("keeps keys independent", async () => {
    await recordFailure("ip:1");
    await recordFailure("ip:1");
    expect(await hits("ip:2")).toBe(0);
  });

  it("counts correctly under concurrency (no lost updates)", async () => {
    await Promise.all(Array.from({ length: 20 }, () => recordFailure("burst")));
    expect(await hits("burst")).toBe(20);
  });

  it("clearFailures resets a key (e.g. after a successful login)", async () => {
    await recordFailure("email:x");
    await clearFailures("email:x");
    expect(await hits("email:x")).toBe(0);
  });

  it("starts a fresh count when the window rolls over", async () => {
    await recordFailure("k", 60);
    expect(await hits("k", 60)).toBe(1);
    // Simulate the old window: move its start into the past.
    await query("update rate_limits set window_start = window_start - interval '2 minutes' where key = 'k'");
    expect(await hits("k", 60)).toBe(0);
    expect(await recordFailure("k", 60)).toBe(1);
  });

  it("purges counters from old windows only", async () => {
    await recordFailure("old");
    await recordFailure("new");
    await query("update rate_limits set window_start = now() - interval '3 days' where key = 'old'");
    expect(await purgeRateLimits(24)).toBe(1);
    expect(await hits("new")).toBe(1);
  });
});
