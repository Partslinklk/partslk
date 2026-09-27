"use client";

import Link from "next/link";
import { useState } from "react";
import { ImageSlot } from "./ImageSlot";
import { SHOP_CATEGORIES } from "@/lib/shop-categories";

const PAGE_SIZE = 6;

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

export function ShopByCategories() {
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(SHOP_CATEGORIES.length / PAGE_SIZE);
  const visible = SHOP_CATEGORIES.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <section className="shop-cat">
      <div className="wrap">
        <div className="dow-head">
          <h2>Shop By Categories</h2>
          <div className="dow-nav">
            <button
              type="button"
              className="arrow-btn"
              disabled={pageCount <= 1}
              onClick={() => setPage((p) => (p - 1 + pageCount) % pageCount)}
              aria-label="Previous categories"
            >
              <ChevronLeft />
            </button>
            <button
              type="button"
              className="arrow-btn"
              disabled={pageCount <= 1}
              onClick={() => setPage((p) => (p + 1) % pageCount)}
              aria-label="Next categories"
            >
              <ChevronRight />
            </button>
          </div>
        </div>

        <div className="shop-cat-grid">
          {visible.map((cat) => (
            <div className="shop-cat-card" key={cat.id}>
              <div className="shop-cat-media">
                <ImageSlot src={cat.image} alt={cat.name} shape="rect" />
              </div>
              <div className="shop-cat-body">
                <p className="shop-cat-title">{cat.name}</p>
                <div className="shop-cat-links">
                  {cat.links.map((link) => (
                    <Link href="/products" key={link}>
                      {link}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
