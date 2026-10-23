import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";
import { HttpError } from "./http";

let client: SupabaseClient | undefined;

/** Server-side Supabase client (service-role key; never import this from client code). */
function supabase(): SupabaseClient {
  const e = env();
  if (!e.SUPABASE_URL || !e.SUPABASE_SERVICE_ROLE_KEY) {
    throw new HttpError(503, "Image storage isn't configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }
  return (client ??= createClient(e.SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  }));
}

export type ImageType = { ext: "png" | "jpg" | "webp" | "gif"; mime: string };

/** Identifies an image by its first bytes, ignoring the client-supplied type and file name. */
export function sniffImage(b: Uint8Array): ImageType | null {
  const is = (...sig: number[]) => sig.every((v, i) => b[i] === v);
  if (is(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { ext: "png", mime: "image/png" };
  if (is(0xff, 0xd8, 0xff)) return { ext: "jpg", mime: "image/jpeg" };
  if (is(0x47, 0x49, 0x46, 0x38)) return { ext: "gif", mime: "image/gif" };
  if (is(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    return { ext: "webp", mime: "image/webp" };
  }
  return null;
}

/** Uploads to the public bucket and returns its public URL. */
export async function uploadImage(path: string, bytes: Uint8Array, type: ImageType) {
  const bucket = env().SUPABASE_STORAGE_BUCKET;
  const { error } = await supabase().storage.from(bucket).upload(path, bytes, {
    contentType: type.mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return supabase().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
