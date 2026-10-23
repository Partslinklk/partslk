'use client'

import { useEffect, useState } from 'react'
import { Boxes, DollarSign, ShoppingCart, Users } from 'lucide-react'
import { toast } from 'sonner'
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
import { Button } from '@/admin/components/ui/button'
import { Link } from '@/admin/lib/router'
import { useIsMobile } from '@/admin/hooks/use-mobile'
import { PageShell } from '@/admin/features/store/page-shell'
import { statusVariant } from '@/admin/features/store/orders-page'
import { formatPrice } from '@/lib/format-price'
import type { OrderStatus } from '@/lib/db'

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

type DashboardData = {
  days: number
  totals: {
    revenue: number
    paidRevenue: number
    orders: number
    pendingOrders: number
    customers: number
    newCustomers: number
    products: number
    lowStock: number
    subscribers: number
    pendingReviews: number
    newMessages: number
  }
  daily: { day: string; revenue: number; orders: number; customers: number }[]
  byStatus: { name: string; value: number }[]
  topProducts: { id: string; name: string; units: number; revenue: number }[]
  lowStock: { id: string; name: string; stock: number }[]
  byCategory: { name: string; products: number }[]
  recentOrders: { id: string; firstName: string; lastName: string; createdAt: string; status: OrderStatus; total: number }[]
}

const RANGES = [7, 14, 30, 90]

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

function ChartEmpty({ children }: { children: string }) {
  return (
    <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
      {children}
    </div>
  )
}

export function Dashboard() {
  const isMobile = useIsMobile()
  const [days, setDays] = useState(14)
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/dashboard?days=${days}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error || 'Could not load the dashboard.')
        return (await res.json()) as DashboardData
      })
      .then((d) => !cancelled && setData(d))
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Could not load the dashboard.'))
    return () => {
      cancelled = true
    }
  }, [days])

  const t = data?.totals
  const daily = (data?.daily ?? []).map((d) => ({ ...d, label: dayLabel(d.day) }))
  const byStatus = data?.byStatus ?? []
  const byCategory = data?.byCategory ?? []
  const lowStock = data?.lowStock ?? []
  const recentOrders = data?.recentOrders ?? []
  const topProducts = (data?.topProducts ?? []).map((p) => ({
    ...p,
    name: p.name.length > 28 ? `${p.name.slice(0, 27)}…` : p.name,
  }))

  const stats = [
    {
      label: 'Revenue',
      value: formatPrice(t?.revenue ?? 0),
      note: `${formatPrice(t?.paidRevenue ?? 0)} paid · last ${days} days`,
      icon: DollarSign,
    },
    {
      label: 'Orders',
      value: t?.orders ?? 0,
      note: `${t?.pendingOrders ?? 0} pending right now`,
      icon: ShoppingCart,
    },
    {
      label: 'Customers',
      value: t?.customers ?? 0,
      note: `${t?.newCustomers ?? 0} new in ${days} days`,
      icon: Users,
    },
    {
      label: 'Products',
      value: t?.products ?? 0,
      note: `${t?.lowStock ?? 0} low on stock`,
      icon: Boxes,
    },
  ]
  const attention = [
    { label: 'reviews to approve', n: t?.pendingReviews ?? 0, to: '/reviews' },
    { label: 'new messages', n: t?.newMessages ?? 0, to: '/messages' },
    { label: 'pending orders', n: t?.pendingOrders ?? 0, to: '/orders' },
  ].filter((a) => a.n > 0)

  return (
    <PageShell
      title='Dashboard'
      description='A quick look at how the shop is doing.'
      actions={
        <div className='flex gap-1'>
          {RANGES.map((r) => (
            <Button key={r} size='sm' variant={days === r ? 'default' : 'outline'} onClick={() => setDays(r)}>
              {r}d
            </Button>
          ))}
        </div>
      }
    >
      {attention.length > 0 && (
        <div className='mb-4 flex flex-wrap gap-2 text-sm'>
          {attention.map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className='rounded-md border bg-card px-3 py-1.5 hover:bg-muted'
            >
              <strong>{a.n}</strong> {a.label}
            </Link>
          ))}
        </div>
      )}
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
              Last {days} days (cancelled orders excluded)
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
            <CardDescription>Last {days} days</CardDescription>
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
            <CardDescription>Last {days} days</CardDescription>
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
            <CardDescription>Units sold, last {days} days</CardDescription>
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
            {recentOrders.length === 0 && (
              <p className='text-sm text-muted-foreground'>No orders yet.</p>
            )}
            {recentOrders.map((o) => (
              <div
                key={o.id}
                className='flex items-center justify-between gap-3 text-sm'
              >
                <div className='min-w-0'>
                  <p className='font-medium'>
                    {o.id} · {o.firstName} {o.lastName}
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
            {lowStock.map((p) => (
              <div
                key={p.id}
                className='flex items-center justify-between gap-3 text-sm'
              >
                <span className='truncate'>{p.name}</span>
                <Badge variant='destructive'>{p.stock} left</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}

