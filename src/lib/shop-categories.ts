export type ShopCategory = {
  id: string;
  name: string;
  image?: string;
  links: string[];
};

export const SHOP_CATEGORIES: ShopCategory[] = [
  {
    id: "seat-cover",
    name: "Seat Cover",
    links: ["Car Seats", "Fuel", "Gearbox", "Steering Parts"],
  },
  {
    id: "headlights",
    name: "Headlights",
    links: ["Bumpers", "Dash Cam", "Grills", "Headlight"],
  },
  {
    id: "ferrari-wheel",
    name: "Ferrari Wheel",
    image: "/product-4.png",
    links: ["Alloy Wheels", "Forged Wheels", "Retro Polka", "Steel Wheels"],
  },
  {
    id: "engine-oil",
    name: "Engine Oil",
    image: "/product-3.png",
    links: ["Brake Parts", "Engine", "Spark Plug", "Transmission"],
  },
  {
    id: "gear-oil",
    name: "Gear oil",
    links: ["Airbag Sensors", "Camshaft", "Coolant Sensors", "Proximity Sensor"],
  },
  {
    id: "wheels-tires",
    name: "Wheels & Tires",
    image: "/product-10.png",
    links: ["Ammeter", "Caliper", "Clinometer", "Dynamometer"],
  },
];
