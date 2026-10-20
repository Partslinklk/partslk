import Link from "next/link";
import { ImageSlot } from "./ImageSlot";
import { CATEGORY_OPTIONS } from "@/lib/products-catalog";

const CATEGORY_IMAGES: Record<string, string> = {
  headlights: "/hero-headlights-banner.png",
  "seat-cover": "/product-2.png",
  "engine-oil": "/product-3.png",
  "ferrari-wheel": "/product-4.png",
  "gear-oil": "/product-5.png",
  "wheels-tires": "/product-10.png",
  "brake-parts": "/car-brake-banner.jpg",
  "special-offer": "/hero-main-slide.png",
};

export function CategoriesPage() {
  return (
    <>
      <div className="vc-crumbband">
        <div className="wrap">
          <div className="sr-crumb">
            <Link href="/">Home</Link>
            <span>›</span>
            <span className="crumb-now">Vehicle Categories</span>
          </div>
        </div>
      </div>

      <div className="wrap">
        <h1 className="vc-title">Vehicle Categories</h1>

        <div className="vc-grid">
          {CATEGORY_OPTIONS.map((cat) => (
            <Link href={`/products?category=${cat.id}`} className="vc-card" key={cat.id}>
              <ImageSlot
                src={CATEGORY_IMAGES[cat.id]}
                alt=""
                shape="rect"
                className="vc-card-img"
              />
              <span className="vc-card-name">{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
