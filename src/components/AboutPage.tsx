"use client";

import Link from "next/link";
import { useState } from "react";

const TABS = [
  {
    id: "development",
    label: "Development",
    lead: "Partslk",
    body: " started with a simple idea: make it easy for every driver to find genuine parts that fit. What began as a small catalogue has grown into a full marketplace covering thousands of makes, models and categories, backed by a fitment guide that takes the guesswork out of ordering.",
    more: "We keep investing in better search, faster shipping and clearer product information, so you spend less time hunting for the right part and more time on the road.",
  },
  {
    id: "team",
    label: "Qualified team",
    lead: "Our team",
    body: " is made up of mechanics, parts specialists and customer support staff who know cars inside out. Every question about compatibility, installation or returns is answered by someone who works with these parts every day.",
    more: "From sourcing to shipping, each step is handled by people who care about getting the right part to your door, on time and in perfect condition.",
  },
  {
    id: "strategy",
    label: "Strategy",
    lead: "Our strategy",
    body: " is built on three things: genuine parts from trusted suppliers, fair prices that beat the competition, and fast, reliable delivery. We work directly with manufacturers to keep quality high and costs low.",
    more: "As we grow, we are expanding our range, adding trade accounts for workshops, and improving every part of the buying experience.",
  },
];

export function AboutPage() {
  const [active, setActive] = useState("strategy");
  const current = TABS.find((t) => t.id === active) ?? TABS[0];

  return (
    <>
      <section className="sr-titleband">
        <div className="wrap">
          <div className="sr-crumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <span className="crumb-now">About Us</span>
          </div>
          <div className="sr-resulthead">
            <h1>About Us</h1>
          </div>
        </div>
      </section>

      <div className="wrap about-wrap">
        <div className="about-tabs" role="tablist" aria-label="About Partslk">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`about-tab-${t.id}`}
              aria-selected={active === t.id}
              aria-controls="about-panel"
              className={`about-tab${active === t.id ? " is-active" : ""}`}
              onClick={() => setActive(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="about-panel" id="about-panel" role="tabpanel" aria-labelledby={`about-tab-${current.id}`}>
          <p>
            <strong>{current.lead}</strong>
            {current.body}
          </p>
          <p>{current.more}</p>
        </div>
      </div>
    </>
  );
}
