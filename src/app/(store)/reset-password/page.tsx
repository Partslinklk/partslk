"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { useUI } from "@/components/UIProvider";
import { api } from "@/lib/customer-context";

const subscribe = () => () => {};
const hashToken = () => new URLSearchParams(window.location.hash.replace(/^#/, "")).get("access_token") ?? "";

/** Set a new password using the one-time token from the reset email (arrives in the URL hash). */
export default function ResetPasswordPage() {
  const { openAuth } = useUI();
  // null on the server / first render, then the token from the URL hash (empty string when missing).
  const token = useSyncExternalStore(subscribe, hashToken, () => null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const password = String(d.get("password") ?? "");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== String(d.get("confirm") ?? "")) return setError("Passwords do not match.");
    setBusy(true);
    setError("");
    try {
      await api("/api/auth/reset", { method: "POST", body: { access_token: token, password } });
      window.history.replaceState(null, "", window.location.pathname); // the token is spent; drop it from the address bar
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="wrap" style={{ padding: "60px 0 100px", maxWidth: 480 }}>
        {token === null ? null : done ? (
          <div className="acc-notice">
            <span>Your password has been updated. You can sign in now.</span>
            <button type="button" className="acc-btn" onClick={() => openAuth("login")}>
              Sign in
            </button>
          </div>
        ) : !token ? (
          <div className="acc-notice">
            <span>This reset link is invalid or has expired.</span>
            <button type="button" className="acc-btn" onClick={() => openAuth("login")}>
              Request a new one
            </button>
          </div>
        ) : (
          <form className="acc-panel acc-form" onSubmit={onSubmit}>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>Choose a new password</h1>
            <label>
              New password
              <input name="password" type="password" autoComplete="new-password" minLength={8} required />
            </label>
            <label>
              Confirm new password
              <input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
            </label>
            {error && <p className="authm-error">{error}</p>}
            <button type="submit" className="acc-btn acc-btn-solo" disabled={busy}>
              {busy ? "Saving…" : "Update password"}
            </button>
            <Link href="/" className="acc-link">
              Back to shop
            </Link>
          </form>
        )}
      </div>
      <Footer />
    </div>
  );
}
