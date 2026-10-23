"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";

/** The slice of Stripe.js that we use. */
type StripeElement = { mount: (target: HTMLElement) => void; destroy: () => void; on: (event: "change", cb: (e: { error?: { message?: string } }) => void) => void };
type StripeJs = {
  elements: (o?: object) => { create: (type: "cardNumber" | "cardExpiry" | "cardCvc", o?: object) => StripeElement };
  confirmCardPayment: (
    clientSecret: string,
    data: { payment_method: { card: StripeElement; billing_details?: object } },
  ) => Promise<{ error?: { message?: string }; paymentIntent?: { id: string; status: string } }>;
};

declare global {
  interface Window {
    Stripe?: (publishableKey: string) => StripeJs;
  }
}

export type StripeCardApi = {
  /** Confirms the card with Stripe. Resolves with the PaymentIntent id; rejects with a customer-readable message. */
  pay: (clientSecret: string, billing?: object) => Promise<string>;
};

type Props = {
  apiRef: MutableRefObject<StripeCardApi | null>;
  /** Reports whether the card boxes could be shown (false: the page redirects to Stripe's hosted page instead). */
  onReady: (ready: boolean) => void;
};

let sdkPromise: Promise<void> | undefined;

function loadStripeJs(): Promise<void> {
  if (window.Stripe) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://js.stripe.com/v3/";
    s.async = true;
    s.onload = () => (window.Stripe ? resolve() : reject(new Error("Stripe didn't load.")));
    s.onerror = () => reject(new Error("Stripe couldn't be reached."));
    document.head.appendChild(s);
  });
  sdkPromise.catch(() => (sdkPromise = undefined));
  return sdkPromise;
}

const style = {
  base: { fontSize: "16px", fontFamily: "inherit", color: "#1f2933", "::placeholder": { color: "#9aa5b1" } },
  invalid: { color: "#dc2626" },
};

/**
 * Card number / expiry / CVC rendered by Stripe inside iframes on our checkout page: no redirect, and card details go
 * straight to Stripe (they never touch our server). Name, email and address are not asked again.
 */
export function StripeCardFields({ apiRef, onReady }: Props) {
  const numberRef = useRef<HTMLDivElement>(null);
  const expiryRef = useRef<HTMLDivElement>(null);
  const cvcRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [fieldError, setFieldError] = useState("");
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  });

  useEffect(() => {
    let cancelled = false;
    const mounted: StripeElement[] = [];
    (async () => {
      try {
        const cfg = (await (await fetch("/api/stripe/config")).json()) as { enabled?: boolean; publishableKey?: string };
        if (!cfg.enabled || !cfg.publishableKey) throw new Error("Stripe isn't configured");
        await loadStripeJs();
        if (cancelled) return;
        const stripe = window.Stripe!(cfg.publishableKey);
        const elements = stripe.elements();
        const number = elements.create("cardNumber", { style, placeholder: "Card number", showIcon: true });
        const expiry = elements.create("cardExpiry", { style, placeholder: "MM / YY" });
        const cvc = elements.create("cardCvc", { style, placeholder: "CVC" });
        for (const [el, host] of [[number, numberRef], [expiry, expiryRef], [cvc, cvcRef]] as const) {
          el.mount(host.current!);
          el.on("change", (e) => setFieldError(e.error?.message ?? ""));
          mounted.push(el);
        }
        apiRef.current = {
          pay: async (clientSecret, billing) => {
            const result = await stripe.confirmCardPayment(clientSecret, { payment_method: { card: number, billing_details: billing } });
            if (result.error || !result.paymentIntent) throw new Error(result.error?.message || "Your card couldn't be processed.");
            return result.paymentIntent.id;
          },
        };
        setStatus("ready");
        onReadyRef.current(true);
      } catch {
        if (cancelled) return;
        apiRef.current = null;
        setStatus("unavailable");
        onReadyRef.current(false);
      }
    })();
    const ref = apiRef;
    return () => {
      cancelled = true;
      ref.current = null;
      mounted.forEach((el) => el.destroy());
    };
  }, [apiRef]);

  if (status === "unavailable") return null;

  return (
    <div className="ck-cardfields" aria-busy={status === "loading"}>
      {status === "loading" && <p className="ck-pay-note">Loading secure card fields…</p>}
      <div className="ck-cf-box" ref={numberRef} aria-label="Card number" />
      <div className="ck-cf-row">
        <div className="ck-cf-box" ref={expiryRef} aria-label="Expiry date" />
        <div className="ck-cf-box" ref={cvcRef} aria-label="Card security code" />
      </div>
      {fieldError && <p className="ck-error">{fieldError}</p>}
    </div>
  );
}
