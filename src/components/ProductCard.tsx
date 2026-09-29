import Link from "next/link";
import { ImageSlot } from "./ImageSlot";
import { discountPct, type ShopProduct } from "@/lib/products-catalog";
import { formatPrice } from "@/lib/format-price";

export function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  const full = Math.round(rating);
  return (
    <div className="stars" style={{ display: "inline-flex", gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < full ? "#F5A623" : "none"} stroke="#F5A623" strokeWidth={i < full ? 0 : 1.5}>
          <path d="M12 2l3 6.6 7 .7-5.3 4.7 1.6 6.9L12 17.3 5.7 20.9l1.6-6.9L2 9.3l7-.7Z" />
        </svg>
      ))}
    </div>
  );
}

export function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M20.8 7.6c0 4.4-8.8 10.8-8.8 10.8S3.2 12 3.2 7.6a4.6 4.6 0 0 1 8.8-1.9 4.6 4.6 0 0 1 8.8 1.9Z" />
    </svg>
  );
}

export function CompareIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M7 3v18M17 3v18M4 9h6M14 15h6" />
    </svg>
  );
}

export function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function ProductCard({ product, view = "grid" }: { product: ShopProduct; view?: "grid" | "list" }) {
  const pct = discountPct(product);
  return (
    <div className="sr-card">
      <div className="sr-media">
        {pct ? <span className="sr-deal-pct">-{pct}%</span> : null}
        <div className="sr-icon-stack">
          <button type="button" className="sr-wish" aria-label="Add to wishlist">
            <HeartIcon />
          </button>
          <button type="button" className="sr-compare" aria-label="Compare">
            <CompareIcon />
          </button>
          <button type="button" className="sr-quickview" aria-label="Quick view">
            <EyeIcon />
          </button>
        </div>
        <Link href={`/products/${product.id}`} className="sr-media-link" aria-label={product.name}>
          <ImageSlot src={product.image} alt={product.name} shape="rect" />
        </Link>
        <div className="sr-quick">Quick View</div>
      </div>
      <div className="sr-body">
        <Link href={`/products/${product.id}`} className="sr-title-link">
          <p className="sr-title">{product.name}</p>
        </Link>
        <div className="sr-meta">
          <span className="sr-rating">
            <StarRow rating={product.rating} size={12} />
          </span>
          {view === "grid" ? <span>({product.reviewCount})</span> : null}
        </div>
        <div className="sr-price-row">
          {product.originalPrice ? <span className="sr-was">{formatPrice(product.originalPrice)}</span> : null}
          <span className="sr-price">{formatPrice(product.price)}</span>
        </div>
        {view === "list" ? <p className="sr-desc">{product.description}</p> : null}
        <button type="button" className="sr-cta">
          {product.action}
        </button>
      </div>
    </div>
  );
}
