export type UnsplashPhoto = {
  url: string;
  alt: string;
  credit: string;
};

type SearchResponse = {
  results?: Array<{
    alt_description: string | null;
    urls: { raw: string };
    user: { name: string };
  }>;
};

/**
 * Returns the top Unsplash result for a query, or null if the key is missing
 * or the request fails (callers then fall back to the empty ImageSlot).
 */
export async function getUnsplashPhoto(
  query: string,
  opts: { orientation?: "landscape" | "portrait" | "squarish"; width?: number; index?: number } = {},
): Promise<UnsplashPhoto | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  const { orientation = "squarish", width = 600, index = 0 } = opts;
  const params = new URLSearchParams({
    query,
    orientation,
    per_page: String(index + 1),
    content_filter: "high",
  });

  try {
    const res = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as SearchResponse;
    const hit = data.results?.[index];
    if (!hit) return null;
    return {
      url: `${hit.urls.raw}&w=${width}&h=${width}&fit=crop&q=75&auto=format`,
      alt: hit.alt_description ?? query,
      credit: hit.user.name,
    };
  } catch {
    return null;
  }
}
