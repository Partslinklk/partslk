import { z } from "zod";
import { clientIp, isThrottled, recordFailure } from "@/server/admin";
import { authClient, siteUrl } from "@/server/customer-auth";
import { handle, HttpError, json, parseBody } from "@/server/http";

const schema = z.object({ email: z.email().trim().toLowerCase().max(200) });

/** Always answers ok, so the endpoint can't be used to find out which emails have accounts. */
export const POST = handle(async (request: Request) => {
  const { email } = await parseBody(request, schema);
  const ipKey = `forgot-ip:${clientIp(request)}`;
  const emailKey = `forgot-email:${email}`;
  if ((await isThrottled(ipKey, 10)) || (await isThrottled(emailKey, 3))) {
    throw new HttpError(429, "Too many requests. Try again later.");
  }
  await recordFailure(ipKey);
  await recordFailure(emailKey);

  const { error } = await authClient().auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/auth/callback` });
  if (error?.status === 429) throw new HttpError(429, "Too many emails requested. Try again in a little while.");
  if (error) console.error("resetPasswordForEmail failed", error.message);
  return json({ ok: true });
});
