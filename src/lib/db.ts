import { pool } from "@/server/db";
import { listResource } from "@/server/catalog";
import { isResource } from "@/server/validation/catalog";

/**
 * Read side of the store (Postgres / Supabase). Catalogue reads and per-row writes live in
 * src/server/catalog.ts; connection, pool and transactions in src/server/db.ts.
 * readCollection keeps the JSON shape the storefront and admin already use.
 */

export type CollectionName =
  | "products"
  | "categories"
  | "brands"
  | "makes"
  | "deals"
  | "featured"
  | "popular"
  | "testimonials"
  | "orders";

export type Category = { id: string; name: string; image: string; links: string[]; featured: boolean };
export type Brand = { id: string; name: string };
export type Make = { id: string; name: string; logo: string };
export type Deal = {
  id: string;
  name: string;
  image: string;
  rating: number;
  price: number;
  originalPrice: number;
  endsAt: string;
  /** False when the linked product is hidden from the shop. */
  published?: boolean;
};
export type ListedProduct = {
  id: string;
  name: string;
  image: string;
  rating: number;
  price: number;
  /** 0 = single price, otherwise shown as a price range price – priceMax */
  priceMax: number;
  originalPrice?: number;
  ctaLabel: string;
  /** False when the linked product is hidden from the shop. */
  published?: boolean;
};
export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  meta: string;
  rating: number;
  avatar: string;
};
export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
export type Order = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  customer: { firstName: string; lastName: string; email: string; phone: string };
  address: { country: string; address: string; city: string; postcode: string };
  items: { id: string; name: string; price: number; qty: number; image: string }[];
  shipping: { label: string; cost: number };
  payment: string;
  note: string;
  subtotal: number;
  total: number;
  /** Payment method id (bank | check | cod | card) and whether the money has arrived. */
  paymentMethod?: string | null;
  paymentStatus?: "unpaid" | "paid" | "failed" | "refunded";
  discount?: number;
  couponCode?: string | null;
  trackingNumber?: string | null;
};

/** Admin order list: newest first, capped so the page stays fast as the shop grows. */
const ADMIN_ORDER_LIMIT = 1000;

async function readOrders(where: { customerId?: string; id?: string } = {}): Promise<Order[]> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (where.customerId) clauses.push(`customer_id = $${params.push(where.customerId)}`);
  if (where.id) clauses.push(`id = $${params.push(where.id)}`);
  // A card / PayHere order only counts as placed once the payment succeeds: hide the ones still awaiting payment from lists.
  if (!where.id) clauses.push("not (payment_method in ('card', 'payhere') and payment_status = 'unpaid' and status = 'pending')");
  const filter = clauses.length ? `where ${clauses.join(" and ")}` : "";
  const limit = where.customerId || where.id ? "" : `limit ${ADMIN_ORDER_LIMIT}`;

  const orders = await pool().query(`select * from orders ${filter} order by created_at desc, id ${limit}`, params);
  const items = await pool().query(
    `select order_id, product_id, name, image, price, qty from order_items
      where order_id = any($1::text[]) order by order_id, position`,
    [orders.rows.map((r) => r.id)],
  );
  const byOrder = new Map<string, Order["items"]>();
  for (const i of items.rows) {
    const list = byOrder.get(i.order_id) ?? [];
    list.push({ id: i.product_id, name: i.name, price: i.price, qty: i.qty, image: i.image });
    byOrder.set(i.order_id, list);
  }
  return orders.rows.map((r) => ({
    id: r.id,
    createdAt: new Date(r.created_at).toISOString(),
    status: r.status,
    customer: { firstName: r.first_name, lastName: r.last_name, email: r.email, phone: r.phone },
    address: { country: r.country, address: r.address, city: r.city, postcode: r.postcode },
    items: byOrder.get(r.id) ?? [],
    shipping: { label: r.shipping_label, cost: r.shipping_cost },
    payment: r.payment,
    note: r.note,
    subtotal: r.subtotal,
    total: r.total,
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    discount: r.discount,
    couponCode: r.coupon_code,
    trackingNumber: r.tracking_number,
  }));
}

/** Orders placed while signed in as this customer, newest first. */
export const readCustomerOrders = (customerId: string) => readOrders({ customerId });

/** One order by id (optionally only if it belongs to this customer). */
export const readOrder = async (id: string, customerId?: string) => (await readOrders({ id, customerId }))[0];

export async function readCollection<T = unknown>(name: CollectionName): Promise<T[]> {
  if (name === "orders") return (await readOrders()) as T[];
  if (isResource(name)) return (await listResource(name)) as T[];
  return [];
}
