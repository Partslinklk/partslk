import { z } from "zod";
import { isThrottled, recordFailure } from "@/server/admin";
import { query } from "@/server/db";
import { adminClient, authClient, requireCustomer, setSession } from "@/server/customer-auth";
import { handle, HttpError, json, parseBody } from "@/server/http";

export const GET = handle(async () => json(await requireCustomer()));

const patchSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(50).optional(),
  currentPassword: z.string().max(200).optional(),
  newPassword: z.string().min(8, "Password must be at least 8 characters.").max(72).optional(),
});

/** Update profile fields and/or change the password (needs the current password). Email changes aren't supported yet. */
export const PATCH = handle(async (request: Request) => {
  const me = await requireCustomer();
  const body = await parseBody(request, patchSchema);

  if (body.newPassword) {
    const key = `pw-change:${me.id}`;
    if (await isThrottled(key, 5)) throw new HttpError(429, "Too many attempts. Try again later.");
    if (!body.currentPassword) throw new HttpError(400, "Enter your current password to set a new one.", { currentPassword: "Required." });
    const check = await authClient().auth.signInWithPassword({ email: me.email, password: body.currentPassword });
    if (check.error) {
      await recordFailure(key);
      throw new HttpError(400, "Your current password is incorrect.", { currentPassword: "Incorrect password." });
    }
    const { error } = await adminClient().auth.admin.updateUserById(me.id, { password: body.newPassword });
    if (error) throw new HttpError(400, error.message);
    // Supabase revokes every session on a password change (including this one), so sign back in.
    const fresh = await authClient().auth.signInWithPassword({ email: me.email, password: body.newPassword });
    if (fresh.data.session) await setSession(fresh.data.session);
  }

  const { rows } = await query<{ id: string; email: string; first_name: string; last_name: string; phone: string }>(
    `update customers set first_name = coalesce($2, first_name), last_name = coalesce($3, last_name),
            phone = coalesce($4, phone) where id = $1 returning id, email, first_name, last_name, phone`,
    [me.id, body.firstName ?? null, body.lastName ?? null, body.phone ?? null],
  );
  const r = rows[0];
  return json({ id: r.id, email: r.email, firstName: r.first_name, lastName: r.last_name, phone: r.phone });
});
