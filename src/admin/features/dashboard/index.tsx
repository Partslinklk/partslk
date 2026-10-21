'use client'

import { useMemo } from 'react'
import { Boxes, DollarSign, ShoppingCart, Tags } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/admin/components/ui/card'
import { Badge } from '@/admin/components/ui/badge'
import { Link } from '@/admin/lib/router'
import { useIsMobile } from '@/admin/hooks/use-mobile'
import { PageShell } from '@/admin/features/store/page-shell'
import { useCollection } from '@/admin/features/store/use-collection'
import { statusVariant } from '@/admin/features/store/orders-page'
import { formatPrice } from '@/lib/format-price'
import type { Category, Order } from '@/lib/db'
import type { ShopProduct } from '@/lib/products-catalog'

const STATUS_COLORS: Record<string, string> = {
  pending: 'var(--chart-4)',
  processing: 'var(--chart-3)',
  shipped: 'var(--chart-2)',
  delivered: 'var(--chart-1)',
  cancelled: 'var(--chart-5)',
}

const tooltipStyle = {
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--popover-foreground)',
  fontSize: 12,
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`

function ChartEmpty({ children }: { children: string }) {
  return (
    <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
      {children}
    </div>
  )
}

export function Dashboard() {
  const products = useCollection<ShopProduct>('products').items
  const categories = useCollection<Category>('categories').items
  const orders = useCollection<Order>('orders').items
  const isMobile = useIsMobile()

  const revenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total, 0)
  const pending = orders.filter((o) => o.status === 'pending').length
  const lowStock = products.filter((p) => (p.stock ?? 0) <= 5)

  // Revenue + order count for each of the last 14 days.
  const daily = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (13 - i))
      return {
        key: dayKey(d),
        label: d.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
        revenue: 0,
        orders: 0,
      }
    })
    for (const o of orders) {
      const day = days.find((d) => d.key === dayKey(new Date(o.createdAt)))
      if (!day) continue
      day.orders += 1
      if (o.status !== 'cancelled') day.revenue += o.total
    }
    return days
  }, [orders])

  const byStatus = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const o of orders) counts[o.status] = (counts[o.status] ?? 0) + 1
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [orders])

  const byCategory = useMemo(
    () =>
      categories.map((c) => ({
        name: c.name,
        products: products.filter((p) => p.categories.includes(c.id)).length,
      })),
    [categories, products]
  )

  // Best sellers by units sold (cancelled orders excluded).
  const topProducts = useMemo(() => {
    const units = new Map<string, { name: string; units: number }>()
    for (const o of orders) {
      if (o.status === 'cancelled') continue
      for (const i of o.items) {
        const cur = units.get(i.id)
        units.set(i.id, { name: i.name, units: (cur?.units ?? 0) + i.qty })
      }
    }
    return [...units.values()]
      .sort((a, b) => b.units - a.units)
      .slice(0, 5)
      .map((p) => ({
        ...p,
        name: p.name.length > 28 ? `${p.name.slice(0, 27)}…` : p.name,
      }))
  }, [orders])

  const stats = [
    {
      label: 'Revenue',
      value: formatPrice(revenue),
      note: `${orders.length} orders`,
      icon: DollarSign,
    },
    {
      label: 'Orders',
      value: orders.length,
      note: `${pending} pending`,
      icon: ShoppingCart,
    },
    {
      label: 'Products',
      value: products.length,
      note: `${lowStock.length} low on stock`,
      icon: Boxes,
    },
    {
      label: 'Categories',
      value: categories.length,
      note: 'in the catalog',
      icon: Tags,
    },
  ]

  return (
    <PageShell
      title='Dashboard'
      description='A quick look at how the shop is doing.'
    >
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>{s.label}</CardTitle>
              <s.icon className='size-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{s.value}</div>
              <p className='text-xs text-muted-foreground'>{s.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className='mt-4 grid gap-4 lg:grid-cols-3'>
        <Card className='lg:col-span-2'>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>
              Last 14 days (cancelled orders excluded)
            </CardDescription>
          </CardHeader>
          <CardContent className='h-72'>
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart data={daily} margin={{ left: 0, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id='rev' x1='0' y1='0' x2='0' y2='1'>
                    <stop
                      offset='5%'
                      stopColor='var(--chart-1)'
                      stopOpacity={0.35}
                    />
                    <stop
                      offset='95%'
                      stopColor='var(--chart-1)'
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray='3 3'
                  stroke='var(--border)'
                  vertical={false}
                />
                <XAxis
                  dataKey='label'
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  interval='preserveStartEnd'
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  width={48}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [formatPrice(Number(v)), 'Revenue']}
                />
                <Area
                  type='monotone'
                  dataKey='revenue'
                  stroke='var(--chart-1)'
                  strokeWidth={2}
                  fill='url(#rev)'
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders by status</CardTitle>
            <CardDescription>All time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='h-56'>
              {byStatus.length === 0 ? (
                <ChartEmpty>No orders yet.</ChartEmpty>
              ) : (
                <ResponsiveContainer width='100%' height='100%'>
                  <PieChart>
                    <Pie
                      data={byStatus}
                      dataKey='value'
                      nameKey='name'
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {byStatus.map((d) => (
                        <Cell
                          key={d.name}
                          fill={STATUS_COLORS[d.name]}
                          stroke='var(--card)'
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className='mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs capitalize'>
              {byStatus.map((d) => (
                <span key={d.name} className='flex items-center gap-1'>
                  <span
                    className='size-2 rounded-full'
                    style={{ background: STATUS_COLORS[d.name] }}
                  />
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='mt-4 grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Orders per day</CardTitle>
            <CardDescription>Last 14 days</CardDescription>
          </CardHeader>
          <CardContent className='h-64'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={daily} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid
                  strokeDasharray='3 3'
                  stroke='var(--border)'
                  vertical={false}
                />
                <XAxis
                  dataKey='label'
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  interval='preserveStartEnd'
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  width={32}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'var(--muted)' }}
                  formatter={(v) => [v, 'Orders']}
                />
                <Bar
                  dataKey='orders'
                  fill='var(--chart-2)'
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Best sellers</CardTitle>
            <CardDescription>Units sold</CardDescription>
          </CardHeader>
          <CardContent className='h-64'>
            {topProducts.length === 0 ? (
              <ChartEmpty>No sales yet.</ChartEmpty>
            ) : (
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart
                  data={topProducts}
                  layout='vertical'
                  margin={{ left: 8, right: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray='3 3'
                    stroke='var(--border)'
                    horizontal={false}
                  />
                  <XAxis
                    type='number'
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    allowDecimals={false}
                  />
                  <YAxis
                    type='category'
                    dataKey='name'
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    width={isMobile ? 90 : 150}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: 'var(--muted)' }}
                    formatter={(v) => [v, 'Units']}
                  />
                  <Bar
                    dataKey='units'
                    fill='var(--chart-1)'
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className='mt-4'>
        <CardHeader>
          <CardTitle>Products per category</CardTitle>
          <CardDescription>How the catalog is spread out</CardDescription>
        </CardHeader>
        <CardContent className='h-64'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={byCategory} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid
                strokeDasharray='3 3'
                stroke='var(--border)'
                vertical={false}
              />
              <XAxis
                dataKey='name'
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                width={32}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: 'var(--muted)' }}
                formatter={(v) => [v, 'Products']}
              />
              <Bar
                dataKey='products'
                fill='var(--chart-3)'
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className='mt-4 grid gap-4 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
            <CardDescription>
              <Link to='/orders' className='underline underline-offset-4'>
                View all orders
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            {orders.length === 0 && (
              <p className='text-sm text-muted-foreground'>No orders yet.</p>
            )}
            {orders.slice(0, 6).map((o) => (
              <div
                key={o.id}
                className='flex items-center justify-between gap-3 text-sm'
              >
                <div className='min-w-0'>
                  <p className='font-medium'>
                    {o.id} · {o.customer.firstName} {o.customer.lastName}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {new Date(o.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className='flex items-center gap-3'>
                  <Badge
                    variant={statusVariant[o.status]}
                    className='capitalize'
                  >
                    {o.status}
                  </Badge>
                  <span>{formatPrice(o.total)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low stock</CardTitle>
            <CardDescription>
              Products with 5 or fewer units left.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            {lowStock.length === 0 && (
              <p className='text-sm text-muted-foreground'>
                Everything is well stocked.
              </p>
            )}
            {lowStock.slice(0, 6).map((p) => (
              <div
                key={p.id}
                className='flex items-center justify-between gap-3 text-sm'
              >
                <span className='truncate'>{p.name}</span>
                <Badge variant='destructive'>{p.stock ?? 0} left</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
