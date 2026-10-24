import { logAudit, requireAdmin } from "@/server/admin";
import { getResource, removeResource, updateResource } from "@/server/catalog";
import { handle, HttpError, json, parseBody } from "@/server/http";
import { refreshStorefront } from "@/server/revalidate";
import { isResource, schemas } from "@/server/validation/catalog";

type Ctx = RouteContext<"/api/admin/[resource]/[id]">;

async function target(ctx: Ctx) {
  const { resource, id } = await ctx.params;
  if (!isResource(resource)) throw new HttpError(404, "Unknown resource.");
  return { resource, id };
}

export const GET = handle(async (request: Request, ctx: Ctx) => {
  await requireAdmin(request);
  const { resource, id } = await target(ctx);
  const item = await getResource(resource, id);
  if (!item) throw new HttpError(404, "Not found.");
  return json(item);
});

/** Full replace of the item's fields (optional fields left out are cleared). */
export const PUT = handle(async (request: Request, ctx: Ctx) => {
  const admin = await requireAdmin(request);
  const { resource, id } = await target(ctx);
  const item = (await parseBody(request, schemas[resource])) as Record<string, unknown>;
  if (item.id !== id) throw new HttpError(400, "The id in the body must match the URL.");
  const before = await getResource(resource, id);
  if (!(await updateResource(resource, id, item))) throw new HttpError(404, "Not found.");
  await logAudit(admin, `${resource}.update`, resource, id, { before, after: item });
  refreshStorefront();
  return json(item);
});

export const DELETE = handle(async (request: Request, ctx: Ctx) => {
  const admin = await requireAdmin(request);
  const { resource, id } = await target(ctx);
  const before = await getResource(resource, id);
  if (!(await removeResource(resource, id))) throw new HttpError(404, "Not found.");
  await logAudit(admin, `${resource}.delete`, resource, id, { before });
  refreshStorefront();
  return json({ ok: true });
});
