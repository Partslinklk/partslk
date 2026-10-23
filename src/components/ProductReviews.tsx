"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, useCustomer } from "@/lib/customer-context";
import { useUI } from "./UIProvider";

const STAR_PATH = "M12 2l3 6.6 7 .7-5.3 4.7 1.6 6.9L12 17.3 5.7 20.9l1.6-6.9L2 9.3l7-.7Z";

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const full = Math.round(rating);
  return (
    <span className="stars" style={{ display: "inline-flex", gap: 2 }} aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < full ? "#F5A623" : "none"} stroke="#F5A623" strokeWidth={i < full ? 0 : 1.5}>
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  );
}

type Review = { id: string; author: string; rating: number; title: string; body: string; createdAt: string };
type Data = {
  summary: { average: number; count: number; breakdown: { star: number; count: number }[] };
  reviews: Review[];
  eligibility: { canReview: boolean; reason: "signin" | "not_purchased" | "already_reviewed" | null };
};

const REASON: Record<string, string> = {
  not_purchased: "Only customers who have received this product can review it.",
  already_reviewed: "Thanks - you have already reviewed this product.",
};

/** Real, moderated reviews for one product, plus the form for verified buyers. */
export function ProductReviews({ productId, productName }: { productId: string; productName: string }) {
  const { openAuth } = useUI();
  const { customer, loading: customerLoading } = useCustomer();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

  // Reload when the signed-in customer changes (eligibility depends on who is asking).
  const customerId = customer?.id ?? null;
  useEffect(() => {
    if (customerLoading) return;
    let cancelled = false;
    api<Data>(`/api/products/${encodeURIComponent(productId)}/reviews`)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load reviews."));
    return () => {
      cancelled = true;
    };
  }, [productId, customerId, customerLoading]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rating) return setFormError("Please choose a star rating.");
    const d = new FormData(e.currentTarget);
    setBusy(true);
    setFormError("");
    try {
      await api(`/api/products/${encodeURIComponent(productId)}/reviews`, {
        method: "POST",
        body: { rating, title: String(d.get("title") ?? ""), body: String(d.get("body") ?? "") },
      });
      setSubmitted(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not submit your review.");
    } finally {
      setBusy(false);
    }
  }

  const count = data?.summary.count ?? 0;
  const word = count === 1 ? "review" : "reviews";
  const elig = data?.eligibility;

  return (
    <div className="pdp-reviews-layout">
      <h2 className="pdp-reviews-heading">
        {count} {word} for {productName}
      </h2>

      <div className="pdp-reviews-col">
        {error ? (
          <p className="pdp-reviewnote">{error}</p>
        ) : !data ? (
          <p className="pdp-reviewnote">Loading reviews…</p>
        ) : count === 0 ? (
          <p className="pdp-reviewnote">No reviews yet for this product.</p>
        ) : (
          <>
            <div className="pdp-rating-summary">
              <div className="pdp-rating-big">
                <strong>{data.summary.average.toFixed(1)}</strong>
                out of 5 stars
              </div>
              <div className="pdp-rating-bars">
                {data.summary.breakdown.map(({ star, count: n }) => (
                  <div className="pdp-rating-bar-row" key={star}>
                    <span>{star} ★</span>
                    <span className="pdp-rating-bar-track">
                      <span className="pdp-rating-bar-fill" style={{ width: `${count ? (n / count) * 100 : 0}%` }} />
                    </span>
                    <span className="pdp-rating-bar-count">{n}</span>
                  </div>
                ))}
              </div>
            </div>

            {data.reviews.map((r) => (
              <div className="pdp-reviewcard" key={r.id}>
                <div className="pdp-reviewcard-avatar" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <circle cx="12" cy="8" r="3.6" />
                    <path d="M4.5 20c1.4-4 4.2-6 7.5-6s6.1 2 7.5 6" />
                  </svg>
                </div>
                <div className="pdp-reviewcard-body">
                  <div className="pdp-reviewcard-head">
                    <span className="pdp-reviewcard-by">
                      {r.author} · Verified Buyer
                    </span>
                    <Stars rating={r.rating} size={15} />
                  </div>
                  {r.title && <p className="pdp-reviewcard-text" style={{ fontWeight: 700 }}>{r.title}</p>}
                  <p className="pdp-reviewcard-text">{r.body}</p>
                  <p className="pdp-reviewnote" style={{ marginTop: 6 }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="pdp-reviews-col">
        <h3 className="pdp-reviewform-title">Add a review</h3>
        <div className="pdp-reviewform-wrap">
          {submitted ? (
            <p className="pdp-reviewform-thanks">Thanks — your review has been submitted for approval.</p>
          ) : !elig ? null : elig.canReview ? (
            <form className="pdp-reviewform" onSubmit={onSubmit}>
              <p className="pdp-reviewform-note">Reviewing as {customer?.firstName || customer?.email}. Required fields are marked *</p>

              <div className="pdp-reviewform-field">
                <label>
                  Your Rating <em>*</em>
                </label>
                <div className="pdp-reviewform-stars" onMouseLeave={() => setHover(0)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" aria-label={`${n} star${n === 1 ? "" : "s"}`} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}>
                      <svg className="pdp-reviewform-star" viewBox="0 0 24 24" fill={n <= (hover || rating) ? "#F5A623" : "none"} stroke="#F5A623" strokeWidth={1.5}>
                        <path d={STAR_PATH} />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pdp-reviewform-field">
                <label htmlFor="review-title">Review title</label>
                <input id="review-title" type="text" name="title" maxLength={120} />
              </div>

              <div className="pdp-reviewform-field">
                <label htmlFor="review-body">
                  Your Review <em>*</em>
                </label>
                <textarea id="review-body" name="body" rows={4} required minLength={10} maxLength={2000} />
              </div>

              {formError && <p className="authm-error">{formError}</p>}
              <button type="submit" className="pdp-reviewform-submit" disabled={busy}>
                {busy ? "Submitting…" : "Submit Review"}
              </button>
            </form>
          ) : elig.reason === "signin" ? (
            <p className="pdp-reviewnote">
              <button type="button" className="acc-link" onClick={() => openAuth("login")}>
                Sign in
              </button>{" "}
              to review products you have bought.
            </p>
          ) : (
            <p className="pdp-reviewnote">{REASON[elig.reason ?? ""] ?? "You can't review this product right now."}</p>
          )}
        </div>
      </div>
    </div>
  );
}
