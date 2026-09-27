"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageSlot } from "./ImageSlot";
import { WEEKLY_DEALS, FEATURED_PRODUCTS, type FeaturedProduct } from "@/lib/weekly-deals";

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

function StarRow({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <div className="dow-star-row">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" fill={i < full ? "#F5A623" : "none"} stroke="#F5A623" strokeWidth={i < full ? 0 : 1.5}>
          <path d="M12 2l3 6.6 7 .7-5.3 4.7 1.6 6.9L12 17.3 5.7 20.9l1.6-6.9L2 9.3l7-.7Z" />
        </svg>
      ))}
    </div>
  );
}

function formatPrice(product: FeaturedProduct) {
  if (product.priceRange) {
    const [min, max] = product.priceRange;
    return `$${min} - $${max}`;
  }
  return `$${product.price}`;
}

function useCountdown(endsInMs: number) {
  const [remaining, setRemaining] = useState(endsInMs);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { days, hours, minutes, seconds };
  }, [remaining]);
}

function CountdownBoxes({ endsInMs }: { endsInMs: number }) {
  const countdown = useCountdown(endsInMs);
  return (
    <div className="dow-countdown">
      <div className="dow-count-box">
        <strong>{String(countdown.days).padStart(2, "0")}</strong>
        <span>Days</span>
      </div>
      <div className="dow-count-box">
        <strong>{String(countdown.hours).padStart(2, "0")}</strong>
        <span>Hrs</span>
      </div>
      <div className="dow-count-box">
        <strong>{String(countdown.minutes).padStart(2, "0")}</strong>
        <span>Min</span>
      </div>
      <div className="dow-count-box">
        <strong>{String(countdown.seconds).padStart(2, "0")}</strong>
        <span>Sec</span>
      </div>
    </div>
  );
}

function FeaturedRow({ product }: { product: FeaturedProduct }) {
  return (
    <div className="dow-frow">
      <div className="dow-frow-media">
        <ImageSlot src={product.image} alt={product.name} shape="rect" />
      </div>
      <div className="dow-frow-body">
        <p className="dow-frow-name">{product.name}</p>
        <StarRow rating={product.rating} />
        <span className="dow-frow-price">{formatPrice(product)}</span>
        <a className="dow-link" href="#">
          {product.ctaLabel}
        </a>
      </div>
    </div>
  );
}

export function DealOfWeek() {
  const [dealIndex, setDealIndex] = useState(0);
  const [page, setPage] = useState(0);

  const deal = WEEKLY_DEALS[dealIndex];
  const pageCount = Math.ceil(FEATURED_PRODUCTS.length / PAGE_SIZE);
  const visibleFeatured = FEATURED_PRODUCTS.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const prevDeal = () => setDealIndex((i) => (i - 1 + WEEKLY_DEALS.length) % WEEKLY_DEALS.length);
  const nextDeal = () => setDealIndex((i) => (i + 1) % WEEKLY_DEALS.length);
  const prevPage = () => setPage((p) => (p - 1 + pageCount) % pageCount);
  const nextPage = () => setPage((p) => (p + 1) % pageCount);

  return (
    <section className="dow">
      <div className="wrap">
        <div className="dow-grid">
          <div className="dow-deal">
            <div className="dow-head">
              <h2>Deal Of The Week</h2>
              <div className="dow-nav">
                <button type="button" className="arrow-btn" onClick={prevDeal} aria-label="Previous deal">
                  <ChevronLeft />
                </button>
                <button type="button" className="arrow-btn" onClick={nextDeal} aria-label="Next deal">
                  <ChevronRight />
                </button>
              </div>
            </div>

            <div className="dow-card">
              <div className="dow-card-media">
                <ImageSlot src={deal.image} alt={deal.name} shape="rect" />
              </div>
              <p className="dow-card-name">{deal.name}</p>
              <StarRow rating={deal.rating} />
              <div className="dow-card-price">
                {deal.originalPrice ? <span className="price-was">${deal.originalPrice}</span> : null}
                <span className="dow-price">${deal.price}</span>
              </div>
              <CountdownBoxes key={deal.id} endsInMs={deal.endsInMs} />
              <button type="button" className="dow-cta">
                Add To Cart
              </button>
            </div>
          </div>

          <div className="dow-featured">
            <div className="dow-head">
              <h2>Featured Products</h2>
              <div className="dow-nav">
                <button type="button" className="arrow-btn" onClick={prevPage} aria-label="Previous products">
                  <ChevronLeft />
                </button>
                <button type="button" className="arrow-btn" onClick={nextPage} aria-label="Next products">
                  <ChevronRight />
                </button>
              </div>
            </div>

            <div className="dow-flist">
              {visibleFeatured.map((product) => (
                <FeaturedRow product={product} key={product.id} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
