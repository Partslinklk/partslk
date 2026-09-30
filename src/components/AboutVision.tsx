import { ImageSlot } from "./ImageSlot";

const ITEMS = [
  {
    q: "Our vision",
    a: "To be the most trusted place for drivers to find genuine parts that fit, with clear information and fair prices on every order.",
  },
  {
    q: "Our mission",
    a: "We make buying car parts simple: a fitment guide that removes the guesswork, genuine brands from trusted suppliers, and fast, reliable delivery.",
  },
  {
    q: "Our support",
    a: "Our team of parts specialists answers questions about compatibility, installation, orders and returns, and gets back to you fast.",
  },
];

export function AboutVision() {
  return (
    <section className="about-vis">
      <div className="wrap about-vis-inner">
        <div className="about-vis-text">
          <h2>Inspiration, innovation, and opportunities.</h2>
          <p>
            We keep improving the way drivers find and buy parts, with better search, clearer
            product details and a service that stays one step ahead.
          </p>
          <div className="about-vis-acc">
            {ITEMS.map((it, i) => (
              <details key={it.q} open={i === 0}>
                <summary>{it.q}</summary>
                <p>{it.a}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="about-vis-media">
          <ImageSlot shape="rect" placeholder="" src="/about/vision.jpg" alt="Stacked car tyres" />
        </div>
      </div>
    </section>
  );
}
