import { query } from "./db";

export const LOW_STOCK_THRESHOLD = 5;

/**
 * Everything the admin dashboard shows, computed in SQL (nothing is aggregated in the browser).
 * "Revenue" excludes cancelled orders; "paid revenue" counts only orders whose payment has arrived.
 * Days are UTC calendar days, zero-filled so charts have no gaps.
 */
export async function dashboardData(days: number) {
  const since = `(now() at time zone 'utc')::date - ($1::int - 1)`;

  const [totals, daily, byStatus, top, low, byCategory, recent] = await Promise.all([
    query<Record<string, number>>(
      `select
         coalesce((select sum(total) from orders where status <> 'cancelled' and created_at >= ${since}), 0)::float8 as revenue,
         coalesce((select sum(total) from orders where payment_status = 'paid' and status <> 'cancelled' and created_at >= ${since}), 0)::float8 as paid_revenue,
         (select count(*) from orders where created_at >= ${since})::int as orders,
         (select count(*) from orders where status = 'pending')::int as pending_orders,
         (select count(*) from customers)::int as customers,
         (select count(*) from customers where created_at >= ${since})::int as new_customers,
         (select count(*) from products where deleted_at is null)::int as products,
         (select count(*) from products where deleted_at is null and published and stock <= ${LOW_STOCK_THRESHOLD})::int as low_stock,
         (select count(*) from newsletter_subscribers where unsubscribed_at is null)::int as subscribers,
         (select count(*) from reviews where status = 'pending')::int as pending_reviews,
         (select count(*) from contact_messages where status = 'new')::int as new_messages`,
      [days],
    ),
    query<{ day: string; revenue: number; orders: number; customers: number }>(
      `select to_char(d, 'YYYY-MM-DD') as day,
              coalesce(o.revenue, 0)::float8 as revenue, coalesce(o.orders, 0)::int as orders, coalesce(c.customers, 0)::int as customers
         from generate_series(${since}, (now() at time zone 'utc')::date, interval '1 day') as d
         left join (select (created_at at time zone 'utc')::date as day, count(*) as orders,
                           sum(total) filter (where status <> 'cancelled') as revenue
                      from orders group by 1) o on o.day = d::date
         left join (select (created_at at time zone 'utc')::date as day, count(*) as customers from customers group by 1) c on c.day = d::date
        order by d`,
      [days],
    ),
    query<{ name: string; value: number }>(
      `select status as name, count(*)::int as value from orders where created_at >= ${since} group by status order by value desc`,
      [days],
    ),
    query<{ id: string; name: string; units: number; revenue: number }>(
      `select oi.product_id as id, max(oi.name) as name, sum(oi.qty)::int as units, sum(oi.qty * oi.price)::float8 as revenue
         from order_items oi join orders o on o.id = oi.order_id
        where o.status <> 'cancelled' and o.created_at >= ${since}
        group by oi.product_id order by units desc, revenue desc limit 5`,
      [days],
    ),
    query<{ id: string; name: string; stock: number }>(
      `select id, name, stock from products where deleted_at is null and published and stock <= ${LOW_STOCK_THRESHOLD} order by stock, name limit 10`,
    ),
    query<{ name: string; products: number }>(
      `select c.name, count(p.id)::int as products from categories c
         left join product_categories pc on pc.category_id = c.id
         left join products p on p.id = pc.product_id and p.deleted_at is null
        group by c.id, c.name, c.position order by c.position, c.name`,
    ),
    query<{ id: string; first_name: string; last_name: string; created_at: Date; status: string; total: number }>(
      "select id, first_name, last_name, created_at, status, total from orders order by created_at desc limit 6",
    ),
  ]);

  const t = totals.rows[0];
  return {
    days,
    totals: {
      revenue: t.revenue, paidRevenue: t.paid_revenue, orders: t.orders, pendingOrders: t.pending_orders,
      customers: t.customers, newCustomers: t.new_customers, products: t.products, lowStock: t.low_stock,
      subscribers: t.subscribers, pendingReviews: t.pending_reviews, newMessages: t.new_messages,
    },
    daily: daily.rows,
    byStatus: byStatus.rows,
    topProducts: top.rows,
    lowStock: low.rows,
    byCategory: byCategory.rows,
    recentOrders: recent.rows.map((r) => ({
      id: r.id, firstName: r.first_name, lastName: r.last_name, createdAt: r.created_at.toISOString(), status: r.status, total: r.total,
    })),
  };
}
