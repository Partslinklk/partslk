import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file." }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Only PNG, JPG, WebP or GIF images." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be under 5 MB." }, { status: 400 });

  const base = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "image";
  const name = `${base}-${Date.now().toString(36)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/uploads/${name}` });
}
