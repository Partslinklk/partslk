import { logAudit, requireAdmin } from "@/server/admin";
import { handle, HttpError, json } from "@/server/http";
import { sniffImage, uploadImage } from "@/server/storage";

const MAX_BYTES = 5 * 1024 * 1024;

export const POST = handle(async (request: Request) => {
  const admin = await requireAdmin(request, "manager");
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "No file.");
  if (file.size > MAX_BYTES) throw new HttpError(400, "Image must be under 5 MB.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(bytes);
  if (!type) throw new HttpError(400, "Only PNG, JPG, WebP or GIF images.");

  const base = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "image";
  const path = `products/${base}-${Date.now().toString(36)}.${type.ext}`;
  const url = await uploadImage(path, bytes, type);
  await logAudit(admin, "upload.image", "image", path, { url });
  return json({ url, path });
});
