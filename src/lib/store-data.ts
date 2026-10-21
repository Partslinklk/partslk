import {
  readCollection,
  type Brand,
  type Category,
  type Deal,
  type ListedProduct,
  type Make,
  type Testimonial,
} from "./db";
import type { CategoryOption, ShopProduct } from "./products-catalog";
import type { ShopCategory } from "./shop-categories";
import type { PopularProduct } from "./popular-products";
import type { FeaturedProduct, WeeklyDeal } from "./weekly-deals";

export type StoreData = {
  products: ShopProduct[];
  categories: CategoryOption[];
  shopCategories: ShopCategory[];
  brands: string[];
  weeklyDeals: WeeklyDeal[];
  featured: FeaturedProduct[];
  popular: PopularProduct[];
  makes: { src: string; alt: string }[];
  testimonials: Testimonial[];
};

const range = (p: ListedProduct): [number, number] | undefined =>
  p.priceMax && p.priceMax > p.price ? [p.price, p.priceMax] : undefined;

/** Everything the storefront renders, shaped for the existing components. */
export async function getStoreData(): Promise<StoreData> {
  const [products, categories, brands, makes, deals, featured, popular, testimonials] = await Promise.all([
    readCollection<ShopProduct>("products"),
    readCollection<Category>("categories"),
    readCollection<Brand>("brands"),
    readCollection<Make>("makes"),
    readCollection<Deal>("deals"),
    readCollection<ListedProduct>("featured"),
    readCollection<ListedProduct>("popular"),
    readCollection<Testimonial>("testimonials"),
  ]);
  const now = Date.now();

  return {
    products: products.filter((p) => p.published !== false),
    categories: categories.map((c) => ({ id: c.id, name: c.name })),
    shopCategories: categories
      .filter((c) => c.featured)
      .map((c) => ({ id: c.id, name: c.name, image: c.image || undefined, links: c.links })),
    brands: brands.map((b) => b.name),
    weeklyDeals: deals
      .map((d) => ({
        id: d.id,
        name: d.name,
        image: d.image || undefined,
        rating: d.rating,
        price: d.price,
        originalPrice: d.originalPrice || undefined,
        endsInMs: Math.max(0, new Date(d.endsAt).getTime() - now),
      })),
    featured: featured.map((p) => {
      const r = range(p);
      return {
        id: p.id,
        name: p.name,
        image: p.image || undefined,
        rating: p.rating,
        ...(r ? { priceRange: r } : { price: p.price }),
        ctaLabel: p.ctaLabel,
      };
    }),
    popular: popular.map((p) => {
      const r = range(p);
      const orig = p.originalPrice && p.originalPrice > p.price ? p.originalPrice : undefined;
      return {
        id: p.id,
        name: p.name,
        image: p.image || undefined,
        rating: p.rating,
        ...(r ? { priceRange: r } : { price: p.price }),
        originalPrice: orig,
        discountPct: orig ? Math.round((1 - p.price / orig) * 100) : undefined,
        ctaLabel: p.ctaLabel,
      };
    }),
    makes: makes.map((m) => ({ src: m.logo, alt: m.name })),
    testimonials,
  };
}
