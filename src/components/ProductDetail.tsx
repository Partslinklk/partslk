"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { ImageSlot } from "./ImageSlot";
import { ProductRelated } from "./ProductRelated";
import { ProductTabs } from "./ProductTabs";
import { useUI } from "./UIProvider";
import { COLOR_OPTIONS, discountPct, type ShopProduct } from "@/lib/products-catalog";
import { useStoreData } from "@/lib/store-context";
import { formatPrice } from "@/lib/format-price";
import { useWishlist } from "@/lib/wishlist-context";

const PAY_METHODS: { name: string; logo?: string }[] = [
  { name: "Visa", logo: "/Visa_Inc._logo_(2021–present).svg" },
  { name: "Mastercard", logo: "/Mastercard_2019_logo.svg" },
];
const ZOOM_FACTOR = 2.4;
const LENS_PCT = 100 / ZOOM_FACTOR;

function seededInt(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return min + (hash % (max - min + 1));
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  const full = Math.round(rating);
  return (
    <span className="stars" style={{ display: "inline-flex", gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < full ? "#F5A623" : "none"} stroke="#F5A623" strokeWidth={i < full ? 0 : 1.5}>
          <path d="M12 2l3 6.6 7 .7-5.3 4.7 1.6 6.9L12 17.3 5.7 20.9l1.6-6.9L2 9.3l7-.7Z" />
        </svg>
      ))}
    </span>
  );
}

function ChevronUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 15l6-6 6 6" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c1.2 2.8-2.6 4.2-2.6 7.8a2.6 2.6 0 0 0 5.2 0c0-.7-.2-1.3-.6-1.9 1.6 2.6 3 3.9 3 6.6a5 5 0 0 1-10 0c0-4.6 3-6.2 3-9.3 0-1.3-.5-2.1 2-3.2Z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
    </svg>
  );
}

function CoinsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <circle cx="9" cy="9" r="5" />
      <path d="M13.5 9.3c3 .4 4.8 2.1 4.8 4.2 0 2.5-2.6 4.5-5.8 4.5-2.1 0-3.9-.9-4.9-2.2" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <path d="M3 7h11v9H3z" />
      <path d="M14 10h4l3 3v3h-7z" />
      <circle cx="7.5" cy="18" r="1.7" />
      <circle cx="17.5" cy="18" r="1.7" />
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M7 3v18M17 3v18M4 9h6M14 15h6" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M20.8 7.6c0 4.4-8.8 10.8-8.8 10.8S3.2 12 3.2 7.6a4.6 4.6 0 0 1 8.8-1.9 4.6 4.6 0 0 1 8.8 1.9Z" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.3a2.6 2.6 0 1 1 3.6 2.4c-.9.4-1.4 1-1.4 2" />
      <path d="M12 17v.01" strokeLinecap="round" strokeWidth={2.4} />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="6" cy="12" r="2.3" />
      <circle cx="18" cy="6" r="2.3" />
      <circle cx="18" cy="18" r="2.3" />
      <path d="M8.1 10.7l7.7-4.3M8.1 13.3l7.7 4.3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function ProductDetail({ product }: { product: ShopProduct }) {
  const { categories: CATEGORY_OPTIONS } = useStoreData();
  const { addToCart } = useUI();
  const [activeThumb, setActiveThumb] = useState(0);
  const [activeColor, setActiveColor] = useState<string | null>(product.colors[0] ?? null);
  const [qty, setQty] = useState(1);
  const wishlist = useWishlist();
  const wish = wishlist.has(product.id);
  const [compare, setCompare] = useState(false);
  const [addedLabel, setAddedLabel] = useState(false);
  const [shareLabel, setShareLabel] = useState(false);
  const [zoomPos, setZoomPos] = useState<{ x: number; y: number } | null>(null);

  const pct = discountPct(product);
  const categoryNames = product.categories
    .map((id) => CATEGORY_OPTIONS.find((c) => c.id === id)?.name)
    .filter((name): name is string => Boolean(name));

  const stock = useMemo(() => product.stock ?? seededInt(`${product.id}:stock`, 12, 520), [product.id, product.stock]);
  const soldRecently = useMemo(() => seededInt(`${product.id}:sold`, 3, 24), [product.id]);
  const viewingNow = useMemo(() => seededInt(`${product.id}:view`, 8, 54), [product.id]);
  // Every photo the admin uploaded, cover first. A product with a single photo shows just that one (no fake duplicates).
  const thumbs = useMemo(
    () => (product.images?.length ? product.images : product.image ? [product.image] : []),
    [product.images, product.image],
  );
  const gallery = thumbs.length > 1;
  const current = Math.min(activeThumb, Math.max(0, thumbs.length - 1));

  const handleQty = (next: number) => setQty(Math.min(stock, Math.max(1, next)));

  const cartProduct = { id: product.id, name: product.name, image: product.image, price: product.price };

  const handleAddToCart = () => {
    addToCart(cartProduct, qty);
    setAddedLabel(true);
    window.setTimeout(() => setAddedLabel(false), 1600);
  };

  const handleBuyNow = () => {
    addToCart(cartProduct, qty);
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: product.name, url });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareLabel(true);
        window.setTimeout(() => setShareLabel(false), 1600);
      }
    } catch {
      // user cancelled the share sheet — nothing to do
    }
  };

  const canHoverZoom = () =>
    typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const handleStageMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canHoverZoom()) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

  const clearZoom = () => setZoomPos(null);

  const lensLeft = zoomPos ? Math.min(Math.max(zoomPos.x - LENS_PCT / 2, 0), 100 - LENS_PCT) : 0;
  const lensTop = zoomPos ? Math.min(Math.max(zoomPos.y - LENS_PCT / 2, 0), 100 - LENS_PCT) : 0;

  return (
    <>
      <div className="pdp-crumbband">
        <div className="wrap">
          <nav className="sr-crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href="/products">Shop</Link>
            {categoryNames.map((name) => (
              <Fragment key={name}>
                <span>/</span>
                <span>{name}</span>
              </Fragment>
            ))}
            <span>/</span>
            <span className="crumb-now">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="wrap">
        <div className="pdp-body">
          <div className="pdp-top">
            <div className="pdp-gallery">
              <div className={`pdp-galleryrow${gallery ? "" : " is-single"}`}>
                {gallery ? (
                <div className="pdp-thumbrail">
                  <button
                    type="button"
                    className="pdp-thumbnav"
                    aria-label="Previous image"
                    onClick={() => setActiveThumb((i) => (i - 1 + thumbs.length) % thumbs.length)}
                  >
                    <ChevronUpIcon />
                  </button>
                  <div className="pdp-thumbs">
                    {thumbs.map((src, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`pdp-thumb${current === i ? " is-active" : ""}`}
                        onClick={() => setActiveThumb(i)}
                        aria-current={current === i}
                        aria-label={`View image ${i + 1}`}
                      >
                        <ImageSlot src={src} alt={`${product.name} view ${i + 1}`} shape="rect" />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="pdp-thumbnav"
                    aria-label="Next image"
                    onClick={() => setActiveThumb((i) => (i + 1) % thumbs.length)}
                  >
                    <ChevronDownIcon />
                  </button>
                </div>
                ) : null}
                <div className="pdp-stagewrap">
                  <div className="pdp-stage" onMouseMove={handleStageMove} onMouseLeave={clearZoom}>
                    <ImageSlot src={thumbs[current]} alt={`${product.name} - image ${current + 1} of ${thumbs.length}`} shape="rect" />
                    {zoomPos ? (
                      <div
                        className="pdp-lens"
                        style={{ left: `${lensLeft}%`, top: `${lensTop}%`, width: `${LENS_PCT}%`, height: `${LENS_PCT}%` }}
                      />
                    ) : null}
                  </div>
                  {zoomPos ? (
                    <div
                      className="pdp-zoompane"
                      style={{
                        backgroundImage: `url(${JSON.stringify(thumbs[current] ?? "")})`,
                        backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                        backgroundSize: `${ZOOM_FACTOR * 100}%`,
                      }}
                    />
                  ) : null}
                </div>
              </div>

              <div className="pdp-trustrow">
                <div className="pdp-trust">
                  <ShieldIcon />
                  <span>101% Original</span>
                </div>
                <div className="pdp-trust">
                  <CoinsIcon />
                  <span>Lowest Price</span>
                </div>
                <div className="pdp-trust">
                  <TruckIcon />
                  <span>Free Shipping</span>
                </div>
              </div>
            </div>

            <div className="pdp-info">
              <p className="pdp-brand">
                Brand: <Link href={`/products?q=${encodeURIComponent(product.brand)}`}>{product.brand}</Link>
              </p>
              <h1>{product.name}</h1>

              <div className="pdp-pricerow">
                <span className="pdp-price">{formatPrice(product.price)}</span>
                {product.originalPrice ? <span className="pdp-was">{formatPrice(product.originalPrice)}</span> : null}
                {pct ? <span className="pdp-save">-{pct}%</span> : null}
                <span className="pdp-rating">
                  <StarRow rating={product.rating} size={13} /> ({product.reviewCount} review{product.reviewCount === 1 ? "" : "s"})
                </span>
              </div>

              <p className="pdp-sold">
                <FlameIcon /> {soldRecently} products sold in last 10 hours
              </p>

              <p className="pdp-desc">{product.description}</p>

              {product.colors.length ? (
                <div className="pdp-colors">
                  <p className="pdp-colors-label">Color</p>
                  <div className="pdp-swatches">
                    {product.colors.map((colorId) => {
                      const color = COLOR_OPTIONS.find((c) => c.id === colorId);
                      return (
                        <button
                          key={colorId}
                          type="button"
                          className={`pdp-swatch${activeColor === colorId ? " is-active" : ""}`}
                          style={{ background: color?.hex ?? "#ccc" }}
                          onClick={() => setActiveColor(colorId)}
                          aria-label={color?.name ?? colorId}
                          title={color?.name ?? colorId}
                        />
                      );
                    })}
                  </div>
                  {activeColor ? (
                    <button type="button" className="pdp-clear" onClick={() => setActiveColor(null)}>
                      <XIcon /> Clear
                    </button>
                  ) : null}
                </div>
              ) : null}

              <span className={`pdp-stock${stock <= 25 ? " is-low" : ""}`}>{stock} in stock</span>

              <div className="pdp-cta-row">
                <div className="pd-qty pdp-qty">
                  <button type="button" className="qty-btn" onClick={() => handleQty(qty - 1)} disabled={qty <= 1} aria-label="Decrease quantity">
                    −
                  </button>
                  <input className="qty-input" value={qty} readOnly aria-label="Quantity" />
                  <button type="button" className="qty-btn" onClick={() => handleQty(qty + 1)} disabled={qty >= stock} aria-label="Increase quantity">
                    +
                  </button>
                </div>
                <button type="button" className={`pdp-addcart${addedLabel ? " is-added" : ""}`} onClick={handleAddToCart}>
                  {addedLabel ? "Added ✓" : "Add To Cart"}
                </button>
              </div>
              <button type="button" className="pdp-buynow" onClick={handleBuyNow}>
                Buy Now
              </button>

              <div className="pdp-actions">
                <button type="button" className={`pdp-action${compare ? " is-active" : ""}`} onClick={() => setCompare((c) => !c)}>
                  <CompareIcon /> Compare
                </button>
                <button type="button" className={`pdp-action${wish ? " is-active" : ""}`} onClick={() => wishlist.toggle(product.id)} aria-pressed={wish}>
                  <HeartIcon /> Wishlist
                </button>
                <button type="button" className="pdp-action">
                  <QuestionIcon /> Ask Us
                </button>
                <button type="button" className="pdp-action" onClick={handleShare}>
                  <ShareIcon /> {shareLabel ? "Link Copied" : "Share"}
                </button>
              </div>

              <p className="pdp-viewing">
                <EyeIcon /> {viewingNow} people are viewing this right now
              </p>

              <ul className="pdp-shipinfo">
                <li>
                  <CheckIcon /> Estimated Delivery : Up to 4 business days
                </li>
                <li>
                  <CheckIcon /> Free Shipping &amp; Returns : On all orders over {formatPrice(200)}
                </li>
              </ul>

              <div className="pdp-securebox">
                <p>Guaranteed Safe And Secure Checkout</p>
                <div className="pdp-paymethods">
                  {PAY_METHODS.map((method) => (
                    <span key={method.name} className="pdp-paychip" title={method.name}>
                      {method.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={encodeURI(method.logo)} alt={method.name} />
                      ) : (
                        method.name
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <ProductTabs product={product} stock={stock} />

          <ProductRelated product={product} />
        </div>
      </div>
    </>
  );
}
