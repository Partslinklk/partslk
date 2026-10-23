"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, useCustomer } from "./customer-context";

const LOCAL_KEY = "partslk-wishlist-v1";

type WishlistValue = {
  ids: string[];
  has: (id: string) => boolean;
  /** Adds or removes a product. Optimistic: the heart flips immediately and rolls back if the server refuses. */
  toggle: (id: string) => Promise<void>;
};

const WishlistContext = createContext<WishlistValue | null>(null);

function readLocal(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function writeLocal(ids: string[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable (private mode / quota): the heart just won't persist for guests */
  }
}

/**
 * Wishlist hearts. Signed-in customers use the server wishlist (/api/me/wishlist); guests keep theirs in
 * localStorage, and it is merged into the account the moment they sign in. Must sit inside <CustomerProvider>.
 */
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { customer, loading } = useCustomer();
  const [ids, setIds] = useState<string[]>([]);
  const customerId = customer?.id ?? null;

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      const local = readLocal();
      if (!customerId) {
        if (!cancelled) setIds(local);
        return;
      }
      if (local.length) {
        // Guest hearts become account hearts (ids that aren't catalogue products are simply refused).
        await Promise.all(local.map((productId) => api("/api/me/wishlist", { method: "PUT", body: { productId } }).catch(() => undefined)));
        writeLocal([]);
      }
      const list = await api<{ id: string }[]>("/api/me/wishlist").catch(() => [] as { id: string }[]);
      if (!cancelled) setIds(list.map((p) => p.id));
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, loading]);

  const toggle = useCallback(
    async (id: string) => {
      const adding = !ids.includes(id);
      const next = adding ? [id, ...ids] : ids.filter((x) => x !== id);
      setIds(next);
      if (!customerId) return writeLocal(next);
      try {
        if (adding) await api("/api/me/wishlist", { method: "PUT", body: { productId: id } });
        else await api(`/api/me/wishlist?productId=${encodeURIComponent(id)}`, { method: "DELETE" });
      } catch {
        setIds(ids); // roll back the heart
      }
    },
    [ids, customerId],
  );

  const value = useMemo(() => ({ ids, has: (id: string) => ids.includes(id), toggle }), [ids, toggle]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within <WishlistProvider>");
  return ctx;
}
