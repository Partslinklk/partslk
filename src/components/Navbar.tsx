"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useUI } from "./UIProvider";
import { SearchBar } from "./SearchBar";
import { AccountMenu } from "./AccountMenu";
import { CategoryBar } from "./CategoryBar";
import { TopDealsDrawer } from "./TopDealsDrawer";
import { CartDrawer } from "./CartDrawer";
import { AuthModal } from "./AuthModal";

export function Navbar() {
  const { cartCount, openCart } = useUI();
  const catbarRef = useRef<HTMLDivElement>(null);
  const naturalOffsetRef = useRef(0);
  const isStickyRef = useRef(false);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const catbar = catbarRef.current;
    if (!catbar) return;

    const measure = () => {
      if (!isStickyRef.current) naturalOffsetRef.current = catbar.offsetTop;
    };
    measure();

    let ticking = false;
    const applyState = () => {
      const next = window.scrollY >= naturalOffsetRef.current;
      isStickyRef.current = next;
      setIsSticky(next);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(applyState);
      }
    };

    applyState();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <header className="nav">

      <div className="nav-main">
      <div className="wrap">
        <div className="nav-top">
          <Link className="logo" href="/" aria-label="Automize home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="logo-img" src="/logo.png" alt="Automize" />
          </Link>

          <SearchBar />

          <div className="nav-info">
            <div className="nav-info-item">
              <span className="nav-info-label">Country/Region</span>
              <strong>Sri Lanka (LKR Rs)</strong>
            </div>
            <Link className="nav-info-item" href="/contact-us">
              <span className="nav-info-label">Questions</span>
              <strong>Help &amp; Support</strong>
            </Link>
          </div>

          <div className="nav-actions">
            <AccountMenu />

            <button type="button" className="nav-act nav-cartblock" onClick={openCart}>
              <span className="nav-cart-ico">
                <svg viewBox="0 0 24 24">
                  <path d="M3 4h2l2.4 12.2A2 2 0 0 0 9.4 18h8.4a2 2 0 0 0 2-1.6L21.5 8H6" />
                  <circle cx="10" cy="21" r="1" />
                  <circle cx="18" cy="21" r="1" />
                </svg>
                <span className="cart-count">{cartCount}</span>
              </span>
              <span className="nav-act-text">
                <strong>Cart</strong>
              </span>
            </button>
          </div>
        </div>
      </div>
      </div>

      <div ref={catbarRef} className={`catbar${isSticky ? " is-sticky" : ""}`}>
        <div className="wrap">
          <CategoryBar />
        </div>
      </div>

      <TopDealsDrawer />
      <CartDrawer />
      <AuthModal />
    </header>
  );
}
