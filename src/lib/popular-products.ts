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

export const POPULAR_PRODUCTS: PopularProduct[] = [
  {
    id: "engine-oil-filter-extra",
    name: "Engine Oil Filter Extra Capacity For Motors",
    rating: 5,
    price: 19,
    originalPrice: 24,
    discountPct: 21,
    ctaLabel: "Add To Cart",
  },
  {
    id: "auto-vox-dash-cam",
    name: "AUTO-VOX 9.8ft Extension Cord Dash Cam Rear",
    rating: 5,
    priceRange: [30, 60],
    ctaLabel: "View Products",
  },
  {
    id: "honda-pilot-radio",
    name: "Flexible Honda Pilot Radio 6 Disc Cd Player",
    rating: 5,
    price: 135,
    originalPrice: 140,
    discountPct: 4,
    ctaLabel: "Add To Cart",
  },
  {
    id: "yamaha-vino-brake-pads",
    name: "Front Brake Disk + Brake pads for Yamaha VINO",
    rating: 5,
    price: 110,
    ctaLabel: "Add To Cart",
  },
  {
    id: "th8s-shifter",
    name: "Thrustmaster TH8S Shifter Add-On Mannual Ge",
    rating: 5,
    price: 40,
    ctaLabel: "Add To Cart",
  },
];
