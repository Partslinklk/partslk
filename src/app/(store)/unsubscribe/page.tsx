"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { api } from "@/lib/customer-context";

const subscribe = () => () => {};
const readParams = () => window.location.search;

/** Landing page for the unsubscribe link in newsletter emails. A button (POST) confirms it. */
export default function UnsubscribePage() {
  const search = useSyncExternalStore(subscribe, readParams, () => null);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const params = new URLSearchParams(search ?? "");
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";

  async function confirm() {
    setState("busy");
    try {
      await api("/api/newsletter/unsubscribe", { method: "POST", body: { email, token } });
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unsubscribe.");
      setState("error");
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="wrap" style={{ padding: "80px 0", maxWidth: 560 }}>
        {search === null ? null : !email || !token ? (
          <div className="acc-notice">
            <span>This unsubscribe link isn&apos;t valid.</span>
            <Link href="/" className="acc-btn">
              Back to shop
            </Link>
          </div>
        ) : state === "done" ? (
          <div className="acc-notice">
            <span>You have been unsubscribed. You won&apos;t receive any more newsletters.</span>
            <Link href="/" className="acc-btn">
              Back to shop
            </Link>
          </div>
        ) : (
          <div className="acc-panel">
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>Unsubscribe</h1>
            <p>
              Stop sending newsletters to <strong>{email}</strong>?
            </p>
            {state === "error" && <p className="authm-error">{error}</p>}
            <button type="button" className="acc-btn acc-btn-solo" onClick={confirm} disabled={state === "busy"}>
              {state === "busy" ? "Working..." : "Yes, unsubscribe me"}
            </button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
