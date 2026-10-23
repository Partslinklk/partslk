import { cookies } from "next/headers";
import { ACCESS_COOKIE, adminClient, clearSession } from "@/server/customer-auth";
import { handle, json } from "@/server/http";

export const POST = handle(async () => {
  const access = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (access) {
    // Best effort: also revoke the refresh token server-side so a copied cookie stops working.
    await adminClient().auth.admin.signOut(access, "local").catch(() => undefined);
  }
  await clearSession();
  return json({ ok: true });
});
