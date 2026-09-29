"use client";

import Link from "next/link";
import { useState } from "react";

const QA_ITEMS = [
  {
    q: "How can you help?",
    a: "Our support team can help you find the right part for your vehicle, track an order, or sort out a return — just send us a message and we'll get back to you fast.",
  },
  {
    q: "What is your return policy?",
    a: "Unused parts in their original packaging can be returned within 30 days of delivery for a full refund. Electrical and special-order items are covered by the manufacturer's warranty instead.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept Visa, Mastercard and PayPal at checkout. All payments are processed securely and your card details are never stored on our servers.",
  },
  {
    q: "Do you offer bulk or trade pricing?",
    a: "Yes — workshops and resellers can apply for a trade account to unlock volume discounts. Reach out through the contact form and our team will set you up.",
  },
];

const FEATURES = [
  {
    title: "Submit a task",
    text: "Open a support ticket and our team will get back to you within 24 hours.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8}>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="m8 12.5 2.5 2.5L16 9" />
      </svg>
    ),
  },
  {
    title: "Send message",
    text: "Chat with our team for quick answers to product and order questions.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8}>
        <path d="M4 5h16v11H8l-4 4V5Z" />
      </svg>
    ),
  },
  {
    title: "Trusted experience",
    text: "Thousands of verified reviews from real customers who shop with us.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c1.2-3.5 4-5.5 7-5.5s5.8 2 7 5.5" />
      </svg>
    ),
  },
];

const ACCORDION_ITEMS = [
  {
    q: "How do I track my order?",
    a: [
      "Once your order ships, you'll receive an email with a tracking link so you can follow it every step of the way. You can also check order status any time from your account dashboard.",
    ],
  },
  {
    q: "Do you ship internationally?",
    a: [
      "We currently ship across the United States and Canada, with select international shipping available at checkout for eligible parts.",
    ],
  },
  {
    q: "What is your warranty policy?",
    a: [
      "Most parts we sell are covered by the manufacturer's warranty, which typically ranges from 1 to 3 years depending on the brand and part type.",
      "If a part fails under normal use within the warranty period, contact our support team with your order number and we'll arrange a replacement or refund.",
    ],
  },
];

export function FaqPage() {
  const [openIndex, setOpenIndex] = useState(2);

  return (
    <>
      <section className="sr-titleband">
        <div className="wrap">
          <div className="sr-crumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <span className="crumb-now">FAQs</span>
          </div>
          <div className="sr-resulthead">
            <h1>FAQs</h1>
          </div>
        </div>
      </section>

      <div className="wrap">
        <div className="faq-layout">
          <div className="faq-intro">
            <span className="faq-kicker">FAQs</span>
            <h2 className="faq-heading">Frequently Asked Question</h2>
            <p className="faq-lead">
              Can&apos;t find what you&apos;re looking for? Here are the questions our customers ask
              most often about ordering, shipping and returns.
            </p>

            <div className="faq-banner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/faq-banner-768x452.jpg" alt="Frequently asked questions" />
            </div>
          </div>

          <div className="faq-qa-list">
            {QA_ITEMS.map((item) => (
              <div className="faq-qa-item" key={item.q}>
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="faq-features">
          {FEATURES.map((f) => (
            <div className="faq-feature-card" key={f.title}>
              <span className="faq-feature-ico">{f.icon}</span>
              <h4>{f.title}</h4>
              <p>{f.text}</p>
            </div>
          ))}
        </div>

        <div className="faq-accordion-section">
          <span className="faq-kicker is-center">Pick one of 3 FAQ styles</span>
          <h2 className="faq-heading is-center">Display FAQ accordions</h2>

          <div className="faq-accordion">
            {ACCORDION_ITEMS.map((item, i) => {
              const isOpen = openIndex === i;
              return (
                <div className={`faq-acc-item${isOpen ? " is-open" : ""}`} key={item.q}>
                  <button
                    type="button"
                    className="faq-acc-head"
                    onClick={() => setOpenIndex(isOpen ? -1 : i)}
                    aria-expanded={isOpen}
                  >
                    <span>{item.q}</span>
                    <span className="faq-acc-icon">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen ? (
                    <div className="faq-acc-body">
                      {item.a.map((para, pi) => (
                        <p key={pi}>{para}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
