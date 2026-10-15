"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useUI } from "./UIProvider";

type Item = { label: string; href: string; icon: ReactNode };

const PRIMARY: Item[] = [
  {
    label: "My Orders",
    href: "/my-account",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M7 4h10l1 4H6l1-4Z" />
        <path d="M5 8h14v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8Z" />
        <path d="M9 12h6" />
      </svg>
    ),
  },
  {
    label: "My Coins",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v8M9.5 10.5h3.2a1.5 1.5 0 0 1 0 3H9.5" />
      </svg>
    ),
  },
  {
    label: "Message Center",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M4 5h16v11H8l-4 4V5Z" />
        <path d="M8 9h8M8 12h5" />
      </svg>
    ),
  },
  {
    label: "Payment",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18M7 14h4" />
      </svg>
    ),
  },
  {
    label: "Wish List",
    href: "/my-account",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M12 20s-7-4.6-7-9.4A3.6 3.6 0 0 1 12 7a3.6 3.6 0 0 1 7 3.6C19 15.4 12 20 12 20Z" />
      </svg>
    ),
  },
  {
    label: "My Coupons",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4V7Z" />
        <path d="M14 7v10" strokeDasharray="2 2" />
      </svg>
    ),
  },
];

export function AccountMenu() {
  const { openAuth } = useUI();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function show() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }
  function hideSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 160);
  }
  function startAuth(mode: "login" | "register" = "login") {
    setOpen(false);
    openAuth(mode);
  }

  return (
    <div
      className={`account-menu${open ? " open" : ""}`}
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={hideSoon}
    >
      <button
        className="nav-act nav-account nav-signin"
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => startAuth()}
      >
        <svg className="nav-act-ico" viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="3.4" />
          <path d="M5 20c0-3.6 3-6.2 7-6.2s7 2.6 7 6.2" />
        </svg>
        <span className="nav-act-text">
          <span className="nav-info-label">Login / Signup</span>
          <strong>My Account</strong>
        </span>
      </button>

      <div className="account-pop" role="menu" aria-label="Account menu">
        <button className="acct-signin" type="button" onClick={() => startAuth("login")}>
          Sign in
        </button>
        <button className="acct-register" type="button" onClick={() => startAuth("register")}>
          Register
        </button>

        <div className="acct-divider" />

        <ul className="acct-list">
          {PRIMARY.map((it) => (
            <li key={it.label}>
              <Link className="acct-item" href={it.href} role="menuitem">
                <span className="acct-ico">{it.icon}</span>
                {it.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
