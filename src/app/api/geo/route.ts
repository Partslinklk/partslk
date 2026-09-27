import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Layered IP-based country detection. Returns { countryCode, countryName }.
// The countryName is intentionally left empty for the header-based cases — the
// client (CountrySelect) maps the 2-letter code to a name using the REST
// Countries data it already has loaded, so we never hardcode a name table here.
//
// Order (cheapest/most reliable first):
//   1) cf-ipcountry          — Cloudflare proxy sets this (no external call)
//   2) x-vercel-ip-country   — Vercel deployments set this (free, no rate limit)
//   3) ipapi.co/<ip>/json/   — non-Vercel / VPS fallback. Free tier ~1,000
//                              req/day, NO API KEY. Client session-caches the
//                              result so we don't hit it on every page nav.
//   4) "LK" (Sri Lanka)      — any miss/failure.

const FALLBACK = { countryCode: "LK", countryName: "Sri Lanka" };

function isValidCode(code: string | null | undefined): code is string {
  if (!code) return false;
  const c = code.toUpperCase();
  // Cloudflare uses "XX" (unknown) and "T1" (Tor) as non-country sentinels.
  return /^[A-Z]{2}$/.test(c) && c !== "XX" && c !== "T1";
}

function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = (fwd?.split(",")[0] || req.headers.get("x-real-ip") || "").trim();
  if (!ip) return null;
  // Skip loopback / private ranges that ipapi can't geolocate (e.g. local dev).
  if (
    ip === "::1" ||
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  ) {
    return null;
  }
  return ip;
}

export async function GET(req: NextRequest) {
  // 1) Cloudflare proxy — header is set by CF edge, no external call.
  const cf = req.headers.get("cf-ipcountry");
  if (isValidCode(cf)) {
    return NextResponse.json({ countryCode: cf.toUpperCase(), countryName: "" });
  }

  // 2) Vercel deployments — header is set by Vercel edge, free + no rate limit.
  const vercel = req.headers.get("x-vercel-ip-country");
  if (isValidCode(vercel)) {
    return NextResponse.json({ countryCode: vercel.toUpperCase(), countryName: "" });
  }

  // 3) Non-Vercel / VPS — forward the visitor's IP to ipapi (it geolocates the
  //    caller, so we must pass the real client IP rather than hitting /json/).
  try {
    const ip = clientIp(req);
    if (ip) {
      const res = await fetch(`https://ipapi.co/${ip}/json/`, {
        headers: { Accept: "application/json" },
        cache: "no-store", // per-visitor result; never share across users
      });
      if (res.ok) {
        const data = await res.json();
        // ipapi returns { error: true, reason } when rate-limited / on bad input.
        if (data && !data.error && data.country_code) {
          return NextResponse.json({
            countryCode: String(data.country_code).toUpperCase(),
            countryName: data.country_name ?? "",
          });
        }
      }
    }
  } catch {
    /* network error / rate-limit / DNS — fall through to fallback */
  }

  // 4) Fallback.
  return NextResponse.json(FALLBACK);
}
