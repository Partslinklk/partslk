"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useUI } from "./UIProvider";
import { ImageSlot } from "./ImageSlot";
import { formatPrice } from "@/lib/format-price";

const FREE_DELIVERY_THRESHOLD = 100;

export function CartDrawer() {
  const { cartOpen, closeCart, cartItems, removeFromCart } = useUI();

  useEffect(() => {
    if (!cartOpen) return;
    document.body.classList.add("cart-drawer-open");
    return () => document.body.classList.remove("cart-drawer-open");
  }, [cartOpen]);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const progressPct = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);

  return (
    <div
      className={`topdeal-overlay${cartOpen ? " open" : ""}`}
      onClick={closeCart}
      aria-hidden={!cartOpen}
    >
      <div className="topdeal-drawer cart-drawer" role="dialog" aria-label="Shopping Cart" onClick={(e) => e.stopPropagation()}>
        <div className="topdeal-head">
          <h2>Shopping Cart</h2>
          <button className="topdeal-close" type="button" onClick={closeCart} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2}>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="cart-drawer-empty">
            <p>Your cart is empty</p>
            <span>No items in your cart. Go on, fill it up with something you love!</span>
            <button type="button" className="checkout-btn" onClick={closeCart}>
              Start Shopping Now
            </button>
          </div>
        ) : (
          <>
            <div className="cart-drawer-progress">
              {remaining > 0 ? (
                <p>Add {formatPrice(remaining)} more to get FREE Delivery.</p>
              ) : (
                <p>Congratulations! Your order is eligible for FREE Delivery.</p>
              )}
              <div className="cart-drawer-bar">
                <span style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            <div className="topdeal-list cart-drawer-list">
              {cartItems.map((item) => (
                <div className="topdeal-row" key={item.id}>
                  <div className="topdeal-media">
                    <ImageSlot src={item.image} alt={item.name} shape="rect" />
                  </div>
                  <div className="topdeal-body">
                    <p className="topdeal-name">{item.name}</p>
                    <span className="topdeal-price">
                      {item.qty} &times; {formatPrice(item.price)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="cart-drawer-remove"
                    onClick={() => removeFromCart(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2}>
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-drawer-foot">
              <div className="summary-row">
                <span>Subtotal:</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
              <div className="cart-drawer-actions">
                <Link href="/cart" className="cart-drawer-view" onClick={closeCart}>
                  View Cart
                </Link>
                <Link href="/checkout" className="checkout-btn cart-drawer-checkout" onClick={closeCart}>
                  Checkout
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
