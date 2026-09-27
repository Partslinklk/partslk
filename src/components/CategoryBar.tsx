import Link from "next/link";

function ChevronDown() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function CategoryBar() {
  return (
    <nav className="nav-links" aria-label="Categories">
      <div className="cat-menu">
        <button className="nav-cat all-cat" type="button">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8}>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          Shop By Categories
          <svg className="all-cat-chev" viewBox="0 0 24 24" fill="none" strokeWidth={2}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      <Link className="nav-link" href="/">
        Home
      </Link>
      <button className="nav-link" type="button">
        Shop
        <ChevronDown />
      </button>
      <button className="nav-link" type="button">
        Categories
        <span className="nav-badge nav-badge-sale">Sale</span>
        <ChevronDown />
      </button>
      <button className="nav-link" type="button">
        Products
        <span className="nav-badge nav-badge-hot">Hot</span>
        <ChevronDown />
      </button>
      <button className="nav-link" type="button">
        Top deals
        <ChevronDown />
      </button>
      <button className="nav-link" type="button">
        Elements
        <ChevronDown />
      </button>

      <Link className="nav-link nav-today" href="/products">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
        Today&apos;s Deal
      </Link>
    </nav>
  );
}
