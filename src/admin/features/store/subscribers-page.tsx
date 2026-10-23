'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/admin/components/ui/badge'
import { Button } from '@/admin/components/ui/button'
import { Input } from '@/admin/components/ui/input'
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

type Subscriber = {
  email: string
  source: string
  createdAt: string
  unsubscribedAt: string | null
}

export function SubscribersPage() {
  const [items, setItems] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [deleting, setDeleting] = useState<Subscriber | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/subscribers')
      .then(async (res) => {
        if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error || 'Could not load subscribers.')
        return (await res.json()) as Subscriber[]
      })
      .then((d) => !cancelled && setItems(d))
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Could not load subscribers.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? items.filter((s) => s.email.includes(q)) : items
  }, [items, query])

  const active = items.filter((s) => !s.unsubscribedAt)

  function exportCsv() {
    const rows = ['email,source,subscribed_at', ...active.map((s) => `${s.email},${s.source},${s.createdAt}`)]
    const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'subscribers.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <PageShell
      title='Subscribers'
      description={`${active.length} active newsletter subscriber${active.length === 1 ? '' : 's'}.`}
      actions={
        <Button variant='outline' onClick={exportCsv} disabled={active.length === 0}>
          <Download /> Export active (CSV)
        </Button>
      }
    >
      <div className='mb-4'>
        <Input
          className='w-full sm:max-w-xs'
          placeholder='Search by email…'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead className='hidden sm:table-cell'>Source</TableHead>
              <TableHead className='hidden md:table-cell'>Subscribed</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='w-16 text-end'>Remove</TableHead>
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
                  {items.length === 0 ? 'No subscribers yet.' : 'No matches.'}
                </TableCell>
              </TableRow>
            ) : (
              shown.map((s) => (
                <TableRow key={s.email}>
                  <TableCell className='font-medium'>{s.email}</TableCell>
                  <TableCell className='hidden capitalize text-muted-foreground sm:table-cell'>{s.source}</TableCell>
                  <TableCell className='hidden text-muted-foreground md:table-cell'>
                    {new Date(s.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.unsubscribedAt ? 'outline' : 'default'}>
                      {s.unsubscribedAt ? 'Unsubscribed' : 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-end'>
                    <Button variant='ghost' size='icon' aria-label='Remove subscriber' onClick={() => setDeleting(s)}>
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
        title='Remove this subscriber?'
        desc={`${deleting?.email ?? ''} will be removed from the list permanently.`}
        confirmText='Remove'
        destructive
        handleConfirm={async () => {
          if (!deleting) return
          const res = await fetch('/api/admin/subscribers', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: deleting.email }),
          })
          if (!res.ok) return toast.error(((await res.json().catch(() => ({}))) as { error?: string }).error || 'Could not remove.')
          setItems((cur) => cur.filter((x) => x.email !== deleting.email))
          setDeleting(null)
          toast.success('Subscriber removed')
        }}
      />
    </PageShell>
  )
}
