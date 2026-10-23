'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Star, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/admin/components/ui/badge'
import { Button } from '@/admin/components/ui/button'
import { ConfirmDialog } from '@/admin/components/confirm-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/admin/components/ui/table'
import { PageShell } from './page-shell'

type Status = 'pending' | 'approved' | 'rejected'
type Review = {
  id: string
  productId: string
  productName: string | null
  author: string
  email: string | null
  rating: number
  title: string
  body: string
  status: Status
  createdAt: string
}

const FILTERS: (Status | 'all')[] = ['pending', 'approved', 'rejected', 'all']
const variant: Record<Status, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'outline',
  approved: 'default',
  rejected: 'destructive',
}

async function call(url: string, init?: RequestInit) {
  const res = await fetch(url, init)
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(json.error || 'Request failed.')
  }
  return res
}

export function ReviewsPage() {
  const [items, setItems] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Status | 'all'>('pending')
  const [deleting, setDeleting] = useState<Review | null>(null)

  const load = useCallback(async () => {
    try {
      setItems((await (await call('/api/admin/reviews')).json()) as Review[])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load reviews.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    call('/api/admin/reviews')
      .then((r) => r.json() as Promise<Review[]>)
      .then((d) => !cancelled && setItems(d))
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Could not load reviews.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const shown = useMemo(
    () => (filter === 'all' ? items : items.filter((r) => r.status === filter)),
    [items, filter]
  )
  const pending = items.filter((r) => r.status === 'pending').length

  async function moderate(r: Review, status: Status) {
    try {
      await call(`/api/admin/reviews/${r.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setItems((cur) => cur.map((x) => (x.id === r.id ? { ...x, status } : x)))
      toast.success(status === 'approved' ? 'Review approved' : 'Review rejected')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update.')
    }
  }

  return (
    <PageShell
      title='Reviews'
      description='Customer reviews wait here until you approve them. Only approved reviews count toward a product’s rating.'
    >
      <div className='mb-4 flex flex-wrap gap-2'>
        {FILTERS.map((f) => (
          <Button
            key={f}
            size='sm'
            variant={filter === f ? 'default' : 'outline'}
            className='capitalize'
            onClick={() => setFilter(f)}
          >
            {f}
            {f === 'pending' && pending > 0 ? ` (${pending})` : ''}
          </Button>
        ))}
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Review</TableHead>
              <TableHead className='hidden sm:table-cell'>By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='w-28 text-end'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className='h-24 text-center text-muted-foreground'>
                  Loading…
                </TableCell>
              </TableRow>
            ) : shown.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className='h-24 text-center text-muted-foreground'>
                  {items.length === 0 ? 'No reviews yet.' : `No ${filter} reviews.`}
                </TableCell>
              </TableRow>
            ) : (
              shown.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className='max-w-40 truncate font-medium'>
                    {r.productName ?? r.productId}
                  </TableCell>
                  <TableCell className='max-w-sm'>
                    <p className='flex items-center gap-1 text-sm'>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`size-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`}
                        />
                      ))}
                      {r.title && <span className='ms-1 font-medium'>{r.title}</span>}
                    </p>
                    <p className='mt-1 text-sm whitespace-pre-wrap text-muted-foreground'>{r.body}</p>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </TableCell>
                  <TableCell className='hidden sm:table-cell'>
                    <p>{r.author}</p>
                    <p className='text-xs text-muted-foreground'>{r.email}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={variant[r.status]} className='capitalize'>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-end'>
                    {r.status !== 'approved' && (
                      <Button variant='ghost' size='icon' aria-label='Approve review' onClick={() => moderate(r, 'approved')}>
                        <Check />
                      </Button>
                    )}
                    {r.status !== 'rejected' && (
                      <Button variant='ghost' size='icon' aria-label='Reject review' onClick={() => moderate(r, 'rejected')}>
                        <X />
                      </Button>
                    )}
                    <Button variant='ghost' size='icon' aria-label='Delete review' onClick={() => setDeleting(r)}>
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title='Delete this review?'
        desc={`The review by ${deleting?.author ?? ''} will be permanently removed and the product rating recalculated.`}
        confirmText='Delete'
        destructive
        handleConfirm={async () => {
          if (!deleting) return
          try {
            await call(`/api/admin/reviews/${deleting.id}`, { method: 'DELETE' })
            setItems((cur) => cur.filter((x) => x.id !== deleting.id))
            setDeleting(null)
            toast.success('Review deleted')
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not delete.')
            void load()
          }
        }}
      />
    </PageShell>
  )
}
