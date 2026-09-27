// Server-side data layer for the "Ship to" country selector.
//
// Previously this fetched restcountries.com's v3.1 "all" endpoint live. That API
// has since been deprecated (it now returns HTTP 200 with `{ success: false }`
// instead of the country array, and the "v5" successor requires a paid API key),
// which made every page load fail with a 502. Rather than depend on a third-party
// API for a list that changes essentially never, the data is bundled at build time
// in countries-data.json (generated from the open mledoze/countries dataset) and
// served directly — no network call, so this can't fail at runtime.

import countries from "./countries-data.json";

export type Country = {
  code: string; // ISO 3166-1 alpha-2, e.g. "LK"
  name: string; // common name, e.g. "Sri Lanka"
  flagEmoji: string; // 🇱🇰 (note: Windows renders these as letters, not flags)
  flagSvg: string; // URL to an SVG flag — preferred for crisp, cross-platform flags
  currencyCode: string; // e.g. "LKR" (first listed currency)
};

/** Return the bundled country list, sorted alphabetically by name. */
export async function getCountries(): Promise<Country[]> {
  return countries as Country[];
}
