"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BRAND_OPTIONS, CATEGORY_OPTIONS, PRICE_BANDS } from "@/lib/products-catalog";

export function HeroFilters() {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (brand) params.set("brand", brand);
    if (price) params.set("price", price);
    const qs = params.toString();
    router.push(qs ? `/products?${qs}` : "/products");
  };

  return (
    <form className="hero-filters" onSubmit={onSubmit} aria-label="Find parts">
      <label className="hero-filter">
        <span>Category</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="hero-filter">
        <span>Brand</span>
        <select value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="">All Brands</option>
          {BRAND_OPTIONS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </label>
      <label className="hero-filter">
        <span>Price</span>
        <select value={price} onChange={(e) => setPrice(e.target.value)}>
          <option value="">Any Price</option>
          {PRICE_BANDS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="hero-filters-btn">
        Search Parts
      </button>
    </form>
  );
}
