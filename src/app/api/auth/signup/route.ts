import { z } from "zod";
import { clearFailures, clientIp, isThrottled, recordFailure } from "@/server/admin";
import { authClient, getCustomer, setSession, siteUrl } from "@/server/customer-auth";
import { handle, HttpError, json, parseBody } from "@/server/http";

const schema = z.object({
  email: z.email().trim().toLowerCase().max(200),
  password: z.string().min(8, "Password must be at least 8 characters.").max(72),
  firstName: z.string().trim().min(1, "First name is required.").max(100),
  lastName: z.string().trim().max(100).default(""),
});

export const POST = handle(async (request: Request) => {
  const body = await parseBody(request, schema);
  const key = `signup:${clientIp(request)}`;
  if (await isThrottled(key, 10)) throw new HttpError(429, "Too many sign-up attempts. Try again later.");
  await recordFailure(key); // counts every attempt, successful or not

  const { data, error } = await authClient().auth.signUp({
    email: body.email,
    password: body.password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback`,
      data: { first_name: body.firstName, last_name: body.lastName },
    },
  });
  if (error) {
    if (error.status === 429) throw new HttpError(429, "Too many emails requested. Try again in a little while.");
    throw new HttpError(400, error.message);
  }

  // Email confirmation on: no session yet (and an existing address looks identical, so accounts can't be enumerated).
  if (!data.session) return json({ ok: true, needsVerification: true });

  await setSession(data.session);
  await clearFailures(key);
  return json({ ok: true, needsVerification: false, customer: await getCustomer() });
});
