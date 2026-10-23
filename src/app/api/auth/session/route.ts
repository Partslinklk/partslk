import { z } from "zod";
import { getCustomer, setSession, tokenTtl, userFromAccessToken } from "@/server/customer-auth";
import { handle, HttpError, json, parseBody } from "@/server/http";

const schema = z.object({ access_token: z.string().min(20).max(4000), refresh_token: z.string().min(5).max(500) });

/**
 * Turns the tokens Supabase puts in the URL hash after an email-verification link into our
 * httpOnly session cookies. The access token is verified with Supabase before it is accepted.
 */
export const POST = handle(async (request: Request) => {
  const tokens = await parseBody(request, schema);
  if (!(await userFromAccessToken(tokens.access_token, { cache: false }))) throw new HttpError(401, "This link is invalid or has expired.");
  await setSession({ ...tokens, expires_in: tokenTtl(tokens.access_token) });
  return json({ ok: true, customer: await getCustomer() });
});
