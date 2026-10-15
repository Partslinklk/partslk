import Link from "next/link";
import { HeroFilters } from "./HeroFilters";

export function PromoHero() {
  return (
    <section className="landing-hero">
      <div className="wrap">
        <div className="landing-copy">
          <span className="promo-kicker promo-kicker-gold">Best Sellers</span>
          <h1 className="landing-title">Quality Auto Parts, Delivered Fast</h1>
          <Link className="promo-cta" href="/products">
            Shop Now
          </Link>
        </div>
        <HeroFilters />
      </div>
    </section>
  );
}
