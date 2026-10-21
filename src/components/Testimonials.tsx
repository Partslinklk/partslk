import { ImageSlot } from "./ImageSlot";
import { readCollection, type Testimonial } from "@/lib/db";


function QuoteIcon() {
  return (
    <svg viewBox="0 0 44 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M33.172 5.469q2.555 0 4.547 1.547a7.4 7.4 0 0 1 2.695 4.007q.47 1.711.469 3.61 0 2.883-1.125 5.86a22.8 22.8 0 0 1-3.094 5.577 33 33 0 0 1-4.57 4.922A35 35 0 0 1 26.539 35l-3.398-3.398q5.296-4.243 7.218-6.563 1.946-2.32 2.016-4.617-2.86-.329-4.781-2.461-1.923-2.133-1.922-4.992 0-3.117 2.18-5.297 2.202-2.203 5.32-2.203m-20.625 0q2.555 0 4.547 1.547a7.4 7.4 0 0 1 2.695 4.007q.47 1.711.469 3.61 0 2.883-1.125 5.86a22.8 22.8 0 0 1-3.094 5.577 33 33 0 0 1-4.57 4.922A35 35 0 0 1 5.914 35l-3.398-3.398q5.296-4.243 7.218-6.563 1.946-2.32 2.016-4.617-2.86-.329-4.781-2.461-1.922-2.133-1.922-4.992 0-3.117 2.18-5.297 2.202-2.203 5.32-2.203" />
    </svg>
  );
}

function StarRow({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <div className="testi-stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 16 15" fill={i < full ? "#F5A623" : "none"} stroke="#F5A623" strokeWidth={i < full ? 0 : 1}>
          <path d="M7.524.464a.5.5 0 0 1 .952 0l1.432 4.41a.5.5 0 0 0 .476.345h4.637a.5.5 0 0 1 .294.904L11.563 8.85a.5.5 0 0 0-.181.559l1.433 4.41a.5.5 0 0 1-.77.559L8.294 11.65a.5.5 0 0 0-.588 0l-3.751 2.726a.5.5 0 0 1-.77-.56l1.433-4.41a.5.5 0 0 0-.181-.558L.685 6.123A.5.5 0 0 1 .98 5.22h4.637a.5.5 0 0 0 .476-.346z" />
        </svg>
      ))}
    </div>
  );
}

export async function Testimonials() {
  const TESTIMONIALS = await readCollection<Testimonial>("testimonials");
  if (TESTIMONIALS.length === 0) return null;

  return (
    <section className="testi">
      <div className="wrap">
        <div className="testi-head" data-reveal="up">
          <h2>What Our Customers Say</h2>
          <p>Join thousands of drivers who trust us for genuine parts, fair prices, and fast shipping</p>
        </div>
        <div className="testi-grid">
          {TESTIMONIALS.map((t, i) => (
            <div
              className="testi-card"
              key={t.id}
              data-reveal={i === 0 ? "left" : i === 2 ? "right" : "up"}
              style={{ "--delay": `${i * 0.2}s` } as React.CSSProperties}
            >
              <span className="testi-quote-icon">
                <QuoteIcon />
              </span>
              <StarRow rating={t.rating} />
              <p className="testi-quote">{t.quote}</p>
              <div className="testi-person">
                <ImageSlot
                  shape="circle"
                  placeholder=""
                  src={t.avatar || undefined}
                  alt={t.name}
                />
                <div>
                  <p className="testi-name">{t.name}</p>
                  <p className="testi-meta">{t.meta}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
