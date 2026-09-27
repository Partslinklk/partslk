"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Country } from "@/lib/countries";

const PINNED = ["LK"]; // pinned/preferred countries, shown first
// Persisted manual choice. Only written on the popover's Save button
// (see LocaleMenu.save) — never by auto-detection.
export const STORAGE_KEY = "shipToCountry";
const GEO_CACHE_KEY = "shipToGeo"; // per-session geo cache (sessionStorage)

type Geo = { countryCode: string; countryName: string };

/** Detect country via /api/geo, cached for the session so page navs don't refetch. */
async function detectCountry(): Promise<Geo | null> {
  try {
    const cached = sessionStorage.getItem(GEO_CACHE_KEY);
    if (cached) return JSON.parse(cached) as Geo;
  } catch {
    /* sessionStorage unavailable */
  }
  try {
    const res = await fetch("/api/geo");
    if (!res.ok) return null;
    const data = (await res.json()) as Geo;
    try {
      sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
    return data;
  } catch {
    return null;
  }
}

function Flag({ country }: { country: Country }) {
  if (country.flagSvg) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={country.flagSvg}
        alt=""
        width={30}
        height={22}
        loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  }
  return <>{country.flagEmoji}</>;
}

export function CountrySelect({
  value,
  onChange,
  onManualSelect,
  ariaLabel = "Ship to",
}: {
  /** Selected country, owned by the parent so it can read it (currency/lang). */
  value: Country | null;
  /** Fires for every selection change, including the auto-detected preset. */
  onChange: (country: Country) => void;
  /** Fires ONLY when the user picks from the dropdown (lets the parent
   *  re-derive currency for a manual change vs. a preset). */
  onManualSelect?: (country: Country) => void;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  function close() {
    setOpen(false);
    setQuery("");
  }

  // Load the list once (served from the cached route handler).
  useEffect(() => {
    let alive = true;
    fetch("/api/countries")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: Country[]) => {
        if (alive) setCountries(data);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // Preset the selection once the list loads. Priority:
  //   1) the user's saved manual choice (never overridden by geo)
  //   2) IP-detected country (auto-detect on first load)
  //   3) Sri Lanka fallback
  const presetDone = useRef(false);
  useEffect(() => {
    if (presetDone.current || value || countries.length === 0) return;
    presetDone.current = true;

    const find = (code?: string | null) =>
      code ? countries.find((c) => c.code === code.toUpperCase()) : undefined;

    // 1) Manual choice from a previous visit wins.
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* localStorage unavailable */
    }
    const savedCountry = find(saved);
    if (savedCountry) {
      onChange(savedCountry);
      return;
    }

    // 2) Otherwise auto-detect by IP, falling back to (3) Sri Lanka.
    let cancelled = false;
    (async () => {
      const geo = await detectCountry();
      if (cancelled) return;
      // find() resolves the 2-letter code to a full Country (incl. name) from the
      // loaded REST Countries list — this is the code→name mapping for the
      // header-based geo cases that return an empty countryName.
      // In-memory state only; nothing persisted to localStorage here.
      onChange(find(geo?.countryCode) ?? find("LK") ?? countries[0]);
    })();
    return () => {
      cancelled = true;
    };
  }, [countries, value, onChange]);

  // Close on outside click / Escape.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Focus the search box when opening.
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  // Pinned first, then the rest — both filtered by the search query.
  const { pinned, rest } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (c: Country) =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q);
    const filtered = countries.filter(match);
    return {
      pinned: filtered.filter((c) => PINNED.includes(c.code)),
      rest: filtered.filter((c) => !PINNED.includes(c.code)),
    };
  }, [countries, query]);

  function renderOption(c: Country) {
    const selected = value?.code === c.code;
    return (
      <li key={c.code} role="option" aria-selected={selected}>
        <button
          type="button"
          className={`ship-opt${selected ? " selected" : ""}`}
          onClick={() => {
            // Update parent state; flag it as a manual pick so the parent can
            // re-derive currency. Persistence still happens on Save (LocaleMenu).
            (onManualSelect ?? onChange)(c);
            close();
          }}
        >
          <span className="ship-flag">
            <Flag country={c} />
          </span>
          <span className="ship-opt-name">{c.name}</span>
          {selected && (
            <svg className="ship-check" viewBox="0 0 24 24" fill="none" strokeWidth={2.4}>
              <path d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      </li>
    );
  }

  return (
    <div className={`ship-select${open ? " open" : ""}`} ref={ref}>
      <button
        type="button"
        className="ship-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={loading && !value}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {value ? (
          <>
            <span className="ship-flag">
              <Flag country={value} />
            </span>
            <span className="ship-code">{value.code}</span>
            <span className="ship-name">{value.name}</span>
          </>
        ) : (
          <span className="ship-name">{loading ? "Loading…" : "Select a country"}</span>
        )}
        <svg className="ship-chev" viewBox="0 0 24 24" fill="none" strokeWidth={2}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div className="ship-list" role="listbox" aria-label={ariaLabel}>
        <div className="ship-search-wrap">
          <input
            ref={searchRef}
            type="text"
            className="ship-search"
            placeholder="Search countries…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <ul className="ship-options">
          {pinned.map(renderOption)}
          {pinned.length > 0 && rest.length > 0 && <li className="ship-pin-div" aria-hidden />}
          {rest.map(renderOption)}
          {!loading && pinned.length === 0 && rest.length === 0 && (
            <li className="ship-empty">No countries found</li>
          )}
        </ul>
      </div>
    </div>
  );
}
