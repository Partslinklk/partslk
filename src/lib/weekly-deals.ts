export type WeeklyDeal = {
  id: string;
  name: string;
  image?: string;
  rating: number;
  price: number;
  originalPrice?: number;
  endsInMs: number;
};

export type FeaturedProduct = {
  id: string;
  name: string;
  image?: string;
  rating: number;
  price?: number;
  priceRange?: [number, number];
  ctaLabel: string;
};
