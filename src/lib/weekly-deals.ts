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

const DAY = 24 * 60 * 60 * 1000;

export const WEEKLY_DEALS: WeeklyDeal[] = [
  {
    id: "alternator-bosch",
    name: "Alternator Bosch Fits Fordd Hollanndd Models",
    rating: 4,
    price: 115,
    originalPrice: 120,
    endsInMs: 93 * DAY + 18 * 60 * 60 * 1000 + 8 * 60 * 1000 + 6 * 1000,
  },
  {
    id: "brake-caliper-akebono",
    name: "Akebono Performance Front Brake Caliper Set",
    image: "/product-1.png",
    rating: 5,
    price: 189,
    originalPrice: 215,
    endsInMs: 12 * DAY + 6 * 60 * 60 * 1000 + 40 * 60 * 1000,
  },
  {
    id: "radiator-denso",
    name: "Denso Aluminum Radiator Direct Fit Replacement",
    rating: 4,
    price: 142,
    originalPrice: 160,
    endsInMs: 5 * DAY + 2 * 60 * 60 * 1000 + 15 * 60 * 1000,
  },
];

export const FEATURED_PRODUCTS: FeaturedProduct[] = [
  {
    id: "wheel-cover-universal",
    name: "Pilot Automotive Universal Fit Black with Red Trim",
    image: "/product-2.png",
    rating: 5,
    price: 79,
    ctaLabel: "Add To Cart",
  },
  {
    id: "engine-oil-7100",
    name: "Motul 7100 20W-50 API Fully Synthetic Engine Oil",
    image: "/product-3.png",
    rating: 4,
    price: 45,
    ctaLabel: "Add To Cart",
  },
  {
    id: "omp-steering-spacer",
    name: "OMP Car Steering Aluminum Spacer Quick Steering",
    image: "/product-4.png",
    rating: 4,
    price: 289,
    ctaLabel: "Select Options",
  },
  {
    id: "firestone-firehawk",
    name: "Firestone Firehawk Wide Oval AS For Four-Wheelers",
    image: "/product-8.png",
    rating: 4,
    price: 110,
    ctaLabel: "Select Options",
  },
  {
    id: "wheel-cover-black-yellow",
    name: "Black Yellow Wheel Cover 13 Inch For Four-Wheel",
    image: "/product-6.png",
    rating: 4,
    price: 130,
    ctaLabel: "Buy Product",
  },
  {
    id: "auto-vox-dash-cam",
    name: "AUTO-VOX 9.8ft Extension Cord Dash Cam Rear",
    rating: 5,
    priceRange: [30, 60],
    ctaLabel: "View Products",
  },
  {
    id: "led-projector-headlights",
    name: "Autoparts LED Black Projector Headlights",
    rating: 5,
    priceRange: [189, 192],
    ctaLabel: "Select Options",
  },
  {
    id: "car-alarm-tx100",
    name: "Technaxx Car Alarm With Charging Function TX-100",
    image: "/product-7.png",
    rating: 4,
    price: 38,
    ctaLabel: "Add To Cart",
  },
  {
    id: "th8s-shifter",
    name: "Thrustmaster TH8S Shifter Add-On Manual Gearbox",
    rating: 5,
    price: 40,
    ctaLabel: "Add To Cart",
  },
  {
    id: "roof-rack-crossbar",
    name: "Universal Aluminum Roof Rack Cross Bar Set",
    rating: 4,
    price: 98,
    ctaLabel: "Buy Product",
  },
  {
    id: "floor-mats-allweather",
    name: "All-Weather Heavy Duty Floor Mats Full Set",
    rating: 5,
    price: 64,
    ctaLabel: "Add To Cart",
  },
  {
    id: "brake-pad-ceramic",
    name: "Ceramic Brake Pad Set Front and Rear",
    image: "/product-9.png",
    rating: 4,
    priceRange: [55, 89],
    ctaLabel: "Select Options",
  },
];
