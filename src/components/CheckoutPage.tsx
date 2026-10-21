"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useUI } from "./UIProvider";
import { ImageSlot } from "./ImageSlot";
import { formatPrice } from "@/lib/format-price";

const FREE_DELIVERY_THRESHOLD = 100;

const SHIPPING_OPTIONS = [
  { id: "free", label: "Free shipping", cost: 0 },
  { id: "pickup", label: "Local pickup", cost: 5 },
  { id: "flat", label: "Flat rate", cost: 10 },
] as const;

const PAYMENT_METHODS = [
  { id: "bank", label: "Direct bank transfer", note: "Make your payment directly into our bank account. Use your order ID as the payment reference." },
  { id: "check", label: "Check payments", note: "Please send a check to Store Name, Store Street, Store Town, Store State / County, Store Postcode." },
  { id: "cod", label: "Cash on delivery", note: "Pay with cash upon delivery." },
] as const;

type ShippingId = (typeof SHIPPING_OPTIONS)[number]["id"];
type PaymentId = (typeof PAYMENT_METHODS)[number]["id"];
type Errors = Partial<Record<"firstName" | "phone" | "country" | "address" | "postcode" | "email", string>>;

export function CheckoutPage({ countries }: { countries: { code: string; name: string }[] }) {
  const { cartItems, clearCart } = useUI();
  const [shipping, setShipping] = useState<ShippingId>("free");
  const [payment, setPayment] = useState<PaymentId>("bank");
  const [shipDifferent, setShipDifferent] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promo, setPromo] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [orderId, setOrderId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Lock the billing form while the taller order column scrolls past, as long as it fits
  // fully on screen below the sticky header.
  const leftRef = useRef<HTMLDivElement>(null);
  const hasCart = cartItems.length > 0;
  useEffect(() => {
    const el = leftRef.current;
    if (!el) return;
    const update = () => {
      const top = Math.min(88, window.innerHeight - el.offsetHeight - 16);
      // Below the sticky category bar (~72px); if the form doesn't fit there, don't lock it.
      el.dataset.lock = top >= 76 ? "1" : "0";
      el.style.top = `${top}px`;
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [hasCart, orderId]);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const freeEligible = subtotal >= FREE_DELIVERY_THRESHOLD;

  const options = SHIPPING_OPTIONS.filter((o) => o.id !== "free" || freeEligible);
  const activeShipping = options.find((o) => o.id === shipping) ?? options[0];
  const total = subtotal + activeShipping.cost;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const get = (k: string) => String(data.get(k) ?? "").trim();

    const next: Errors = {};
    if (!get("firstName")) next.firstName = "Please enter your first name.";
    if (!/^[+\d][\d\s()-]{6,}$/.test(get("phone"))) next.phone = "Please enter a valid phone number.";
    if (!get("country")) next.country = "Please select a country.";
    if (!get("address")) next.address = "Please enter your address.";
    if (!get("postcode")) next.postcode = "Please enter your postcode.";
    if (!/^\S+@\S+\.\S+$/.test(get("email"))) next.email = "Please enter a valid email address.";
    setErrors(next);
    setSubmitError(null);
    if (Object.keys(next).length > 0) {
      document.getElementById(`ck-${Object.keys(next)[0]}`)?.focus();
      return;
    }

    setPlacing(true);
    try {
      const paymentMethod = PAYMENT_METHODS.find((m) => m.id === payment);
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { firstName: get("firstName"), lastName: get("lastName"), email: get("email"), phone: get("phone") },
          address: {
            country: get("country"),
            address: shipDifferent && get("shipAddress") ? get("shipAddress") : get("address"),
            city: shipDifferent ? get("shipCity") : "",
            postcode: shipDifferent && get("shipPostcode") ? get("shipPostcode") : get("postcode"),
          },
          items: cartItems.map(({ id, name, image, price, qty }) => ({ id, name, image, price, qty })),
          shipping: { label: activeShipping.label, cost: activeShipping.cost },
          payment: paymentMethod?.label ?? payment,
          note: get("notes"),
        }),
      });
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !json.id) throw new Error(json.error || "Could not place the order.");
      setOrderId(json.id);
      clearCart();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not place the order.");
    } finally {
      setPlacing(false);
    }
  }

  const field = (id: keyof Errors, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="ck-field">
      <label htmlFor={`ck-${id}`}>
        {label}
        <span className="ck-req"> *</span>
      </label>
      <input id={`ck-${id}`} name={id} aria-invalid={!!errors[id]} {...props} />
      {errors[id] && <p className="ck-error">{errors[id]}</p>}
    </div>
  );

  const titleBand = (
    <section className="sr-titleband">
      <div className="wrap">
        <div className="sr-crumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <span className="crumb-now">Checkout</span>
        </div>
        <div className="sr-resulthead">
          <h1>Checkout</h1>
        </div>
      </div>
    </section>
  );

  if (orderId) {
    return (
      <>
        {titleBand}
        <div className="wrap">
          <div className="ck-empty">
            <h2>Thank you! Your order has been placed.</h2>
            <p>
              Order <strong>{orderId}</strong> is confirmed. We&apos;ll email you the details shortly.
            </p>
            <Link href="/products" className="checkout-btn ck-empty-btn">
              Continue Shopping
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (cartItems.length === 0) {
    return (
      <>
        {titleBand}
        <div className="wrap">
          <div className="ck-empty">
            <h2>Your cart is empty</h2>
            <p>Add something to your cart before checking out.</p>
            <Link href="/products" className="checkout-btn ck-empty-btn">
              Start Shopping Now
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {titleBand}
      <div className="wrap">
        <form className="ck-layout" onSubmit={handleSubmit} noValidate>
          <div className="ck-left" ref={leftRef}>
            <h2 className="ck-title">Billing details</h2>
            <div className="ck-card">
              <div className="ck-row">
                {field("firstName", "First name", { autoComplete: "given-name" })}
                <div className="ck-field">
                  <label htmlFor="ck-lastName">
                    Last name<span className="ck-opt"> (optional)</span>
                  </label>
                  <input id="ck-lastName" name="lastName" autoComplete="family-name" />
                </div>
              </div>
              {field("phone", "Phone", { type: "tel", autoComplete: "tel" })}
              <div className="ck-field">
                <label htmlFor="ck-country">
                  Country / Region<span className="ck-req"> *</span>
                </label>
                <select id="ck-country" name="country" defaultValue="LK" aria-invalid={!!errors.country}>
                  <option value="">Select a country</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.country && <p className="ck-error">{errors.country}</p>}
              </div>
              {field("address", "Address", { autoComplete: "street-address" })}
              {field("postcode", "Postcode / ZIP", { autoComplete: "postal-code" })}
              {field("email", "Email address", { type: "email", autoComplete: "email" })}
            </div>

            <label className="ck-check">
              <input type="checkbox" checked={shipDifferent} onChange={(e) => setShipDifferent(e.target.checked)} />
              <span>Ship to a different address?</span>
            </label>

            {shipDifferent && (
              <div className="ck-card ck-ship-card">
                <div className="ck-field">
                  <label htmlFor="ck-shipAddress">Shipping address</label>
                  <input id="ck-shipAddress" name="shipAddress" autoComplete="shipping street-address" />
                </div>
                <div className="ck-row">
                  <div className="ck-field">
                    <label htmlFor="ck-shipCity">Town / City</label>
                    <input id="ck-shipCity" name="shipCity" autoComplete="shipping address-level2" />
                  </div>
                  <div className="ck-field">
                    <label htmlFor="ck-shipPostcode">Postcode / ZIP</label>
                    <input id="ck-shipPostcode" name="shipPostcode" autoComplete="shipping postal-code" />
                  </div>
                </div>
              </div>
            )}

            <div className="ck-field ck-notes">
              <label htmlFor="ck-notes">
                Order notes<span className="ck-opt"> (optional)</span>
              </label>
              <textarea
                id="ck-notes"
                name="notes"
                rows={3}
                placeholder="Notes about your order, e.g. special notes for delivery."
              />
            </div>
          </div>

          <aside className="ck-right">
            <div className="ck-card ck-order">
              <h2 className="ck-order-title">Your order</h2>

              <div className="ck-section">
                <h3>Product</h3>
                {cartItems.map((item) => (
                  <div className="ck-item" key={item.id}>
                    <div className="ck-item-media">
                      <ImageSlot src={item.image} alt={item.name} shape="rect" />
                      <span className="ck-item-qty">{item.qty}</span>
                    </div>
                    <p className="ck-item-name">{item.name}</p>
                    <span className="ck-item-price">{formatPrice(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>

              <div className="ck-section">
                <h3>Shipping</h3>
                {options.map((o) => (
                  <label className="ck-radio" key={o.id}>
                    <input
                      type="radio"
                      name="shipping"
                      checked={activeShipping.id === o.id}
                      onChange={() => setShipping(o.id)}
                    />
                    <span>{o.label}</span>
                    {o.cost > 0 && <em>{formatPrice(o.cost)}</em>}
                  </label>
                ))}
              </div>

              <div className="ck-total">
                <span>Total</span>
                <strong>{formatPrice(total)}</strong>
              </div>

              <div className="ck-promo">
                Have a promo code?{" "}
                <button type="button" onClick={() => setPromoOpen((v) => !v)}>
                  Click here to enter your code.
                </button>
                {promoOpen && (
                  <div className="ck-promo-form">
                    <input
                      value={promo}
                      onChange={(e) => setPromo(e.target.value)}
                      placeholder="Promo code"
                      aria-label="Promo code"
                    />
                    <button type="button" className="ck-promo-apply" disabled={!promo.trim()}>
                      Apply
                    </button>
                  </div>
                )}
              </div>

              <div className="ck-pay">
                {PAYMENT_METHODS.map((m) => (
                  <div key={m.id}>
                    <label className="ck-radio ck-radio-lg">
                      <input
                        type="radio"
                        name="payment"
                        checked={payment === m.id}
                        onChange={() => setPayment(m.id)}
                      />
                      <span>{m.label}</span>
                    </label>
                    {payment === m.id && <p className="ck-pay-note">{m.note}</p>}
                  </div>
                ))}

                <p className="ck-privacy">
                  Your personal data will be used to process your order, support your experience throughout this
                  website, and for other purposes described in our <Link href="/faqs">privacy policy</Link>.
                </p>

                {submitError && <p className="ck-error">{submitError}</p>}
                <button type="submit" className="checkout-btn ck-place" disabled={placing}>
                  {placing ? "PLACING ORDER…" : "PLACE ORDER"}
                </button>

                <div className="ck-secure">
                  <span>Guaranteed Safe And Secure Checkout</span>
                  <div className="ck-secure-logos">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/Visa_Inc._logo_(2021–present).svg" alt="Visa" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/Mastercard_2019_logo.svg" alt="Mastercard" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/PayPal.svg" alt="PayPal" />
                  </div>
                </div>
              </div>
            </div>


            <div className="ck-confidence">
              <h3>Buy with Confidence</h3>
              <p>Join over 20,000+ satisfied customers worldwide</p>
              <ul>
                <li>Secure payments, guaranteed privacy</li>
                <li>Hassle-free returns and refunds</li>
                <li>Fast and reliable shipping</li>
              </ul>
            </div>
          </aside>
        </form>
      </div>
    </>
  );
}
