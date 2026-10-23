"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useUI } from "@/components/UIProvider";

export type Customer = { id: string; email: string; firstName: string; lastName: string; phone: string };

type CustomerContextValue = {
  customer: Customer | null;
  /** True until the first /api/me answer arrives. */
  loading: boolean;
  setCustomer: (c: Customer | null) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const CustomerContext = createContext<CustomerContextValue | null>(null);

/** Who is signed in. Sessions live in httpOnly cookies; this just asks /api/me. Must sit inside <UIProvider>. */
export function CustomerProvider({ children }: { children: ReactNode }) {
  const { openAuth } = useUI();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/me");
      setCustomer(res.ok ? ((await res.json()) as Customer) : null);
    } catch {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then((res) => (res.ok ? (res.json() as Promise<Customer>) : null))
      .catch(() => null)
      .then((c) => {
        if (cancelled) return;
        setCustomer(c);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // /my-account redirects here with ?login=1 when nobody is signed in.
  useEffect(() => {
    if (loading || customer) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("login") === "1") {
      url.searchParams.delete("login");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      openAuth("login");
    }
  }, [loading, customer, openAuth]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setCustomer(null);
  }, []);

  const value = useMemo(() => ({ customer, loading, setCustomer, refresh, logout }), [customer, loading, refresh, logout]);
  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

export function useCustomer() {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error("useCustomer must be used within <CustomerProvider>");
  return ctx;
}

/** POST/PUT/… helper that returns parsed JSON or throws an Error with the server's message. */
export async function api<T = unknown>(url: string, init?: Omit<RequestInit, "body"> & { body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body === undefined ? init?.headers : { "Content-Type": "application/json", ...init?.headers },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string> };
  if (!res.ok) {
    const detail = data.fields ? Object.values(data.fields)[0] : "";
    throw new Error([data.error, detail && detail !== data.error ? detail : ""].filter(Boolean).join(" ") || "Something went wrong.");
  }
  return data as T;
}
