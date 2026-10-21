'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/admin/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/admin/components/ui/table'
import { formatPrice } from '@/lib/format-price'
import type { Order } from '@/lib/db'
import { PageShell } from './page-shell'
import { useCollection } from './use-collection'

export function CustomersPage() {
  const { items: orders, loading } = useCollection<Order>('orders')
  const [query, setQuery] = useState('')

  // Customers are built from the orders they placed.
  const customers = useMemo(() => {
    const byEmail = new Map<
      string,
      { name: string; email: string; phone: string; orders: number; spent: number; last: string }
    >()
    for (const o of [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
      const key = o.customer.email.toLowerCase()
      const cur = byEmail.get(key)
      byEmail.set(key, {
        name: `${o.customer.firstName} ${o.customer.lastName}`.trim(),
        email: o.customer.email,
        phone: o.customer.phone,
        orders: (cur?.orders ?? 0) + 1,
        spent: (cur?.spent ?? 0) + (o.status === 'cancelled' ? 0 : o.total),
        last: o.createdAt,
      })
    }
    const q = query.trim().toLowerCase()
    return [...byEmail.values()]
      .filter((c) => !q || `${c.name} ${c.email}`.toLowerCase().includes(q))
      .sort((a, b) => b.last.localeCompare(a.last))
  }, [orders, query])

  return (
    <PageShell
      title='Customers'
      description='Everyone who has placed an order on the website.'
    >
      <Input
        className='mb-4 w-full sm:max-w-xs'
        placeholder='Search customers…'
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className='hidden sm:table-cell'>Phone</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Total spent</TableHead>
              <TableHead className='hidden md:table-cell'>Last order</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className='h-24 text-center text-muted-foreground'>
                  Loading…
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className='h-24 text-center text-muted-foreground'>
                  No customers yet.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => (
                <TableRow key={c.email}>
                  <TableCell>
                    <p className='font-medium'>{c.name}</p>
                    <p className='text-xs text-muted-foreground'>{c.email}</p>
                  </TableCell>
                  <TableCell className='hidden text-muted-foreground sm:table-cell'>
                    {c.phone}
                  </TableCell>
                  <TableCell>{c.orders}</TableCell>
                  <TableCell>{formatPrice(c.spent)}</TableCell>
                  <TableCell className='hidden text-muted-foreground md:table-cell'>
                    {new Date(c.last).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </PageShell>
  )
}
