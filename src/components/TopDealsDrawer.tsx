"use client";

import { useEffect } from "react";
import { useUI } from "./UIProvider";
import { ImageSlot } from "./ImageSlot";
import { FEATURED_PRODUCTS, type FeaturedProduct } from "@/lib/weekly-deals";

const TOP_DEAL_IDS = [
  "wheel-cover-universal",
  "omp-steering-spacer",
  "th8s-shifter",
  "wheel-cover-black-yellow",
  "led-projector-headlights",
];

const TOP_DEAL_PRODUCTS = TOP_DEAL_IDS.map((id) =>
  FEATURED_PRODUCTS.find((product) => product.id === id)
).filter((product): product is FeaturedProduct => Boolean(product));

function formatPrice(product: FeaturedProduct) {
  if (product.priceRange) {
    const [min, max] = product.priceRange;
    return `$${min} - $${max}`;
  }
  return `$${product.price}`;
}

function StarRow({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <div className="topdeal-star-row">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" fill={i < full ? "#F5A623" : "none"} stroke="#F5A623" strokeWidth={i < full ? 0 : 1.5}>
          <path d="M12 2l3 6.6 7 .7-5.3 4.7 1.6 6.9L12 17.3 5.7 20.9l1.6-6.9L2 9.3l7-.7Z" />
        </svg>
      ))}
    </div>
  );
}

export function TopDealsDrawer() {
  const { topDealsOpen, closeTopDeals } = useUI();

  useEffect(() => {
    if (!topDealsOpen) return;
    document.body.classList.add("topdeal-open");
    return () => document.body.classList.remove("topdeal-open");
  }, [topDealsOpen]);

  return (
    <div
      className={`topdeal-overlay${topDealsOpen ? " open" : ""}`}
      onClick={closeTopDeals}
      aria-hidden={!topDealsOpen}
    >
      <div className="topdeal-drawer" role="dialog" aria-label="Top Deal Products" onClick={(e) => e.stopPropagation()}>
        <div className="topdeal-head">
          <h2>Top Deal Products</h2>
          <button className="topdeal-close" type="button" onClick={closeTopDeals} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2}>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="topdeal-list">
          {TOP_DEAL_PRODUCTS.map((product) => (
            <div className="topdeal-row" key={product.id}>
              <div className="topdeal-media">
                <ImageSlot src={product.image} alt={product.name} shape="rect" />
              </div>
              <div className="topdeal-body">
                <p className="topdeal-name">{product.name}</p>
                <StarRow rating={product.rating} />
                <span className="topdeal-price">{formatPrice(product)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
