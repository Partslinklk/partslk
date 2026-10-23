"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/customer-context";
import Image from "next/image";

const STORAGE_KEY = "newsletter-popup-dismissed";

export function NewsletterPopup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [dontShow, setDontShow] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        if (localStorage.getItem(STORAGE_KEY) === "1") return;
      } catch {}
      setOpen(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dontShow]);

  function close() {
    if (dontShow || submitted) {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {}
    }
    setOpen(false);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;
    const website = String(new FormData(e.currentTarget).get("website") ?? "");
    setSending(true);
    setError("");
    try {
      await api("/api/newsletter", { method: "POST", body: { email: email.trim(), source: "popup", website } });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not subscribe. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="nl-overlay" onClick={close}>
      <div
        className="nl-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nl-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="nl-close" type="button" onClick={close} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2}>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="nl-img">
          <Image
            src="/newsletter-popup.webp"
            alt=""
            fill
            sizes="(max-width: 720px) 0px, 440px"
            style={{ objectFit: "cover" }}
            priority
          />
        </div>

        <div className="nl-body">
          {submitted ? (
            <>
              <h2 id="nl-title">Thank you!</h2>
              <p className="nl-sub">
                We&apos;ll email you at <strong>{email}</strong> as soon as the
                website is ready.
              </p>
              <button className="nl-btn" type="button" onClick={close}>
                CLOSE
              </button>
            </>
          ) : (
            <>
              <h2 id="nl-title">Our website is under development</h2>
              <p className="nl-sub">
                Enter your email and we&apos;ll update you as soon as development
                is done.
              </p>
              <form className="nl-form" onSubmit={onSubmit}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  aria-label="Email address"
                />
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  style={{ position: "absolute", left: "-10000px", width: 1, height: 1, opacity: 0 }}
                />
                <button className="nl-btn" type="submit" disabled={sending}>
                  {sending ? "..." : "NOTIFY ME"}
                </button>
              </form>
              {error && <p className="nl-note" style={{ color: "#dc2626" }}>{error}</p>}
              <p className="nl-note">By subscribing, you agree to our privacy policy.</p>
              <label className="nl-check">
                <input
                  type="checkbox"
                  checked={dontShow}
                  onChange={(e) => setDontShow(e.target.checked)}
                />
                Don&apos;t show this popup again
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
