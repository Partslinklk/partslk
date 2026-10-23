import { z } from "zod";
import { clearFailures, clientIp, isThrottled, recordFailure } from "@/server/admin";
import { authClient, getCustomer, setSession } from "@/server/customer-auth";
import { handle, HttpError, json, parseBody } from "@/server/http";

const schema = z.object({ email: z.string().trim().toLowerCase().max(200), password: z.string().max(200) });

export const POST = handle(async (request: Request) => {
  const { email, password } = await parseBody(request, schema);
  const ipKey = `cust-ip:${clientIp(request)}`;
  const emailKey = `cust-email:${email}`;
  if ((await isThrottled(ipKey, 30)) || (await isThrottled(emailKey, 5))) {
    throw new HttpError(429, "Too many attempts. Try again in a few minutes.");
  }

  const { data, error } = await authClient().auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    if (error?.code === "email_not_confirmed") {
      throw new HttpError(403, "Please verify your email first — check your inbox for the confirmation link.");
    }
    await recordFailure(ipKey);
    await recordFailure(emailKey);
    throw new HttpError(401, "Invalid email or password.");
  }

  await clearFailures(emailKey);
  await setSession(data.session);
  return json({ ok: true, customer: await getCustomer() });
});
