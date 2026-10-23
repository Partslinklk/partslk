import { z } from "zod";

export const RESOURCES = [
  "products",
  "categories",
  "brands",
  "makes",
  "deals",
  "featured",
  "popular",
  "testimonials",
] as const;
export type ResourceName = (typeof RESOURCES)[number];
export const isResource = (name: string): name is ResourceName => (RESOURCES as readonly string[]).includes(name);

const RESERVED_IDS = ["reorder"];

export const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers and dashes only.")
  .refine((v) => !RESERVED_IDS.includes(v), "That id is reserved.");

const text = (max: number) => z.string().trim().max(max);
const name = text(200).min(1, "Name is required.");
const url = text(500).default("");
// Gallery images: a site path (/uploads/x.png) or an http(s) URL, without characters that could break out of a CSS url("...").
const imageUrl = z
  .string()
  .trim()
  .max(500)
  .regex(/^(\/[^\s"'()\\]*|https?:\/\/[^\s"'()\\]+)$/, "Use an image path like /photo.png or a full https:// address.");
const money = z.number().min(0).max(1_000_000);
const rating = z.number().min(0).max(5);
const list = z
  .array(z.string())
  .max(100)
  .transform((a) => a.map((s) => s.trim()).filter(Boolean));
const isoDate = z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date.");

const productBase = z.object({
  id: idSchema,
  name,
  image: url,
  /** All photos, cover first. Optional: when omitted the single `image` is the whole gallery. */
  images: z.array(imageUrl).max(12, "At most 12 images.").default([]),
  description: text(5000).default(""),
  categories: list.default([]),
  brand: text(200).default(""),
  colors: list.default([]),
  size: z.enum(["Small", "Medium"]).default("Medium"),
  price: money,
  originalPrice: money.nullish(),
  rating: rating.default(0),
  reviewCount: z.number().int().min(0).default(0),
  action: z.enum(["Add To Cart", "Select Options", "Buy Product", "View Products"]).default("Add To Cart"),
  highlight: z.enum(["best-seller", "new-arrival"]).nullish(),
  stock: z.number().int().min(0).default(0),
  published: z.boolean().default(true),
  sku: text(80).nullish(),
});

/** The gallery is the source of truth: the cover (`image`) is always its first photo, and a lone `image` becomes a one-photo gallery. */
export const productSchema = productBase
  .superRefine((p, ctx) => {
    if (!p.images.length && p.image && !imageUrl.safeParse(p.image).success) {
      ctx.addIssue({ code: "custom", path: ["image"], message: "Use an image path like /photo.png or a full https:// address." });
    }
  })
  .transform((p) => {
    const images = [...new Set(p.images)];
    if (!images.length && p.image) images.push(p.image);
    return { ...p, images, image: images[0] ?? "" };
  });

export const categorySchema = z.object({
  id: idSchema,
  name,
  image: url,
  links: list.default([]),
  featured: z.boolean().default(false),
});

export const brandSchema = z.object({ id: idSchema, name });

export const makeSchema = z.object({ id: idSchema, name, logo: url });

// Homepage sections link to an existing product (`id` = the product's id). Everything else about the item is
// read live from the product, so the only things stored here are the deal price and end time.
export const dealSchema = z.object({
  id: idSchema,
  /** The deal price (the product's regular price is shown struck through). */
  price: money,
  endsAt: isoDate,
});

export const featuredSchema = z.object({ id: idSchema });
export const popularSchema = z.object({ id: idSchema });

export const testimonialSchema = z.object({
  id: idSchema,
  quote: text(2000).min(1, "Quote is required."),
  name,
  meta: text(200).default(""),
  rating: rating.default(5),
  avatar: url,
});

export const schemas = {
  products: productSchema,
  categories: categorySchema,
  brands: brandSchema,
  makes: makeSchema,
  deals: dealSchema,
  featured: featuredSchema,
  popular: popularSchema,
  testimonials: testimonialSchema,
} as const;

export const reorderSchema = z.object({ ids: z.array(z.string()).max(1000) });

export const orderStatusSchema = z.object({
  status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
});

/** Public product search query (?q=&category=&brand=&color=&min=&max=&sort=&page=&limit=). */
export const productQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  brand: z.string().trim().max(200).optional(),
  color: z.string().trim().max(50).optional(),
  min: z.coerce.number().min(0).optional(),
  max: z.coerce.number().min(0).optional(),
  sort: z.enum(["position", "price_asc", "price_desc", "rating", "newest", "name"]).default("position"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});
