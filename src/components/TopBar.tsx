import Link from "next/link";

export function TopBar() {
  return (
    <div className="topbar">
      <div className="wrap topbar-inner">
        <span className="topbar-msg">Welcome to Automize</span>
        <nav className="topbar-links" aria-label="Utility">
          <Link href="/about-us">About Us</Link>
          <Link href="/contact-us">Contact Us</Link>
          <Link href="/faqs">FAQs</Link>
        </nav>
      </div>
    </div>
  );
}
