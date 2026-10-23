import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { query } from "@/server/db";
import { isReservedEmailDomain, queueEmail } from "@/server/email";
import { closeDb, resetDb } from "./helpers";

beforeEach(resetDb);
afterAll(closeDb);

const mail = (to: string) => ({ kind: "test", to, subject: "Hi", html: "<p>Hi</p>", text: "Hi" });

async function settled(id: string) {
  for (let i = 0; i < 50; i++) {
    const row = (await query<{ status: string; last_error: string | null }>("select status, last_error from email_outbox where id = $1", [id])).rows[0];
    if (row.status !== "pending" && row.status !== "sending") return row;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("email never left the pending state");
}

describe("email outbox", () => {
  it("recognises reserved test domains", () => {
    for (const e of ["a@example.com", "a@EXAMPLE.org", "a@shop.example.net", "a@x.test", "a@mail.invalid", "a@localhost", "a@host.local"]) {
      expect(isReservedEmailDomain(e), e).toBe(true);
    }
    for (const e of ["a@gmail.com", "a@partslinkstore.lk", "a@notexample.com", "a@mytest.io"]) {
      expect(isReservedEmailDomain(e), e).toBe(false);
    }
  });

  it("records mail to a reserved domain but never sends it", async () => {
    const id = (await queueEmail(mail("buyer@example.com")))!;
    expect(await settled(id)).toEqual({ status: "skipped", last_error: expect.stringContaining("Reserved test domain") });
  });

  it("is skipped (not failed) when no email provider is configured", async () => {
    const id = (await queueEmail(mail("someone@gmail.com")))!;
    expect(await settled(id)).toEqual({ status: "skipped", last_error: expect.stringContaining("isn't configured") });
  });
});
