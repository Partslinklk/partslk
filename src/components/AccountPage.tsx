"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

type TabId = "dashboard" | "orders" | "downloads" | "addresses" | "details" | "compare" | "wishlist";

const TABS: { id: TabId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "orders", label: "Orders" },
  { id: "downloads", label: "Downloads" },
  { id: "addresses", label: "Addresses" },
  { id: "details", label: "Account details" },
  { id: "compare", label: "Compare" },
  { id: "wishlist", label: "Wishlist" },
];

function Notice({ children, action }: { children: ReactNode; action?: { label: string; href: string } }) {
  return (
    <div className="acc-notice">
      <span>{children}</span>
      {action && (
        <Link href={action.href} className="acc-btn">
          {action.label}
        </Link>
      )}
    </div>
  );
}

function Panel({ tab, onTab }: { tab: TabId; onTab: (t: TabId) => void }) {
  switch (tab) {
    case "dashboard":
      return (
        <div className="acc-panel">
          <p>
            Hello <strong>test@gmail.com</strong>. From your account dashboard you can view your{" "}
            <button type="button" onClick={() => onTab("orders")}>recent orders</button>, manage your{" "}
            <button type="button" onClick={() => onTab("addresses")}>shipping and billing addresses</button>, and{" "}
            <button type="button" onClick={() => onTab("details")}>edit your password and account details</button>.
          </p>
        </div>
      );
    case "orders":
      return <Notice action={{ label: "Browse products", href: "/products" }}>No order has been made yet.</Notice>;
    case "downloads":
      return <Notice action={{ label: "Browse products", href: "/products" }}>No downloads available yet.</Notice>;
    case "addresses":
      return (
        <div className="acc-panel">
          <p>The following addresses will be used on the checkout page by default.</p>
          <div className="acc-addr-grid">
            <div className="acc-addr">
              <h3>Billing address</h3>
              <p>You have not set up this type of address yet.</p>
            </div>
            <div className="acc-addr">
              <h3>Shipping address</h3>
              <p>You have not set up this type of address yet.</p>
            </div>
          </div>
        </div>
      );
    case "details":
      return (
        <form className="acc-panel acc-form" onSubmit={(e) => e.preventDefault()}>
          <div className="acc-form-row">
            <label>
              First name
              <input type="text" autoComplete="given-name" />
            </label>
            <label>
              Last name
              <input type="text" autoComplete="family-name" />
            </label>
          </div>
          <label>
            Email address
            <input type="email" defaultValue="test@gmail.com" autoComplete="email" />
          </label>
          <label>
            New password (leave blank to keep unchanged)
            <input type="password" autoComplete="new-password" />
          </label>
          <button type="submit" className="acc-btn acc-btn-solo">
            Save changes
          </button>
        </form>
      );
    case "compare":
      return <Notice action={{ label: "Browse products", href: "/products" }}>No products added to compare.</Notice>;
    case "wishlist":
      return <Notice action={{ label: "Browse products", href: "/products" }}>Your wishlist is empty.</Notice>;
  }
}

export function AccountPage() {
  const [tab, setTab] = useState<TabId>("orders");

  return (
    <>
      <section className="sr-titleband">
        <div className="wrap">
          <div className="sr-crumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <span className="crumb-now">My account</span>
          </div>
          <div className="sr-resulthead">
            <h1>My account</h1>
          </div>
        </div>
      </section>

      <div className="wrap acc-layout">
        <div className="acc-main">
          <Panel tab={tab} onTab={setTab} />
        </div>

        <aside className="acc-side">
          <div className="acc-user">
            <span className="acc-avatar" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8}>
                <circle cx="12" cy="8" r="3.6" />
                <path d="M5 20c0-3.6 3-6.2 7-6.2s7 2.6 7 6.2" />
              </svg>
            </span>
            <span className="acc-email">test@gmail.com</span>
          </div>
          <nav aria-label="Account">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`acc-nav-item${tab === t.id ? " is-active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
            <Link href="/" className="acc-nav-item">
              Log out
            </Link>
          </nav>
        </aside>
      </div>
    </>
  );
}
