"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type UIContextValue = {
  /** Buyer auth drawer */
  authOpen: boolean;
  openAuth: () => void;
  closeAuth: () => void;
  /** Header cart badge — incremented by "Add to cart" buttons */
  cartCount: number;
  addToCart: (qty?: number) => void;
};

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [cartCount, setCartCount] = useState(3);

  const openAuth = useCallback(() => setAuthOpen(true), []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);
  const addToCart = useCallback((qty = 1) => setCartCount((c) => c + qty), []);

  const value = useMemo(
    () => ({ authOpen, openAuth, closeAuth, cartCount, addToCart }),
    [authOpen, openAuth, closeAuth, cartCount, addToCart]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within <UIProvider>");
  return ctx;
}
