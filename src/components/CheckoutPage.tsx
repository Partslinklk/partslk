"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api, useCustomer } from "@/lib/customer-context";
import { openPayHere, type PayHerePayment } from "./PayHerePopup";
import { StripeCardFields, type StripeCardApi } from "./StripeCardFields";
import { useUI } from "./UIProvider";
import { ImageSlot } from "./ImageSlot";
import { formatPrice } from "@/lib/format-price";

const noopSubscribe = () => () => {};
const cancelledFlag = () => new URLSearchParams(window.location.search).get("cancelled") === "1";

type ShippingOption = { id: string; label: string; cost: number };
type PaymentOption = { id: string; label: string; note: string };
type AppliedCoupon = { code: string; discount: number };
type PlacedOrder = { id: string; lookupToken: string; paymentUrl?: string; clientSecret?: string; payhere?: PayHerePayment; error?: string };

type SavedAddress = { firstName: string; lastName: string; phone: string; country: string; address: string; postcode: string; isDefault: boolean };

type Errors = Partial<Record<"firstName" | "phone" | "country" | "address" | "postcode" | "email", string>>;

export function CheckoutPage({ countries }: { countries: { code: string; name: string }[] }) {
  const { cartItems, clearCart } = useUI();
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shippingId, setShippingId] = useState("");
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([]);
  const [payment, setPayment] = useState("");
  const [country, setCountry] = useState("LK");
  const [shipDifferent, setShipDifferent] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promo, setPromo] = useState("");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [promoError, setPromoError] = useState("");
  const [applying, setApplying] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paidNote, setPaidNote] = useState<string | null>(null);
  // true when Stripe sent the customer back with ?cancelled=1
  const cancelledNote = useSyncExternalStore(noopSubscribe, cancelledFlag, () => false);
  const [placing, setPlacing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Stripe card boxes on this page (null = still loading, false = not set up -> redirect to Stripe's hosted page)
  const [stripeReady, setStripeReady] = useState<boolean | null>(null);
  const stripeApi = useRef<StripeCardApi | null>(null);
  const pendingRef = useRef<{ orderId: string; token: string } | null>(null);

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
  // Display only: the server recomputes prices, shipping and the promo discount when the order is placed.
  const activeShipping = shippingOptions.find((o) => o.id === shippingId) ?? shippingOptions[0];
  const discount = coupon ? Math.min(coupon.discount, subtotal) : 0;
  const total = subtotal - discount + (activeShipping?.cost ?? 0);

  // Signed-in customers: fill the billing form from their profile and default saved address (only fields still empty).
  const { customer } = useCustomer();
  const customerId = customer?.id;
  const prefilledFor = useRef<string | null>(null);
  useEffect(() => {
    if (!customer || !customerId || prefilledFor.current === customerId || !hasCart || orderId) return;
    prefilledFor.current = customerId;
    let cancelled = false;
    api<SavedAddress[]>("/api/me/addresses")
      .catch(() => [] as SavedAddress[])
      .then((list) => {
        if (cancelled) return;
        const a = list.find((x) => x.isDefault) ?? list[0];
        const values: Record<string, string> = {
          firstName: a?.firstName || customer.firstName,
          lastName: a?.lastName || customer.lastName,
          phone: a?.phone || customer.phone,
          email: customer.email,
          address: a?.address ?? "",
          postcode: a?.postcode ?? "",
        };
        const form = leftRef.current?.closest("form");
        if (!form) return;
        for (const [name, value] of Object.entries(values)) {
          const el = form.elements.namedItem(name);
          if (el instanceof HTMLInputElement && !el.value && value) el.value = value;
        }
        const select = form.elements.namedItem("country");
        if (a?.country && select instanceof HTMLSelectElement && countries.some((c) => c.code === a.country)) {
          select.value = a.country;
          setCountry(a.country);
        }
      });
    return () => {
      cancelled = true;
      prefilledFor.current = null;
    };
  }, [customer, customerId, hasCart, orderId, countries]);

  // Payment methods (card only when Stripe is configured).
  useEffect(() => {
    api<PaymentOption[]>("/api/payment-methods")
      .then((list) => {
        setPaymentOptions(list);
        setPayment((cur) => cur || list[0]?.id || "");
      })
      .catch(() => undefined);
  }, []);

  // Shipping options for this subtotal and destination.
  useEffect(() => {
    let cancelled = false;
    api<ShippingOption[]>(`/api/shipping-methods?country=${encodeURIComponent(country)}&subtotal=${subtotal}`)
      .then((list) => {
        if (cancelled) return;
        setShippingOptions(list);
        setShippingId((cur) => (list.some((o) => o.id === cur) ? cur : list[0]?.id ?? ""));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [country, subtotal]);

  // Back from Stripe: ?paid=<id>&token=<lookup token> (success) or ?cancelled=1.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const paid = q.get("paid");
    const token = q.get("token");
    if (!paid || !token) return;
    api<{ id: string; paymentStatus: string }>(`/api/orders/${encodeURIComponent(paid)}?token=${encodeURIComponent(token)}`)
      .then((o) => {
        setOrderId(o.id);
        setPaidNote(o.paymentStatus === "paid" ? "Payment received - thank you!" : "We are confirming your payment; this can take a minute.");
        clearCart();
        window.history.replaceState(null, "", window.location.pathname);
      })
      .catch(() => undefined);
  }, [clearCart]);

  async function applyPromo() {
    setApplying(true);
    setPromoError("");
    try {
      const r = await api<{ code: string; discount: number }>("/api/coupons/validate", { method: "POST", body: { code: promo, subtotal } });
      setCoupon({ code: r.code, discount: r.discount });
    } catch (err) {
      setCoupon(null);
      setPromoError(err instanceof Error ? err.message : "That promo code is not valid.");
    } finally {
      setApplying(false);
    }
  }

  /** The card was refused (or something failed) after stock was reserved: release the order straight away. */
  async function abandonPending() {
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) {
      await fetch("/api/payments/abandon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: pending.orderId, token: pending.token }),
      }).catch(() => undefined);
    }
  }

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

    const payload = {
      customer: { firstName: get("firstName"), lastName: get("lastName"), email: get("email"), phone: get("phone") },
      address: {
        country: get("country"),
        address: shipDifferent && get("shipAddress") ? get("shipAddress") : get("address"),
        city: shipDifferent ? get("shipCity") : "",
        postcode: shipDifferent && get("shipPostcode") ? get("shipPostcode") : get("postcode"),
      },
      items: cartItems.map(({ id, qty }) => ({ id, qty })),
      shippingId: activeShipping?.id ?? "",
      couponCode: coupon?.code,
      payment,
      note: get("notes"),
    };

    // Card typed into Stripe's boxes on this page: create the order + PaymentIntent, confirm in the browser, verify on the server.
    if (payment === "card" && stripeReady) {
      if (!stripeApi.current) return setSubmitError("The card fields are still loading, please try again in a moment.");
      pendingRef.current = null;
      setPlacing(true);
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, cardFields: true }),
        });
        const placed = (await res.json()) as PlacedOrder;
        if (!res.ok || !placed.id || !placed.clientSecret) throw new Error(placed.error || "Could not start the card payment.");
        pendingRef.current = { orderId: placed.id, token: placed.lookupToken };
        const paymentIntentId = await stripeApi.current.pay(placed.clientSecret, {
          name: `${get("firstName")} ${get("lastName")}`.trim(),
          email: get("email"),
          phone: get("phone"),
          address: { line1: get("address"), postal_code: get("postcode"), country: get("country") },
        });
        const done = await fetch("/api/stripe/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: placed.id, paymentIntentId }),
        });
        const result = (await done.json()) as { state?: string; error?: string };
        if (!done.ok) throw new Error(result.error || "We couldn't confirm the payment.");
        pendingRef.current = null;
        setPaidNote(result.state === "paid" ? "Payment received - thank you!" : "We are confirming your payment; this can take a minute.");
        setOrderId(placed.id);
        clearCart();
      } catch (err) {
        await abandonPending();
        setSubmitError(err instanceof Error && err.message ? err.message : "Your card couldn't be processed. Please check the details or try another card.");
      } finally {
        setPlacing(false);
      }
      return;
    }

    setPlacing(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as PlacedOrder;
      if (!res.ok || !json.id) throw new Error(json.error || "Could not place the order.");
      if (json.payhere) {
        // PayHere: its payment window opens on top of this page. The order is marked paid by PayHere's signed notification.
        pendingRef.current = { orderId: json.id, token: json.lookupToken };
        const outcome = await openPayHere(json.payhere);
        if (outcome === "dismissed") {
          await abandonPending();
          setSubmitError("The payment window was closed before paying. Your order was not placed. You can try again.");
          return;
        }
        // Only show "order placed" once our server has PayHere's signed confirmation (poll for up to ~40s).
        let paid = false;
        for (let i = 0; i < 20 && !paid; i++) {
          if (i) await new Promise((r) => setTimeout(r, 2000));
          const o = await api<{ paymentStatus: string }>(`/api/orders/${encodeURIComponent(json.id)}?token=${encodeURIComponent(json.lookupToken)}`).catch(() => null);
          paid = o?.paymentStatus === "paid";
        }
        pendingRef.current = null;
        setPaidNote(paid ? "Payment received - thank you!" : "Payment received - we are still confirming it; this can take a minute.");
        setOrderId(json.id);
        clearCart();
        return;
      }
      if (json.paymentUrl) {
        // Card: hand over to Stripe. The cart stays until the payment comes back successful.
        window.location.href = json.paymentUrl;
        return;
      }
      setOrderId(json.id);
      clearCart();
    } catch (err) {
      await abandonPending();
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
              Order <strong>{orderId}</strong> is confirmed. {paidNote ?? "We will email you the details shortly."}
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
        {cancelledNote && (
          <p className="ck-error" style={{ margin: "16px 0" }}>
            Your card payment was cancelled. Your items are still in your cart - you can try again or choose another payment method.
          </p>
        )}
        <form
          className="ck-layout"
          onSubmit={handleSubmit}
          onChange={(e) => {
            const t = e.target;
            if (t instanceof HTMLSelectElement && t.name === "country") setCountry(t.value);
          }}
          noValidate
        >
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
                {shippingOptions.map((o) => (
                  <label className="ck-radio" key={o.id}>
                    <input
                      type="radio"
                      name="shipping"
                      checked={activeShipping?.id === o.id}
                      onChange={() => setShippingId(o.id)}
                    />
                    <span>{o.label}</span>
                    {o.cost > 0 && <em>{formatPrice(o.cost)}</em>}
                  </label>
                ))}
                {!shippingOptions.length && <p className="ck-pay-note">No shipping method is available for this order.</p>}
              </div>

              {coupon && (
                <div className="ck-total" style={{ fontSize: 14 }}>
                  <span>Promo {coupon.code}</span>
                  <strong>-{formatPrice(discount)}</strong>
                </div>
              )}
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
                    <button type="button" className="ck-promo-apply" disabled={!promo.trim() || applying} onClick={applyPromo}>
                      {applying ? "..." : "Apply"}
                    </button>
                  </div>
                )}
                {promoError && <p className="ck-error">{promoError}</p>}
              </div>

              <div className="ck-pay">
                {paymentOptions.map((m) => (
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
                    {m.id === "card" && payment === "card" && <StripeCardFields apiRef={stripeApi} onReady={setStripeReady} />}
                  </div>
                ))}

                <p className="ck-privacy">
                  Your personal data will be used to process your order, support your experience throughout this
                  website, and for other purposes described in our <Link href="/faqs">privacy policy</Link>.
                </p>

                {submitError && <p className="ck-error">{submitError}</p>}
                <button type="submit" className="checkout-btn ck-place" disabled={placing || !payment || !activeShipping || (payment === "card" && stripeReady === null)}>
                  {placing ? "PLACING ORDER…" : "PLACE ORDER"}
                </button>

                <div className="ck-secure">
                  <span>Guaranteed Safe And Secure Checkout</span>
                  <div className="ck-secure-logos">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/Visa_Inc._logo_(2021–present).svg" alt="Visa" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/Mastercard_2019_logo.svg" alt="Mastercard" />
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
