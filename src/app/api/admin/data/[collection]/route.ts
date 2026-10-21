import { NextResponse } from "next/server";
import { isCollection, readCollection, writeCollection } from "@/lib/db";

// Auth is enforced by src/proxy.ts for everything under /api/admin.
export async function GET(_req: Request, ctx: RouteContext<"/api/admin/data/[collection]">) {
  const { collection } = await ctx.params;
  if (!isCollection(collection)) return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
  return NextResponse.json(await readCollection(collection));
}

export async function PUT(request: Request, ctx: RouteContext<"/api/admin/data/[collection]">) {
  const { collection } = await ctx.params;
  if (!isCollection(collection)) return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
  const items = await request.json().catch(() => null);
  if (!Array.isArray(items) || items.some((i) => typeof i !== "object" || i === null || typeof i.id !== "string" || !i.id)) {
    return NextResponse.json({ error: "Expected an array of items that each have an id." }, { status: 400 });
  }
  const ids = new Set(items.map((i) => i.id));
  if (ids.size !== items.length) return NextResponse.json({ error: "Duplicate ids." }, { status: 400 });
  await writeCollection(collection, items);
  return NextResponse.json({ ok: true });
}
