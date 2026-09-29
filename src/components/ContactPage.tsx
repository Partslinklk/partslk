"use client";

import Link from "next/link";
import { useState } from "react";

const STORE_ADDRESS = "60 29th Street San Francisco, 507-Union Trade Center";
const MAP_SRC = `https://maps.google.com/maps?q=${encodeURIComponent(STORE_ADDRESS)}&z=13&output=embed`;

const INFO_ITEMS = [
  {
    label: "60 29th San Francisco, 507 - Union Trade Center",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6}>
        <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
  {
    label: (
      <>
        Call us : <strong>9876-543-210</strong>
      </>
    ),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6}>
        <path d="M6.6 10.8a15.9 15.9 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 9 9 0 0 0 2.8.45 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A16 16 0 0 1 3 5a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 9 9 0 0 0 .45 2.8 1 1 0 0 1-.25 1L6.6 10.8Z" />
      </svg>
    ),
  },
  {
    label: (
      <>
        Mail us : <strong>support@automize.com</strong>
      </>
    ),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 6.5 8 6 8-6" />
      </svg>
    ),
  },
  {
    label: (
      <>
        Open time : <strong>10:00AM &ndash; 6:00PM</strong>
      </>
    ),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.6}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.2 2" />
      </svg>
    ),
  },
];

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      <section className="sr-titleband">
        <div className="wrap">
          <div className="sr-crumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <span className="crumb-now">Contact Us</span>
          </div>
          <div className="sr-resulthead">
            <h1>Contact Us</h1>
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="ct-layout">
          <div className="ct-map">
            <iframe
              src={MAP_SRC}
              title="Store location"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <div className="ct-form-col">
            <h2 className="ct-form-title">Get In Touch With Us</h2>
            <p className="ct-form-sub">If you wish to directly reach us, Please fill out the form below -</p>

            {submitted ? (
              <p className="pdp-reviewform-thanks">Thanks — your message has been sent. We&apos;ll get back to you shortly.</p>
            ) : (
              <form className="ct-form" onSubmit={handleSubmit}>
                <div className="pdp-reviewform-field">
                  <label htmlFor="ct-name">Your name</label>
                  <input id="ct-name" type="text" name="name" required />
                </div>

                <div className="pdp-reviewform-field">
                  <label htmlFor="ct-email">Your email</label>
                  <input id="ct-email" type="email" name="email" required />
                </div>

                <div className="pdp-reviewform-field">
                  <label htmlFor="ct-message">Your message (optional)</label>
                  <textarea id="ct-message" name="message" rows={6} />
                </div>

                <button type="submit" className="pdp-reviewform-submit">
                  Submit
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="ct-infobar">
        <div className="wrap ct-infobar-inner">
          {INFO_ITEMS.map((item, i) => (
            <div className="ct-info-item" key={i}>
              <span className="ct-info-ico">{item.icon}</span>
              <span className="ct-info-text">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
