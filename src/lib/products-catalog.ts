export type ProductAction = "Add To Cart" | "Select Options" | "Buy Product" | "View Products";
export type ProductHighlight = "best-seller" | "new-arrival";

export type ShopProduct = {
  id: string;
  name: string;
  /** Cover photo (always the first of `images`). */
  image: string;
  /** Every photo of the product, cover first (front, back, sides...). */
  images?: string[];
  description: string;
  categories: string[];
  brand: string;
  colors: string[];
  size: "Small" | "Medium";
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  action: ProductAction;
  highlight?: ProductHighlight;
  /** Units in stock (admin-managed). */
  stock?: number;
  /** Hidden from the storefront when false. */
  published?: boolean;
};

export type CategoryOption = { id: string; name: string };
export type ColorOption = { id: string; name: string; hex: string };
export type PriceBand = { id: string; label: string; min: number; max: number };

export const COLOR_OPTIONS: ColorOption[] = [
  { id: "black", name: "Black", hex: "#1a1a1a" },
  { id: "blue", name: "Blue", hex: "#2f6fed" },
  { id: "gray", name: "Gray", hex: "#9598a6" },
  { id: "orange", name: "Orange", hex: "#f5821f" },
  { id: "red", name: "Red", hex: "#e0342c" },
  { id: "white", name: "White", hex: "#ffffff" },
  { id: "yellow", name: "Yellow", hex: "#f5c518" },
];

export const SIZE_OPTIONS = ["Small", "Medium"] as const;

export const PRICE_BANDS: PriceBand[] = [
  { id: "under-50", label: "Under LKR 50", min: 0, max: 50 },
  { id: "50-100", label: "LKR 50 - LKR 100", min: 50, max: 100 },
  { id: "100-200", label: "LKR 100 - LKR 200", min: 100, max: 200 },
  { id: "200-300", label: "LKR 200 - LKR 300", min: 200, max: 300 },
  { id: "300-plus", label: "LKR 300 & Above", min: 300, max: Infinity },
];

export function discountPct(product: ShopProduct): number | null {
  if (!product.originalPrice || product.originalPrice <= product.price) return null;
  return Math.round((1 - product.price / product.originalPrice) * 100);
}
