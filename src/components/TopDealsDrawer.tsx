"use client";

import { useEffect } from "react";
import { useUI } from "./UIProvider";
import { ImageSlot } from "./ImageSlot";
import { useStoreData } from "@/lib/store-context";
import { formatProductPrice } from "@/lib/format-price";

const TOP_DEAL_IDS = [
  "wheel-cover-universal",
  "omp-steering-spacer",
  "th8s-shifter",
  "wheel-cover-black-yellow",
  "led-projector-headlights",
];


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
  const { featured: FEATURED_PRODUCTS } = useStoreData();
  const TOP_DEAL_PRODUCTS = FEATURED_PRODUCTS.slice(0, TOP_DEAL_IDS.length);
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
                <span className="topdeal-price">{formatProductPrice(product)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
