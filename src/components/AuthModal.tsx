"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useUI, type AuthMode } from "./UIProvider";

export function AuthModal() {
  const { authOpen, authMode, closeAuth } = useUI();
  const [mode, setMode] = useState<AuthMode>(authMode);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (authOpen) {
      setMode(authMode);
      setError("");
      setDone(false);
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

  function switchMode(next: AuthMode) {
    setMode(next);
    setError("");
    setDone(false);
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (mode === "register") {
      const password = String(data.get("password") ?? "");
      if (password.length < 8) return setError("Password must be at least 8 characters.");
      if (password !== String(data.get("confirm") ?? "")) return setError("Passwords do not match.");
    }
    setError("");
    // No backend yet: just acknowledge the submission.
    setDone(true);
  }

  const isRegister = mode === "register";

  return (
    <div className={`authm-overlay${authOpen ? " open" : ""}`} onClick={closeAuth} aria-hidden={!authOpen}>
      <div
        className="authm"
        role="dialog"
        aria-modal="true"
        aria-label={isRegister ? "Register" : "Sign in"}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="authm-close" type="button" onClick={closeAuth} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2}>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

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

        {done ? (
          <div className="authm-done">
            <h2>{isRegister ? "Account created" : "Welcome back"}</h2>
            <p>{isRegister ? "Thanks for joining Partslk." : "You are signed in."}</p>
            <button type="button" className="authm-submit" onClick={closeAuth}>
              Continue shopping
            </button>
          </div>
        ) : (
          <form className="authm-form" onSubmit={onSubmit}>
            <h2>{isRegister ? "Create your account" : "Sign in to your account"}</h2>

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
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
              />
            </label>
            {isRegister && (
              <label>
                Confirm password
                <input name="confirm" type="password" autoComplete="new-password" required />
              </label>
            )}

            {error && <p className="authm-error">{error}</p>}

            {!isRegister && (
              <a className="authm-forgot" href="#">
                Forgot password?
              </a>
            )}

            <button type="submit" className="authm-submit">
              {isRegister ? "Register" : "Sign in"}
            </button>

            <p className="authm-switch">
              {isRegister ? "Already have an account?" : "New to Partslk?"}{" "}
              <button type="button" onClick={() => switchMode(isRegister ? "login" : "register")}>
                {isRegister ? "Sign in" : "Register"}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
