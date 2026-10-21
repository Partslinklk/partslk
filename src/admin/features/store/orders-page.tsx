'use client'

import { useMemo, useState } from 'react'
import { Eye, Trash2 } from 'lucide-react'
import { Badge } from '@/admin/components/ui/badge'
import { Button } from '@/admin/components/ui/button'
import { Input } from '@/admin/components/ui/input'
import { ConfirmDialog } from '@/admin/components/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/admin/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/admin/components/ui/table'
import { formatPrice } from '@/lib/format-price'
import type { Order, OrderStatus } from '@/lib/db'
import { PageShell } from './page-shell'
import { useCollection } from './use-collection'

export const STATUSES: OrderStatus[] = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]

export const statusVariant: Record<
  OrderStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  pending: 'outline',
  processing: 'secondary',
  shipped: 'secondary',
  delivered: 'default',
  cancelled: 'destructive',
}

const selectClass =
  'h-8 rounded-md border border-input bg-transparent px-2 text-sm capitalize shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

export function OrdersPage() {
  const { items, loading, saving, save } = useCollection<Order>('orders')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | OrderStatus>('all')
  const [viewing, setViewing] = useState<Order | null>(null)
  const [deleting, setDeleting] = useState<Order | null>(null)

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter(
      (o) =>
        (status === 'all' || o.status === status) &&
        (!q ||
          `${o.id} ${o.customer.firstName} ${o.customer.lastName} ${o.customer.email}`
            .toLowerCase()
            .includes(q))
    )
  }, [items, query, status])

  const setOrderStatus = (order: Order, next: OrderStatus) =>
    save(
      items.map((o) => (o.id === order.id ? { ...o, status: next } : o)),
      `Order ${order.id} marked ${next}`
    )

  return (
    <PageShell
      title='Orders'
      description='Orders placed through the website checkout.'
    >
      <div className='mb-4 flex flex-wrap items-center gap-2'>
        <Input
          className='w-full sm:max-w-xs'
          placeholder='Search by order, name or email…'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className={selectClass + ' h-9 w-full sm:w-auto'}
          value={status}
          onChange={(e) => setStatus(e.target.value as 'all' | OrderStatus)}
        >
          <option value='all'>All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead className='hidden md:table-cell'>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className='hidden sm:table-cell'>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='w-24 text-end'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className='h-24 text-center text-muted-foreground'>
                  Loading…
                </TableCell>
              </TableRow>
            ) : shown.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className='h-24 text-center text-muted-foreground'>
                  {items.length === 0 ? 'No orders yet.' : 'No matches.'}
                </TableCell>
              </TableRow>
            ) : (
              shown.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className='font-medium'>{o.id}</TableCell>
                  <TableCell className='hidden text-muted-foreground md:table-cell'>
                    {new Date(o.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <p>
                      {o.customer.firstName} {o.customer.lastName}
                    </p>
                    <p className='text-xs text-muted-foreground'>{o.customer.email}</p>
                  </TableCell>
                  <TableCell className='hidden sm:table-cell'>
                    {o.items.reduce((n, i) => n + i.qty, 0)}
                  </TableCell>
                  <TableCell>{formatPrice(o.total)}</TableCell>
                  <TableCell>
                    <select
                      className={selectClass}
                      value={o.status}
                      disabled={saving}
                      onChange={(e) => setOrderStatus(o, e.target.value as OrderStatus)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className='text-end'>
                    <Button variant='ghost' size='icon' aria-label='View order' onClick={() => setViewing(o)}>
                      <Eye />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      aria-label='Delete order'
                      className='text-destructive hover:text-destructive'
                      onClick={() => setDeleting(o)}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={viewing !== null} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className='max-h-[90svh] overflow-y-auto sm:max-w-xl'>
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>Order {viewing.id}</DialogTitle>
                <DialogDescription>
                  {new Date(viewing.createdAt).toLocaleString()} ·{' '}
                  <Badge variant={statusVariant[viewing.status]} className='capitalize'>
                    {viewing.status}
                  </Badge>
                </DialogDescription>
              </DialogHeader>
              <div className='grid gap-4 text-sm'>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div>
                    <p className='mb-1 font-medium'>Customer</p>
                    <p>
                      {viewing.customer.firstName} {viewing.customer.lastName}
                    </p>
                    <p className='text-muted-foreground'>{viewing.customer.email}</p>
                    <p className='text-muted-foreground'>{viewing.customer.phone}</p>
                  </div>
                  <div>
                    <p className='mb-1 font-medium'>Delivery address</p>
                    <p className='text-muted-foreground'>
                      {[viewing.address.address, viewing.address.city, viewing.address.postcode, viewing.address.country]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </div>
                <div className='rounded-md border'>
                  {viewing.items.map((i) => (
                    <div key={i.id} className='flex items-center justify-between gap-3 border-b p-2 last:border-b-0'>
                      <span className='truncate'>
                        {i.qty} × {i.name}
                      </span>
                      <span>{formatPrice(i.price * i.qty)}</span>
                    </div>
                  ))}
                  <div className='flex justify-between p-2 text-muted-foreground'>
                    <span>Shipping ({viewing.shipping.label})</span>
                    <span>{formatPrice(viewing.shipping.cost)}</span>
                  </div>
                  <div className='flex justify-between border-t p-2 font-semibold'>
                    <span>Total</span>
                    <span>{formatPrice(viewing.total)}</span>
                  </div>
                </div>
                <p>
                  <span className='font-medium'>Payment:</span> {viewing.payment}
                </p>
                {viewing.note && (
                  <p>
                    <span className='font-medium'>Note:</span> {viewing.note}
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title='Delete this order?'
        desc={`Order ${deleting?.id ?? ''} will be permanently removed.`}
        confirmText='Delete'
        destructive
        isLoading={saving}
        handleConfirm={async () => {
          if (deleting && (await save(items.filter((o) => o.id !== deleting.id), 'Order deleted')))
            setDeleting(null)
        }}
      />
    </PageShell>
  )
}
