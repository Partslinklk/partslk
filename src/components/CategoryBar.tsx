"use client";

import { useEffect, useState } from "react";
import { useUI } from "./UIProvider";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Time left until the end of today, as HH:MM:SS (client-only to avoid hydration drift).
function useCountdown() {
  const [text, setText] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const s = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
      setText(`${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return text;
}

export function CategoryBar() {
  const { openTopDeals } = useUI();
  const countdown = useCountdown();

  return (
    <nav className="nav-links" aria-label="Categories">
      <button className="nav-vehicle" type="button">
        <span className="nav-vehicle-text">
          SET YOUR
          <br />
          VEHICLE:
        </span>
        <svg viewBox="0 0 48 32" fill="none" strokeWidth={1.8} aria-hidden="true">
          <path d="M7 16l3-8a3 3 0 0 1 3-2h22a3 3 0 0 1 3 2l3 8" />
          <rect x="4" y="16" width="40" height="10" rx="4" />
          <circle cx="12" cy="21" r="2" />
          <circle cx="36" cy="21" r="2" />
          <path d="M19 20h10M19 23h10" />
          <path d="M9 26v3M39 26v3" />
        </svg>
      </button>

      <p className="nav-ship">
        Order in the next <span>{countdown || "--:--:--"}</span> and get same day shipping*!
      </p>

      <button className="nav-categories" type="button" onClick={openTopDeals}>
        CATEGORIES
      </button>
    </nav>
  );
}
