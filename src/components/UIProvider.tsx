"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

export type AuthMode = "login" | "register";

const CART_KEY = "partslk-cart-v1";

type CartProduct = { id: string; name: string; image: string; price: number };

type UIContextValue = {
  /** Buyer auth drawer */
  authOpen: boolean;
  authMode: AuthMode;
  openAuth: (mode?: AuthMode) => void;
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
  clearCart: () => void;
};

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [topDealsOpen, setTopDealsOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);

  // Keep the cart across reloads and the round trip to Stripe's hosted payment page.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
      if (Array.isArray(saved)) {
        // One-time hydrate from an external store (localStorage), so it can't run during render.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCartItems(saved.filter((i) => i && typeof i.id === "string" && Number.isFinite(i.qty) && i.qty > 0));
      }
    } catch {
      /* storage unavailable or corrupt: start with an empty cart */
    }
    setCartLoaded(true);
  }, []);

  useEffect(() => {
    if (!cartLoaded) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
    } catch {
      /* storage unavailable (private mode / quota) */
    }
  }, [cartItems, cartLoaded]);

  const openAuth = useCallback((mode: AuthMode = "login") => {
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);
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

  const clearCart = useCallback(() => setCartItems([]), []);

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.qty, 0),
    [cartItems]
  );

  const value = useMemo(
    () => ({
      authOpen,
      authMode,
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
      clearCart,
    }),
    [
      authOpen,
      authMode,
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
      clearCart,
    ]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within <UIProvider>");
  return ctx;
}
