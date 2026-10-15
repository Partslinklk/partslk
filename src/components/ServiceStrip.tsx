import type { ReactNode } from "react";

const ITEMS: { title: string; sub: string; icon: ReactNode }[] = [
  {
    title: "100% Genuine Parts",
    sub: "Quality checked & guaranteed",
    icon: (
      <svg viewBox="0 0 48 48">
        <path d="M24 5l16 6v11c0 10-7 17-16 21C15 39 8 32 8 22V11l16-6Z" />
        <path d="M17 24l5 5 9-10" />
      </svg>
    ),
  },
  {
    title: "Island-wide Shipping",
    sub: "Delivered across Sri Lanka",
    icon: (
      <svg viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="17" />
        <path d="M7 24h34M24 7c-8 9-8 25 0 34M24 7c8 9 8 25 0 34" />
      </svg>
    ),
  },
  {
    title: "Same Day Dispatch",
    sub: "Orders before 2PM (weekdays only)",
    icon: (
      <svg viewBox="0 0 48 48">
        <circle cx="24" cy="26" r="15" />
        <path d="M24 17v9l6 4M20 6h8" />
      </svg>
    ),
  },
  {
    title: "Easy Returns",
    sub: "Hassle-free within 7 days",
    icon: (
      <svg viewBox="0 0 48 48">
        <path d="M10 18h22a8 8 0 0 1 0 16H18" />
        <path d="M17 11l-7 7 7 7" />
      </svg>
    ),
  },
  {
    title: "Shop In Store",
    sub: "Visit our showroom",
    icon: (
      <svg viewBox="0 0 48 48">
        <path d="M6 18l3-10h30l3 10c0 3-2.5 5-5.5 5S31 21 31 18c0 3-2.5 5-7 5s-7-2-7-5c0 3-2.5 5-5.5 5S6 21 6 18Z" />
        <path d="M10 25v15h28V25M20 40V30h8v10" />
      </svg>
    ),
  },
];

export function ServiceStrip() {
  return (
    <section className="service-strip" aria-label="Why shop with us">
      <div className="wrap">
        <ul className="service-row">
          {ITEMS.map((it) => (
            <li className="service-item" key={it.title}>
              <span className="service-ico">{it.icon}</span>
              <strong>{it.title}</strong>
              <span>{it.sub}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
