"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api, useCustomer, type Customer } from "@/lib/customer-context";
import { useUI, type AuthMode } from "./UIProvider";

type Mode = AuthMode | "forgot";
type Done = { title: string; text: string };

export function AuthModal() {
  const { authOpen, authMode, closeAuth } = useUI();
  const { setCustomer } = useCustomer();
  const [mode, setMode] = useState<Mode>(authMode);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Done | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (authOpen) {
      setMode(authMode);
      setError("");
      setDone(null);
    }
  }, [authOpen, authMode]);

  useEffect(() => {
    if (!authOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeAuth();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [authOpen, closeAuth]);

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setDone(null);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    if (mode === "register") {
      if (password.length < 8) return setError("Password must be at least 8 characters.");
      if (password !== String(data.get("confirm") ?? "")) return setError("Passwords do not match.");
    }
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        const res = await api<{ customer: Customer | null }>("/api/auth/login", { method: "POST", body: { email, password } });
        setCustomer(res.customer);
        setDone({ title: "Welcome back", text: "You are signed in." });
      } else if (mode === "register") {
        const [firstName, ...rest] = String(data.get("name") ?? "").trim().split(/\s+/);
        const res = await api<{ needsVerification: boolean; customer?: Customer | null }>("/api/auth/signup", {
          method: "POST",
          body: { email, password, firstName, lastName: rest.join(" ") },
        });
        if (res.needsVerification) {
          setDone({
            title: "Check your email",
            text: `We sent a confirmation link to ${email}. Click it to activate your account, then sign in.`,
          });
        } else {
          setCustomer(res.customer ?? null);
          setDone({ title: "Account created", text: "Thanks for joining Partslk." });
        }
      } else {
        await api("/api/auth/forgot", { method: "POST", body: { email } });
        setDone({
          title: "Check your email",
          text: "If an account exists for that address, we've sent a link to reset your password.",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const isRegister = mode === "register";
  const isForgot = mode === "forgot";

  return (
    <div className={`authm-overlay${authOpen ? " open" : ""}`} onClick={closeAuth} aria-hidden={!authOpen}>
      <div
        className="authm"
        role="dialog"
        aria-modal="true"
        aria-label={isRegister ? "Register" : isForgot ? "Reset password" : "Sign in"}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="authm-close" type="button" onClick={closeAuth} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2}>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {!isForgot && (
          <div className="authm-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={!isRegister}
              className={!isRegister ? "is-active" : ""}
              onClick={() => switchMode("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isRegister}
              className={isRegister ? "is-active" : ""}
              onClick={() => switchMode("register")}
            >
              Register
            </button>
          </div>
        )}

        {done ? (
          <div className="authm-done">
            <h2>{done.title}</h2>
            <p>{done.text}</p>
            <button type="button" className="authm-submit" onClick={closeAuth}>
              {mode === "login" || (isRegister && done.title === "Account created") ? "Continue shopping" : "Close"}
            </button>
          </div>
        ) : (
          <form className="authm-form" onSubmit={onSubmit}>
            <h2>{isRegister ? "Create your account" : isForgot ? "Reset your password" : "Sign in to your account"}</h2>

            {isRegister && (
              <label>
                Full name
                <input name="name" type="text" autoComplete="name" required />
              </label>
            )}
            <label>
              Email address
              <input name="email" type="email" autoComplete="email" required />
            </label>
            {!isForgot && (
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  required
                />
              </label>
            )}
            {isRegister && (
              <label>
                Confirm password
                <input name="confirm" type="password" autoComplete="new-password" required />
              </label>
            )}

            {error && <p className="authm-error">{error}</p>}

            {mode === "login" && (
              <button type="button" className="authm-forgot" onClick={() => switchMode("forgot")}>
                Forgot password?
              </button>
            )}

            <button type="submit" className="authm-submit" disabled={busy}>
              {busy ? "Please wait…" : isRegister ? "Register" : isForgot ? "Send reset link" : "Sign in"}
            </button>

            <p className="authm-switch">
              {isForgot ? (
                <button type="button" onClick={() => switchMode("login")}>
                  Back to sign in
                </button>
              ) : (
                <>
                  {isRegister ? "Already have an account?" : "New to Partslk?"}{" "}
                  <button type="button" onClick={() => switchMode(isRegister ? "login" : "register")}>
                    {isRegister ? "Sign in" : "Register"}
                  </button>
                </>
              )}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
