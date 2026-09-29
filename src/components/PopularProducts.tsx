"use client";

import { ImageSlot } from "./ImageSlot";
import { CompareIcon, EyeIcon, HeartIcon } from "./ProductCard";
import { POPULAR_PRODUCTS, type PopularProduct } from "@/lib/popular-products";
import { formatPrice, formatProductPrice } from "@/lib/format-price";

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function StarRow({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <div className="pp-star-row">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" fill={i < full ? "#F5A623" : "none"} stroke="#F5A623" strokeWidth={i < full ? 0 : 1.5}>
          <path d="M12 2l3 6.6 7 .7-5.3 4.7 1.6 6.9L12 17.3 5.7 20.9l1.6-6.9L2 9.3l7-.7Z" />
        </svg>
      ))}
    </div>
  );
}

function ProductCard({ product }: { product: PopularProduct }) {
  return (
    <div className="pp-card">
      <div className="pp-media">
        {product.discountPct ? <span className="pp-badge">-{product.discountPct}%</span> : null}
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
        <ImageSlot src={product.image} alt={product.name} shape="rect" />
        <div className="sr-quick">Quick View</div>
      </div>
      <div className="pp-body">
        <p className="pp-name">{product.name}</p>
        <StarRow rating={product.rating} />
        <div className="pp-price">
          {product.originalPrice ? <span className="pp-price-was">{formatPrice(product.originalPrice)}</span> : null}
          <span className="pp-price-now">{formatProductPrice(product)}</span>
        </div>
        <button type="button" className="pp-cta">
          {product.ctaLabel}
        </button>
      </div>
    </div>
  );
}

export function PopularProducts() {
  return (
    <section className="pp">
      <div className="wrap">
        <div className="pp-head">
          <h2>Popular Products</h2>
          <div className="dow-nav">
            <button type="button" className="arrow-btn" aria-label="Previous products">
              <ChevronLeft />
            </button>
            <button type="button" className="arrow-btn" aria-label="Next products">
              <ChevronRight />
            </button>
          </div>
        </div>
        <div className="pp-grid">
          {POPULAR_PRODUCTS.map((product) => (
            <ProductCard product={product} key={product.id} />
          ))}
        </div>
      </div>
    </section>
  );
}
