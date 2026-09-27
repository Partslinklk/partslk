import Link from "next/link";

export function TopBar() {
  return (
    <div className="topbar">
      <div className="wrap topbar-inner">
        <span className="topbar-msg">Welcome to Automize</span>
        <nav className="topbar-links" aria-label="Utility">
          <Link href="/">About Us</Link>
          <Link href="/">Blog</Link>
          <Link href="/">Contact Us</Link>
          <Link href="/">FAQs</Link>
        </nav>
      </div>
    </div>
  );
}
