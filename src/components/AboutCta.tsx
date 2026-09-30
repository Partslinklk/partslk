import Link from "next/link";

export function AboutCta() {
  return (
    <section className="about-cta-sec">
      <div className="wrap">
        <span className="about-cta-kicker">Contact us</span>
        <h2>About us info</h2>
        <p>
          Have a question about a part, an order or a return? Our team is happy to help you find
          the right fit, so get in touch and we will get back to you as soon as we can.
        </p>
        <Link href="/contact-us" className="about-cta-btn">
          Click here to contact us
        </Link>
      </div>
    </section>
  );
}
