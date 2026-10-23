"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { api, useCustomer } from "@/lib/customer-context";

/**
 * Landing page for links in Supabase emails. Supabase appends the tokens to the URL *hash*
 * (never sent to the server), so this page reads them and hands them to our API:
 *  - email confirmation / magic link -> /api/auth/session sets our cookies, then /my-account
 *  - password recovery               -> forwards to /reset-password (hash preserved)
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { refresh } = useCustomer();
  const [message, setMessage] = useState("Signing you in…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const fail = (text: string) => {
      setMessage(text);
      setFailed(true);
    };

    if (params.get("error_description") || params.get("error")) {
      return fail((params.get("error_description") ?? "This link is invalid or has expired.").replace(/\+/g, " "));
    }
    const access = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!access || !refreshToken) return fail("This link is invalid or has expired.");

    if (params.get("type") === "recovery") {
      router.replace(`/reset-password#access_token=${encodeURIComponent(access)}`);
      return;
    }

    api("/api/auth/session", { method: "POST", body: { access_token: access, refresh_token: refreshToken } })
      .then(async () => {
        window.history.replaceState(null, "", window.location.pathname); // drop tokens from the address bar
        await refresh();
        router.replace("/my-account");
      })
      .catch((e) => fail(e instanceof Error ? e.message : "This link is invalid or has expired."));
  }, [router, refresh]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="wrap" style={{ padding: "80px 0", textAlign: "center" }}>
        <div className="acc-notice" style={{ justifyContent: "center" }}>
          <span>{message}</span>
          {failed && (
            <Link href="/" className="acc-btn">
              Back to shop
            </Link>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
