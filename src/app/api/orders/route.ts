import { NextResponse } from "next/server";
import { readCollection, writeCollection, type Deal, type ListedProduct, type Order } from "@/lib/db";
import type { ShopProduct } from "@/lib/products-catalog";

type Body = {
  customer?: Partial<Order["customer"]>;
  address?: Partial<Order["address"]>;
  items?: { id?: string; name?: string; image?: string; price?: number; qty?: number }[];
  shipping?: { label?: string; cost?: number };
  payment?: string;
  note?: string;
};

const str = (v: unknown, max = 500) => String(v ?? "").trim().slice(0, max);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const email = str(body.customer?.email, 200);
  if (!/^\S+@\S+\.\S+$/.test(email) || !str(body.customer?.firstName) || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Missing order details." }, { status: 400 });
  }

  // Trust catalog prices over whatever the browser sent.
  const [products, deals, featured, popular] = await Promise.all([
    readCollection<ShopProduct>("products"),
    readCollection<Deal>("deals"),
    readCollection<ListedProduct>("featured"),
    readCollection<ListedProduct>("popular"),
  ]);
  const priceOf = (id: string) =>
    [...products, ...deals, ...featured, ...popular].find((p) => p.id === id)?.price;

  const items = body.items.slice(0, 100).map((i) => {
    const id = str(i.id, 100);
    const price = priceOf(id) ?? Math.max(0, Number(i.price) || 0);
    return { id, name: str(i.name, 200), image: str(i.image, 300), price, qty: Math.min(999, Math.max(1, Math.floor(Number(i.qty) || 1))) };
  });
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const shipping = { label: str(body.shipping?.label, 100), cost: Math.max(0, Number(body.shipping?.cost) || 0) };

  const orders = await readCollection<Order>("orders");
  let id = `PL-${Date.now().toString().slice(-6)}`;
  while (orders.some((o) => o.id === id)) id += "x";

  const order: Order = {
    id,
    createdAt: new Date().toISOString(),
    status: "pending",
    customer: {
      firstName: str(body.customer?.firstName, 100),
      lastName: str(body.customer?.lastName, 100),
      email,
      phone: str(body.customer?.phone, 50),
    },
    address: {
      country: str(body.address?.country, 100),
      address: str(body.address?.address, 300),
      city: str(body.address?.city, 100),
      postcode: str(body.address?.postcode, 30),
    },
    items,
    shipping,
    payment: str(body.payment, 100),
    note: str(body.note, 1000),
    subtotal,
    total: subtotal + shipping.cost,
  };
  await writeCollection("orders", [order, ...orders]);
  return NextResponse.json({ id });
}
