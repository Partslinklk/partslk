import { logAudit, requireAdmin } from "@/server/admin";
import { createResource, listResource } from "@/server/catalog";
import { handle, HttpError, json, parseBody } from "@/server/http";
import { refreshStorefront } from "@/server/revalidate";
import { isResource, schemas } from "@/server/validation/catalog";

// The proxy is the first gate for /api/admin; requireAdmin re-checks the session and role.
export const GET = handle(async (request: Request, ctx: RouteContext<"/api/admin/[resource]">) => {
  await requireAdmin(request, "staff");
  const { resource } = await ctx.params;
  if (!isResource(resource)) throw new HttpError(404, "Unknown resource.");
  return json(await listResource(resource));
});

export const POST = handle(async (request: Request, ctx: RouteContext<"/api/admin/[resource]">) => {
  const admin = await requireAdmin(request, "manager");
  const { resource } = await ctx.params;
  if (!isResource(resource)) throw new HttpError(404, "Unknown resource.");
  const item = (await parseBody(request, schemas[resource])) as Record<string, unknown>;
  if (!(await createResource(resource, item))) throw new HttpError(409, `"${item.id}" already exists.`);
  await logAudit(admin, `${resource}.create`, resource, item.id as string, { after: item });
  refreshStorefront();
  return json(item, { status: 201 });
});
