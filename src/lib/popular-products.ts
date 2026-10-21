export type PopularProduct = {
  id: string;
  name: string;
  image?: string;
  rating: number;
  price?: number;
  priceRange?: [number, number];
  originalPrice?: number;
  discountPct?: number;
  ctaLabel: string;
};
