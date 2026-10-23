import { z } from "zod";
import { adminClient, userFromAccessToken } from "@/server/customer-auth";
import { handle, HttpError, json, parseBody } from "@/server/http";

const schema = z.object({
  access_token: z.string().min(20).max(4000),
  password: z.string().min(8, "Password must be at least 8 characters.").max(72),
});

const RECOVERY_WINDOW_S = 15 * 60;

/** Sets a new password using the short-lived token from a password-reset email. */
export const POST = handle(async (request: Request) => {
  const { access_token, password } = await parseBody(request, schema);
  const user = await userFromAccessToken(access_token, { cache: false });

  // A reset link yields a session proven by an emailed one-time code ("otp"). A normal password
  // session must NOT be able to reset the password without knowing the current one.
  let fresh = false;
  try {
    const amr = (JSON.parse(Buffer.from(access_token.split(".")[1], "base64url").toString()).amr ?? []) as {
      method: string;
      timestamp: number;
    }[];
    const now = Math.floor(Date.now() / 1000);
    fresh = amr.some((a) => a.method === "otp" && now - a.timestamp < RECOVERY_WINDOW_S);
  } catch {
    fresh = false;
  }
  if (!user || !fresh) throw new HttpError(401, "This reset link is invalid or has expired. Request a new one.");

  const { error } = await adminClient().auth.admin.updateUserById(user.id, { password });
  if (error) throw new HttpError(400, error.message);
  // Supabase revokes all existing sessions on a password change, so the caller signs in again afterwards.
  return json({ ok: true });
});
