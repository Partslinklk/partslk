import Link from "next/link";
import { ImageSlot } from "./ImageSlot";

const ReadMoreIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth={2}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export function PromoHero() {
  return (
    <section className="promo-hero">
      <div className="wrap">
        <div className="promo-grid">
          <div className="promo-card promo-main" data-enter="left">
            <ImageSlot
              className="promo-media"
              shape="rect"
              src="/hero-main-slide.png"
              alt=""
              style={{ position: "absolute", inset: 0 }}
            />
            <div className="promo-copy">
              <span className="promo-kicker promo-kicker-red">Best Sellers</span>
              <h2 className="promo-title">
                Car Headlight
                <br />
                35W/55W
              </h2>
              <Link className="promo-cta" href="/products">
                Shop Now
              </Link>
            </div>
            <div className="promo-dots" aria-hidden="true">
              <span className="promo-dot" />
              <span className="promo-dot" />
              <span className="promo-dot is-active" />
            </div>
          </div>

          <div className="promo-card promo-mid" data-enter="up" style={{ "--delay": ".15s" } as React.CSSProperties}>
            <ImageSlot
              className="promo-media"
              shape="rect"
              src="/hero-brakes-banner.png"
              alt=""
              style={{ position: "absolute", inset: 0 }}
            />
            <div className="promo-copy promo-copy-center">
              <h2 className="promo-title promo-title-gold">Better Brakes</h2>
              <p className="promo-sub">Best sellers brakes system</p>
              <Link className="promo-cta promo-cta-light" href="/products">
                Shop Now
              </Link>
            </div>
          </div>

          <div className="promo-stack" data-enter="right" style={{ "--delay": ".3s" } as React.CSSProperties}>
            <div className="promo-card promo-small">
              <ImageSlot
                className="promo-media"
                shape="rect"
                src="/hero-headlights-banner.png"
                alt=""
                style={{ position: "absolute", inset: 0 }}
              />
              <div className="promo-copy">
                <span className="promo-kicker promo-kicker-gold">Best Sellers</span>
                <h3 className="promo-title-sm">Projector Headlights</h3>
                <Link className="promo-more" href="/products">
                  Read More <ReadMoreIcon />
                </Link>
              </div>
            </div>

            <div className="promo-card promo-small">
              <ImageSlot
                className="promo-media"
                shape="rect"
                src="/hero-wheels-small-banner.png"
                alt=""
                style={{ position: "absolute", inset: 0 }}
              />
              <div className="promo-copy">
                <span className="promo-kicker promo-kicker-gold">Car Wheels</span>
                <h3 className="promo-title-sm">Sport Edition</h3>
                <Link className="promo-more" href="/products">
                  Read More <ReadMoreIcon />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
