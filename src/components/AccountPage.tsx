"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { api, useCustomer, type Customer } from "@/lib/customer-context";
import { formatPrice } from "@/lib/format-price";
import type { Order } from "@/lib/db";
import { useWishlist } from "@/lib/wishlist-context";
import { useUI } from "./UIProvider";

type TabId = "dashboard" | "orders" | "downloads" | "addresses" | "details" | "compare" | "wishlist";

const TABS: { id: TabId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "orders", label: "Orders" },
  { id: "downloads", label: "Downloads" },
  { id: "addresses", label: "Addresses" },
  { id: "details", label: "Account details" },
  { id: "compare", label: "Compare" },
  { id: "wishlist", label: "Wishlist" },
];

type Address = {
  id: string;
  label: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  address: string;
  city: string;
  postcode: string;
  isDefault: boolean;
};
type WishItem = { id: string; name: string; image: string; price: number; originalPrice?: number };

function Notice({ children, action }: { children: ReactNode; action?: { label: string; href: string } }) {
  return (
    <div className="acc-notice">
      <span>{children}</span>
      {action && (
        <Link href={action.href} className="acc-btn">
          {action.label}
        </Link>
      )}
    </div>
  );
}

const browse = { label: "Browse products", href: "/products" };

/** Loads `url` once on mount and exposes a reload function. */
function useLoad<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    try {
      setData(await api<T>(url));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load.");
    }
  }, [url]);
  useEffect(() => {
    let cancelled = false;
    api<T>(url)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load."));
    return () => {
      cancelled = true;
    };
  }, [url]);
  return { data, error, reload, setData };
}

function OrdersPanel() {
  const { data, error } = useLoad<Order[]>("/api/me/orders");
  if (error) return <Notice>{error}</Notice>;
  if (!data) return <Notice>Loading your orders…</Notice>;
  if (!data.length) return <Notice action={browse}>No order has been made yet.</Notice>;
  return (
    <div className="acc-panel">
      {data.map((o) => (
        <div className="acc-order" key={o.id}>
          <div className="acc-order-head">
            <strong>{o.id}</strong>
            <span className={`acc-status acc-status-${o.status}`}>{o.status}</span>
            <span>{new Date(o.createdAt).toLocaleDateString()}</span>
            <strong className="acc-order-total">{formatPrice(o.total)}</strong>
          </div>
          <ul className="acc-order-items">
            {o.items.map((i, n) => (
              <li key={`${i.id}-${n}`}>
                {i.qty} × {i.name} <span>{formatPrice(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const blankAddress = { label: "Home", firstName: "", lastName: "", phone: "", country: "", address: "", city: "", postcode: "", isDefault: false };

function AddressesPanel() {
  const { data, error, reload } = useLoad<Address[]>("/api/me/addresses");
  const [editing, setEditing] = useState<(typeof blankAddress & { id?: string }) | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setMsg("");
    try {
      const { id, ...body } = editing;
      await api(id ? `/api/me/addresses/${id}` : "/api/me/addresses", { method: id ? "PUT" : "POST", body });
      setEditing(null);
      await reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await api(`/api/me/addresses/${id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not delete.");
    }
  }

  if (error) return <Notice>{error}</Notice>;
  if (!data) return <Notice>Loading your addresses…</Notice>;

  if (editing) {
    const set = (k: keyof typeof blankAddress, v: string | boolean) => setEditing({ ...editing, [k]: v });
    return (
      <form className="acc-panel acc-form" onSubmit={save}>
        <div className="acc-form-row">
          <label>
            Label
            <input value={editing.label} onChange={(e) => set("label", e.target.value)} required />
          </label>
          <label>
            Phone
            <input value={editing.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" />
          </label>
        </div>
        <div className="acc-form-row">
          <label>
            First name
            <input value={editing.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="given-name" />
          </label>
          <label>
            Last name
            <input value={editing.lastName} onChange={(e) => set("lastName", e.target.value)} autoComplete="family-name" />
          </label>
        </div>
        <label>
          Street address
          <input value={editing.address} onChange={(e) => set("address", e.target.value)} autoComplete="street-address" required />
        </label>
        <div className="acc-form-row">
          <label>
            City
            <input value={editing.city} onChange={(e) => set("city", e.target.value)} required />
          </label>
          <label>
            Postcode
            <input value={editing.postcode} onChange={(e) => set("postcode", e.target.value)} required />
          </label>
        </div>
        <label>
          Country
          <input value={editing.country} onChange={(e) => set("country", e.target.value)} autoComplete="country-name" required />
        </label>
        <label className="acc-check">
          <input type="checkbox" checked={editing.isDefault} onChange={(e) => set("isDefault", e.target.checked)} /> Use as my default address
        </label>
        {msg && <p className="authm-error">{msg}</p>}
        <div className="acc-actions">
          <button type="submit" className="acc-btn" disabled={busy}>
            {busy ? "Saving…" : "Save address"}
          </button>
          <button type="button" className="acc-link" onClick={() => setEditing(null)}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="acc-panel">
      <p>The default address is used on the checkout page.</p>
      {msg && <p className="authm-error">{msg}</p>}
      <div className="acc-addr-grid">
        {data.map((a) => (
          <div className="acc-addr" key={a.id}>
            <h3>
              {a.label} {a.isDefault && <span className="acc-badge">Default</span>}
            </h3>
            <p>
              {[a.firstName, a.lastName].filter(Boolean).join(" ")}
              {(a.firstName || a.lastName) && <br />}
              {a.address}, {a.city} {a.postcode}
              <br />
              {a.country}
              {a.phone && (
                <>
                  <br />
                  {a.phone}
                </>
              )}
            </p>
            <div className="acc-actions">
              <button type="button" className="acc-link" onClick={() => setEditing({ ...a })}>
                Edit
              </button>
              <button type="button" className="acc-link acc-danger" onClick={() => remove(a.id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {!data.length && (
          <div className="acc-addr">
            <p>You have not saved an address yet.</p>
          </div>
        )}
      </div>
      <button type="button" className="acc-btn acc-btn-solo" style={{ marginTop: 20 }} onClick={() => setEditing({ ...blankAddress })}>
        Add address
      </button>
    </div>
  );
}

function DetailsPanel({ customer }: { customer: Customer }) {
  const { setCustomer } = useCustomer();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    const newPassword = String(d.get("newPassword") ?? "");
    const body: Record<string, string> = {
      firstName: String(d.get("firstName") ?? ""),
      lastName: String(d.get("lastName") ?? ""),
      phone: String(d.get("phone") ?? ""),
    };
    if (newPassword) {
      body.newPassword = newPassword;
      body.currentPassword = String(d.get("currentPassword") ?? "");
    }
    setBusy(true);
    setMsg(null);
    try {
      setCustomer(await api<Customer>("/api/me", { method: "PATCH", body }));
      form.reset();
      setMsg({ ok: true, text: "Your details have been saved." });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not save." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="acc-panel acc-form" onSubmit={save}>
      <div className="acc-form-row">
        <label>
          First name
          <input name="firstName" type="text" defaultValue={customer.firstName} autoComplete="given-name" required />
        </label>
        <label>
          Last name
          <input name="lastName" type="text" defaultValue={customer.lastName} autoComplete="family-name" />
        </label>
      </div>
      <label>
        Phone
        <input name="phone" type="tel" defaultValue={customer.phone} autoComplete="tel" />
      </label>
      <label>
        Email address
        <input type="email" value={customer.email} readOnly disabled />
      </label>
      <label>
        Current password (only needed to set a new one)
        <input name="currentPassword" type="password" autoComplete="new-password" />
      </label>
      <label>
        New password (leave blank to keep unchanged)
        <input name="newPassword" type="password" autoComplete="new-password" minLength={8} />
      </label>
      {msg && <p className={msg.ok ? "acc-ok" : "authm-error"}>{msg.text}</p>}
      <button type="submit" className="acc-btn acc-btn-solo" disabled={busy}>
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function WishlistPanel() {
  const wishlist = useWishlist();
  const { data, error, reload } = useLoad<WishItem[]>("/api/me/wishlist");
  if (error) return <Notice>{error}</Notice>;
  if (!data) return <Notice>Loading your wishlist…</Notice>;
  if (!data.length) return <Notice action={browse}>Your wishlist is empty.</Notice>;
  return (
    <div className="acc-panel">
      {data.map((p) => (
        <div className="acc-order" key={p.id}>
          <div className="acc-order-head">
            <Link href={`/products/${p.id}`}>
              <strong>{p.name}</strong>
            </Link>
            <strong className="acc-order-total">{formatPrice(p.price)}</strong>
            <button
              type="button"
              className="acc-link acc-danger"
              onClick={async () => {
                await wishlist.toggle(p.id); // updates the hearts everywhere, then refresh this list
                await reload();
              }}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Panel({ tab, onTab, customer }: { tab: TabId; onTab: (t: TabId) => void; customer: Customer }) {
  switch (tab) {
    case "dashboard":
      return (
        <div className="acc-panel">
          <p>
            Hello <strong>{customer.firstName || customer.email}</strong>. From your account dashboard you can view your{" "}
            <button type="button" onClick={() => onTab("orders")}>recent orders</button>, manage your{" "}
            <button type="button" onClick={() => onTab("addresses")}>shipping and billing addresses</button>, and{" "}
            <button type="button" onClick={() => onTab("details")}>edit your password and account details</button>.
          </p>
        </div>
      );
    case "orders":
      return <OrdersPanel />;
    case "downloads":
      return <Notice action={browse}>No downloads available yet.</Notice>;
    case "addresses":
      return <AddressesPanel />;
    case "details":
      return <DetailsPanel customer={customer} />;
    case "compare":
      return <Notice action={browse}>No products added to compare.</Notice>;
    case "wishlist":
      return <WishlistPanel />;
  }
}

export function AccountPage() {
  const router = useRouter();
  const { openAuth } = useUI();
  const { customer, loading, logout } = useCustomer();
  const [tab, setTab] = useState<TabId>(() => {
    // /my-account?tab=wishlist (from the account menu); only the sidebar highlight depends on this on first paint.
    const wanted = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("tab");
    return TABS.some((t) => t.id === wanted) ? (wanted as TabId) : "orders";
  });

  return (
    <>
      <section className="sr-titleband">
        <div className="wrap">
          <div className="sr-crumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <span className="crumb-now">My account</span>
          </div>
          <div className="sr-resulthead">
            <h1>My account</h1>
          </div>
        </div>
      </section>

      <div className="wrap acc-layout">
        {loading ? (
          <div className="acc-main">
            <Notice>Loading…</Notice>
          </div>
        ) : !customer ? (
          <div className="acc-main">
            <div className="acc-notice">
              <span>Please sign in to see your account.</span>
              <button type="button" className="acc-btn" onClick={() => openAuth("login")}>
                Sign in
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="acc-main">
              <Panel tab={tab} onTab={setTab} customer={customer} />
            </div>

            <aside className="acc-side">
              <div className="acc-user">
                <span className="acc-avatar" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8}>
                    <circle cx="12" cy="8" r="3.6" />
                    <path d="M5 20c0-3.6 3-6.2 7-6.2s7 2.6 7 6.2" />
                  </svg>
                </span>
                <span className="acc-email">{customer.email}</span>
              </div>
              <nav aria-label="Account">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`acc-nav-item${tab === t.id ? " is-active" : ""}`}
                    onClick={() => setTab(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="acc-nav-item"
                  onClick={async () => {
                    await logout();
                    router.push("/");
                  }}
                >
                  Log out
                </button>
              </nav>
            </aside>
          </>
        )}
      </div>
    </>
  );
}
