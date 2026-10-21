import { promises as fs } from "fs";
import path from "path";

/**
 * Tiny JSON-file store. Every collection lives in data/<name>.json.
 * Local/self-hosted only — hosts with a read-only file system (e.g. Vercel)
 * need a real database instead.
 */
const DATA_DIR = path.join(process.cwd(), "data");

export const COLLECTIONS = [
  "products",
  "categories",
  "brands",
  "makes",
  "deals",
  "featured",
  "popular",
  "testimonials",
  "orders",
] as const;
export type CollectionName = (typeof COLLECTIONS)[number];

export function isCollection(name: string): name is CollectionName {
  return (COLLECTIONS as readonly string[]).includes(name);
}

export type Category = { id: string; name: string; image: string; links: string[]; featured: boolean };
export type Brand = { id: string; name: string };
export type Make = { id: string; name: string; logo: string };
export type Deal = {
  id: string;
  name: string;
  image: string;
  rating: number;
  price: number;
  originalPrice: number;
  endsAt: string;
};
export type ListedProduct = {
  id: string;
  name: string;
  image: string;
  rating: number;
  price: number;
  /** 0 = single price, otherwise shown as a price range price – priceMax */
  priceMax: number;
  originalPrice?: number;
  ctaLabel: string;
};
export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  meta: string;
  rating: number;
  avatar: string;
};
export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
export const ORDER_STATUSES: OrderStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled"];
export type Order = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  customer: { firstName: string; lastName: string; email: string; phone: string };
  address: { country: string; address: string; city: string; postcode: string };
  items: { id: string; name: string; price: number; qty: number; image: string }[];
  shipping: { label: string; cost: number };
  payment: string;
  note: string;
  subtotal: number;
  total: number;
};

const file = (name: CollectionName) => path.join(DATA_DIR, `${name}.json`);

export async function readCollection<T = unknown>(name: CollectionName): Promise<T[]> {
  try {
    return JSON.parse(await fs.readFile(file(name), "utf8")) as T[];
  } catch {
    return [];
  }
}

// Serialise writes so concurrent saves can't interleave.
let queue: Promise<unknown> = Promise.resolve();

export function writeCollection<T>(name: CollectionName, items: T[]): Promise<void> {
  const run = async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${file(name)}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(items, null, 2) + "\n", "utf8");
    await fs.rename(tmp, file(name));
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}
