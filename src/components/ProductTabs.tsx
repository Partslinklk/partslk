"use client";

import { useState } from "react";
import { ImageSlot } from "./ImageSlot";
import { COLOR_OPTIONS, type ShopProduct } from "@/lib/products-catalog";
import { useStoreData } from "@/lib/store-context";
import { formatPrice } from "@/lib/format-price";

type TabKey = "description" | "info" | "reviews";

const STAR_PATH = "M12 2l3 6.6 7 .7-5.3 4.7 1.6 6.9L12 17.3 5.7 20.9l1.6-6.9L2 9.3l7-.7Z";

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  const full = Math.round(rating);
  return (
    <span className="stars" style={{ display: "inline-flex", gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < full ? "#F5A623" : "none"} stroke="#F5A623" strokeWidth={i < full ? 0 : 1.5}>
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c1.4-4 4.2-6 7.5-6s6.1 2 7.5 6" />
    </svg>
  );
}

function ThumbsUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3Zm0 0 4.5-8a2 2 0 0 1 3.6 1.7L14 9h4.3a2 2 0 0 1 1.9 2.7l-2.2 6A2 2 0 0 1 16 19H7" />
    </svg>
  );
}

function ThumbsDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 13V4H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h3Zm0 0-.5 8a2 2 0 0 0 3.6 1.7L14 15h4.3a2 2 0 0 0 1.9-2.7l-2.2-6A2 2 0 0 0 16 5H7" />
    </svg>
  );
}

function ratingBreakdown(rating: number, count: number) {
  const stars = [5, 4, 3, 2, 1];
  if (count <= 0) return stars.map((star) => ({ star, count: 0 }));
  const center = Math.min(5, Math.max(1, Math.round(rating)));
  const weights = stars.map((s) => Math.max(1, 6 - Math.abs(s - center) * 2));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / totalWeight) * count);
  const floors = raw.map(Math.floor);
  const remainder = count - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - floors[i] }))
    .sort((a, b) => b.frac - a.frac)
    .map((o) => o.i);
  const counts = [...floors];
  for (let k = 0; k < remainder; k++) counts[order[k % order.length]] += 1;
  return stars.map((star, i) => ({ star, count: counts[i] }));
}

export function ProductTabs({ product, stock }: { product: ShopProduct; stock: number }) {
  const { categories: CATEGORY_OPTIONS } = useStoreData();
  const [tab, setTab] = useState<TabKey>("description");
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  const categoryNames = product.categories
    .map((id) => CATEGORY_OPTIONS.find((c) => c.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const colorNames = product.colors
    .map((id) => COLOR_OPTIONS.find((c) => c.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const reviewWord = product.reviewCount === 1 ? "review" : "reviews";

  const bullets = [
    { label: "Product Overview", text: product.description },
    colorNames.length ? { label: "Color Options", text: `Available in ${colorNames.join(", ")}.` } : null,
    {
      label: "Fitment",
      text: `${product.size} sizing, suited for ${categoryNames.join(" & ") || "a wide range of"} applications.`,
    },
    { label: "Customer Rated", text: `${product.rating} / 5 stars from ${product.reviewCount} ${reviewWord}.` },
    { label: "Ready To Ship", text: `${stock} units currently in stock.` },
  ].filter((b): b is { label: string; text: string } => Boolean(b));

  const breakdown = ratingBreakdown(product.rating, product.reviewCount);

  const handleReviewSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setReviewSubmitted(true);
  };

  const specRows: [string, string][] = [
    ["Brand", product.brand],
    ["SKU", product.id],
    ["Category", categoryNames.join(", ") || "—"],
    ["Color Options", colorNames.join(", ") || "—"],
    ["Size", product.size],
    ["Price", formatPrice(product.price)],
    ["Rating", `${product.rating} / 5 (${product.reviewCount} ${reviewWord})`],
    ["Stock Status", `${stock} in stock`],
  ];

  return (
    <div className="pdp-tabs">
      <div className="pdp-tablist" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "description"}
          className={`pdp-tabbtn${tab === "description" ? " is-active" : ""}`}
          onClick={() => setTab("description")}
        >
          Description
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "info"}
          className={`pdp-tabbtn${tab === "info" ? " is-active" : ""}`}
          onClick={() => setTab("info")}
        >
          Additional information
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "reviews"}
          className={`pdp-tabbtn${tab === "reviews" ? " is-active" : ""}`}
          onClick={() => setTab("reviews")}
        >
          Reviews ({product.reviewCount})
        </button>
      </div>

      <div className="pdp-tabpanel">
        {tab === "description" ? (
          <div className="pdp-about">
            <h2>About this item</h2>
            <p>{product.description}</p>
            <p>
              Every {product.brand} part in our catalog is inspected before it ships, backed by our lowest-price
              guarantee and free returns on orders over {formatPrice(200)}.
            </p>

            <div className="pdp-tabbanner">
              <ImageSlot src="/car-brake-banner.jpg" alt="" shape="rect" />
              <div className="pdp-tabbanner-copy">
                <strong>Genuine Parts For Every Make &amp; Model</strong>
                <span>Sourced, quality-checked, and shipped fast by PartsLink</span>
              </div>
            </div>

            <ul className="pdp-bullets">
              {bullets.map((b) => (
                <li key={b.label} className="pdp-bullet">
                  <strong>{b.label.toUpperCase()}: </strong>
                  {b.text}
                </li>
              ))}
            </ul>

            <p className="pdp-spec-title">Technical Details</p>
            <table className="pdp-spectable">
              <tbody>
                {specRows.map(([label, value]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === "info" ? (
          <table className="pdp-spectable">
            <tbody>
              <tr>
                <td>Size</td>
                <td>{product.size}</td>
              </tr>
              <tr>
                <td>Color Options</td>
                <td>{colorNames.join(", ") || "—"}</td>
              </tr>
              <tr>
                <td>Category</td>
                <td>{categoryNames.join(", ") || "—"}</td>
              </tr>
              <tr>
                <td>Brand</td>
                <td>{product.brand}</td>
              </tr>
            </tbody>
          </table>
        ) : null}

        {tab === "reviews" ? (
          <div className="pdp-reviews-layout">
            <h2 className="pdp-reviews-heading">
              {product.reviewCount} {reviewWord} for {product.name}
            </h2>

            <div className="pdp-reviews-col">
              {product.reviewCount > 0 ? (
                <>
                  <div className="pdp-rating-summary">
                    <div className="pdp-rating-big">
                      <strong>{product.rating.toFixed(2)}</strong>
                      out of 5 stars
                    </div>
                    <div className="pdp-rating-bars">
                      {breakdown.map(({ star, count }) => (
                        <div className="pdp-rating-bar-row" key={star}>
                          <span>{star} ★</span>
                          <span className="pdp-rating-bar-track">
                            <span
                              className="pdp-rating-bar-fill"
                              style={{ width: `${product.reviewCount ? (count / product.reviewCount) * 100 : 0}%` }}
                            />
                          </span>
                          <span className="pdp-rating-bar-count">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pdp-reviewcard">
                    <div className="pdp-reviewcard-avatar">
                      <PersonIcon />
                    </div>
                    <div className="pdp-reviewcard-body">
                      <div className="pdp-reviewcard-head">
                        <span className="pdp-reviewcard-by">Verified Buyer</span>
                        <StarRow rating={product.rating} size={15} />
                      </div>
                      <p className="pdp-reviewcard-text">
                        Solid quality for the price — fit exactly as described and installation was straightforward.
                      </p>
                      <div className="pdp-reviewcard-foot">
                        <button
                          type="button"
                          className={`pdp-review-vote${vote === "up" ? " is-active" : ""}`}
                          aria-label="Helpful"
                          onClick={() => setVote((v) => (v === "up" ? null : "up"))}
                        >
                          <ThumbsUpIcon />
                        </button>
                        <button
                          type="button"
                          className={`pdp-review-vote${vote === "down" ? " is-active" : ""}`}
                          aria-label="Not helpful"
                          onClick={() => setVote((v) => (v === "down" ? null : "down"))}
                        >
                          <ThumbsDownIcon />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="pdp-reviewnote">No reviews yet for this product.</p>
              )}
            </div>

            <div className="pdp-reviews-col">
              <h3 className="pdp-reviewform-title">Add a review</h3>
              <div className="pdp-reviewform-wrap">
                {reviewSubmitted ? (
                  <p className="pdp-reviewform-thanks">Thanks — your review has been submitted for approval.</p>
                ) : (
                  <form className="pdp-reviewform" onSubmit={handleReviewSubmit}>
                    <p className="pdp-reviewform-note">
                      Your email address will not be published. Required fields are marked *
                    </p>

                    <div className="pdp-reviewform-field">
                      <label>
                        Your Rating <em>*</em>
                      </label>
                      <div className="pdp-reviewform-stars" onMouseLeave={() => setHoverRating(0)}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            aria-label={`${n} star${n === 1 ? "" : "s"}`}
                            onMouseEnter={() => setHoverRating(n)}
                            onClick={() => setNewRating(n)}
                          >
                            <svg
                              className="pdp-reviewform-star"
                              viewBox="0 0 24 24"
                              fill={n <= (hoverRating || newRating) ? "#F5A623" : "none"}
                              stroke="#F5A623"
                              strokeWidth={1.5}
                            >
                              <path d={STAR_PATH} />
                            </svg>
                          </button>
                        ))}
                      </div>
                      <input type="hidden" name="rating" value={newRating} required />
                    </div>

                    <div className="pdp-reviewform-field">
                      <label htmlFor="review-title">Review title</label>
                      <input id="review-title" type="text" name="title" />
                    </div>

                    <div className="pdp-reviewform-field">
                      <label htmlFor="review-body">
                        Your Review <em>*</em>
                      </label>
                      <textarea id="review-body" name="body" rows={4} required />
                    </div>

                    <div className="pdp-reviewform-field">
                      <label htmlFor="review-name">
                        Name <em>*</em>
                      </label>
                      <input id="review-name" type="text" name="name" required />
                    </div>

                    <div className="pdp-reviewform-field">
                      <label htmlFor="review-email">
                        Email <em>*</em>
                      </label>
                      <input id="review-email" type="email" name="email" required />
                    </div>

                    <label className="pdp-reviewform-checkline">
                      <input type="checkbox" name="remember" />
                      Save my name, email, and website in this browser for the next time I comment.
                    </label>

                    <button type="submit" className="pdp-reviewform-submit">
                      Submit Review
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
