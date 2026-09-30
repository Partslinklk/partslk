"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const FIRST_DELAY = 5000; // before the first popup
const VISIBLE_FOR = 5000; // how long each popup stays
const GAP = 8000; // pause between popups

const SALES = [
  { buyer: "Henry (New York)", product: "Akebono Performance Front Brake Caliper Set", image: "/product-1.png", ago: "16 hours ago" },
  { buyer: "Sarah (Sydney)", product: "Motul 7100 20W-50 Fully Synthetic Engine Oil", image: "/product-3.png", ago: "2 hours ago" },
  { buyer: "Daniel (London)", product: "Technaxx Car Alarm With Charging Function", image: "/product-7.png", ago: "5 hours ago" },
  { buyer: "Priya (Colombo)", product: "Firestone Firehawk Wide Oval AS Tyres", image: "/product-8.png", ago: "1 day ago" },
  { buyer: "Marcus (Toronto)", product: "OMP Steering Aluminum Spacer", image: "/product-4.png", ago: "9 hours ago" },
];

export function SalesToast() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    let showTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;

    // Content changes only while the card is hidden, so it never swaps mid fade-out.
    function show(advance: boolean) {
      if (advance) setIndex((i) => (i + 1) % SALES.length);
      setVisible(true);
      hideTimer = setTimeout(() => {
        setVisible(false);
        showTimer = setTimeout(() => show(true), GAP);
      }, VISIBLE_FOR);
    }

    showTimer = setTimeout(() => show(false), FIRST_DELAY);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [dismissed]);

  const sale = SALES[index];

  return (
    <div className={`sale-toast${visible ? " is-visible" : ""}`} role="status" aria-live="polite" aria-hidden={!visible}>
      <button className="sale-toast-close" type="button" aria-label="Close" onClick={() => { setVisible(false); setDismissed(true); }}>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div className="sale-toast-img">
        <Image src={sale.image} alt="" width={64} height={64} />
      </div>
      <div className="sale-toast-body">
        <span className="sale-toast-who">{sale.buyer} purchased</span>
        <span className="sale-toast-name">{sale.product}</span>
        <span className="sale-toast-meta">
          {sale.ago}
          <span className="sale-toast-verified">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2}>
              <circle cx="12" cy="12" r="9" />
              <path d="m8 12.5 2.8 2.8L16 10" />
            </svg>
            Verified
          </span>
        </span>
      </div>
      {visible && <span className="sale-toast-bar" style={{ animationDuration: `${VISIBLE_FOR}ms` }} />}
    </div>
  );
}
