"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  id: string;
  name: string;
  image: string;
  price: number;
  qty: number;
};

type CartProduct = { id: string; name: string; image: string; price: number };

type UIContextValue = {
  /** Buyer auth drawer */
  authOpen: boolean;
  openAuth: () => void;
  closeAuth: () => void;
  /** Today's Deal side drawer */
  topDealsOpen: boolean;
  openTopDeals: () => void;
  closeTopDeals: () => void;
  /** Shopping cart side drawer */
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  cartItems: CartItem[];
  /** Header cart badge — total quantity across cart items */
  cartCount: number;
  addToCart: (product: CartProduct, qty?: number) => void;
  removeFromCart: (id: string) => void;
};

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [topDealsOpen, setTopDealsOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const openAuth = useCallback(() => setAuthOpen(true), []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);
  const openTopDeals = useCallback(() => setTopDealsOpen(true), []);
  const closeTopDeals = useCallback(() => setTopDealsOpen(false), []);
  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);

  const addToCart = useCallback((product: CartProduct, qty = 1) => {
    setCartItems((items) => {
      const existing = items.find((item) => item.id === product.id);
      if (existing) {
        return items.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + qty } : item
        );
      }
      return [...items, { ...product, qty }];
    });
    setCartOpen(true);
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCartItems((items) => items.filter((item) => item.id !== id));
  }, []);

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.qty, 0),
    [cartItems]
  );

  const value = useMemo(
    () => ({
      authOpen,
      openAuth,
      closeAuth,
      topDealsOpen,
      openTopDeals,
      closeTopDeals,
      cartOpen,
      openCart,
      closeCart,
      cartItems,
      cartCount,
      addToCart,
      removeFromCart,
    }),
    [
      authOpen,
      openAuth,
      closeAuth,
      topDealsOpen,
      openTopDeals,
      closeTopDeals,
      cartOpen,
      openCart,
      closeCart,
      cartItems,
      cartCount,
      addToCart,
      removeFromCart,
    ]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within <UIProvider>");
  return ctx;
}
