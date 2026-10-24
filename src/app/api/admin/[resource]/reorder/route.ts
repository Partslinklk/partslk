import { logAudit, requireAdmin } from "@/server/admin";
import { reorderResource } from "@/server/catalog";
import { handle, HttpError, json, parseBody } from "@/server/http";
import { refreshStorefront } from "@/server/revalidate";
import { isResource, reorderSchema } from "@/server/validation/catalog";

export const PUT = handle(async (request: Request, ctx: RouteContext<"/api/admin/[resource]/reorder">) => {
  const admin = await requireAdmin(request);
  const { resource } = await ctx.params;
  if (!isResource(resource)) throw new HttpError(404, "Unknown resource.");
  const { ids } = await parseBody(request, reorderSchema);
  await reorderResource(resource, ids);
  await logAudit(admin, `${resource}.reorder`, resource, null, { ids });
  refreshStorefront();
  return json({ ok: true });
});
