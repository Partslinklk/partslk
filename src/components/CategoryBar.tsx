"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  const countdown = useCountdown();

  return (
    <nav className="nav-links" aria-label="Categories">
      <button className="nav-vehicle" type="button">
        <span className="nav-vehicle-text">
          SET YOUR
          <br />
          VEHICLE:
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="nav-vehicle-ico" src="/suv-car.png" alt="" aria-hidden="true" />
      </button>

      <p className="nav-ship">
        Order in the next <span>{countdown || "--:--:--"}</span> and get same day shipping*!
      </p>

      <Link className="nav-categories" href="/categories">
        CATEGORIES
      </Link>
    </nav>
  );
}
