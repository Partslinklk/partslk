import { timingSafeEqual } from "crypto";
import { env } from "./env";
import { HttpError } from "./http";

/** Vercel Cron calls /api/cron/* with `Authorization: Bearer $CRON_SECRET`. Throws 503/401 otherwise. */
export function requireCron(request: Request) {
  const secret = env().CRON_SECRET;
  if (!secret) throw new HttpError(503, "CRON_SECRET isn't configured.");
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new HttpError(401, "Unauthorized");
}
