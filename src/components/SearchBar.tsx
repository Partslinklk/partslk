"use client";

import { useRouter } from "next/navigation";
import { useState, type KeyboardEvent } from "react";

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function goSearch() {
    router.push(query ? `/products?q=${encodeURIComponent(query)}` : "/products");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") goSearch();
  }

  return (
    <div className="search" role="search">
      <input
        type="text"
        placeholder="Search for products, brands and more"
        aria-label="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <button
        className="search-btn"
        type="button"
        aria-label="Search"
        onClick={goSearch}
      >
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </button>
    </div>
  );
}
