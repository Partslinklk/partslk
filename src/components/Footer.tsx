import Link from "next/link";

const PAY_METHODS = [
  { name: "Visa", logo: "/Visa_Inc._logo_(2021–present).svg" },
  { name: "Mastercard", logo: "/Mastercard_2019_logo.svg" },
  { name: "PayPal", logo: "/PayPal.svg" },
];

const QUICK_LINKS = [
  { label: "Contact Us", href: "/" },
  { label: "About Us", href: "/" },
  { label: "Careers", href: "/" },
  { label: "Our Stories", href: "/" },
  { label: "Report Abuse", href: "/" },
  { label: "Payment", href: "/" },
];

const SERVICES_LINKS = [
  { label: "Return Policy", href: "/" },
  { label: "Terms Of Use", href: "/" },
  { label: "Privacy", href: "/" },
  { label: "Sitemap", href: "/" },
  { label: "Product Support", href: "/" },
  { label: "Redeem Voucher", href: "/" },
];

const ACCOUNT_LINKS = [
  { label: "Term & policy", href: "/" },
  { label: "Press", href: "/" },
  { label: "Delivery", href: "/" },
  { label: "Service", href: "/" },
  { label: "Order Traking", href: "/" },
  { label: "Policy & Rules", href: "/" },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-cols">
        <div className="footer-col footer-about">
          <Link className="footer-logo" href="/" aria-label="Automize home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Automize" />
          </Link>
          <h3>About Our Store</h3>
          <p>
            Welcome to Automize, where we pride ourselves on providing exceptional parts and
            unparalleled customer service. Our store is a haven for those who appreciate quality,
            fit, and reliability.
          </p>
        </div>

        <div className="footer-col">
          <h3>Quick Links</h3>
          <ul>
            {QUICK_LINKS.map((l) => (
              <li key={l.label}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col">
          <h3>Services</h3>
          <ul>
            {SERVICES_LINKS.map((l) => (
              <li key={l.label}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col">
          <h3>Your Account</h3>
          <ul>
            {ACCOUNT_LINKS.map((l) => (
              <li key={l.label}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col footer-contact">
          <h3>Contact Us</h3>
          <ul className="footer-contact-list">
            <li>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6}>
                <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              <span>60 29th Street San Francisco, 507-Union Trade Center, United States America - 94110</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6}>
                <path d="M6.6 10.8a15.9 15.9 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 9 9 0 0 0 2.8.45 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A16 16 0 0 1 3 5a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 9 9 0 0 0 .45 2.8 1 1 0 0 1-.25 1L6.6 10.8Z" />
              </svg>
              <span>(+91)-012-345-6789</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6}>
                <rect x="7" y="2" width="10" height="20" rx="2" />
                <path d="M11 18h2" />
              </svg>
              <span>(+91) 9876-543-210</span>
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6}>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m4 6.5 8 6 8-6" />
              </svg>
              <span>support@automize.com</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="wrap footer-bottom-inner">
          <p className="footer-copy">
            &copy; {new Date().getFullYear()} Automize. All rights reserved.
          </p>

          <div className="footer-pay">
            {PAY_METHODS.map((method) => (
              <span key={method.name} className="footer-paychip" title={method.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={encodeURI(method.logo)} alt={method.name} />
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
