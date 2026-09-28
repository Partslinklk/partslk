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
  /** Today's Deal side drawer */
  topDealsOpen: boolean;
  openTopDeals: () => void;
  closeTopDeals: () => void;
  /** Header cart badge — incremented by "Add to cart" buttons */
  cartCount: number;
  addToCart: (qty?: number) => void;
};

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [topDealsOpen, setTopDealsOpen] = useState(false);
  const [cartCount, setCartCount] = useState(3);

  const openAuth = useCallback(() => setAuthOpen(true), []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);
  const openTopDeals = useCallback(() => setTopDealsOpen(true), []);
  const closeTopDeals = useCallback(() => setTopDealsOpen(false), []);
  const addToCart = useCallback((qty = 1) => setCartCount((c) => c + qty), []);

  const value = useMemo(
    () => ({
      authOpen,
      openAuth,
      closeAuth,
      topDealsOpen,
      openTopDeals,
      closeTopDeals,
      cartCount,
      addToCart,
    }),
    [authOpen, openAuth, closeAuth, topDealsOpen, openTopDeals, closeTopDeals, cartCount, addToCart]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within <UIProvider>");
  return ctx;
}
