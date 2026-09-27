import { NextResponse } from "next/server";
import { getCountries } from "@/lib/countries";

// Thin wrapper so the client <CountrySelect> can read the list without us
// threading server-fetched props through the whole (client) Navbar tree.
// getCountries() serves a bundled static list (see lib/countries.ts), so this
// always succeeds; the try/catch is just a defensive boundary — on any
// unexpected error we still return 200 with an empty list rather than a 502,
// so the selector degrades to "no results" instead of the whole call failing.
export async function GET() {
  try {
    const countries = await getCountries();
    return NextResponse.json(countries);
  } catch (err) {
    console.error("[/api/countries]", err);
    return NextResponse.json([], { status: 200 });
  }
}
