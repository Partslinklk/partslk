'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
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
import { PageShell } from './page-shell'

type Status = 'new' | 'read' | 'replied'
type Message = {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: Status
  createdAt: string
}

const STATUSES: Status[] = ['new', 'read', 'replied']
const variant: Record<Status, 'default' | 'secondary' | 'outline'> = {
  new: 'default',
  read: 'outline',
  replied: 'secondary',
}

async function call(url: string, init?: RequestInit) {
  const res = await fetch(url, init)
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(json.error || 'Request failed.')
  }
  return res
}

export function MessagesPage() {
  const [items, setItems] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [viewing, setViewing] = useState<Message | null>(null)
  const [deleting, setDeleting] = useState<Message | null>(null)

  const load = useCallback(async () => {
    try {
      setItems((await (await call('/api/admin/messages')).json()) as Message[])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load messages.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    call('/api/admin/messages')
      .then((r) => r.json() as Promise<Message[]>)
      .then((d) => !cancelled && setItems(d))
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Could not load messages.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q
      ? items.filter((m) => `${m.name} ${m.email} ${m.subject} ${m.message}`.toLowerCase().includes(q))
      : items
  }, [items, query])

  async function setStatus(m: Message, status: Status) {
    try {
      await call(`/api/admin/messages/${m.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setItems((cur) => cur.map((x) => (x.id === m.id ? { ...x, status } : x)))
      setViewing((v) => (v && v.id === m.id ? { ...v, status } : v))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update.')
    }
  }

  function open(m: Message) {
    setViewing(m)
    if (m.status === 'new') void setStatus(m, 'read')
  }

  return (
    <PageShell title='Messages' description='Messages sent through the website contact form.'>
      <div className='mb-4'>
        <Input
          className='w-full sm:max-w-xs'
          placeholder='Search messages…'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead className='hidden md:table-cell'>Message</TableHead>
              <TableHead className='hidden sm:table-cell'>Received</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='w-24 text-end'>Actions</TableHead>
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
                  {items.length === 0 ? 'No messages yet.' : 'No matches.'}
                </TableCell>
              </TableRow>
            ) : (
              shown.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <p className={m.status === 'new' ? 'font-semibold' : ''}>{m.name}</p>
                    <p className='text-xs text-muted-foreground'>{m.email}</p>
                  </TableCell>
                  <TableCell className='hidden max-w-xs truncate text-muted-foreground md:table-cell'>
                    {m.message || '(no message)'}
                  </TableCell>
                  <TableCell className='hidden text-muted-foreground sm:table-cell'>
                    {new Date(m.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={variant[m.status]} className='capitalize'>
                      {m.status}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-end'>
                    <Button variant='ghost' size='icon' aria-label='View message' onClick={() => open(m)}>
                      <Eye />
                    </Button>
                    <Button variant='ghost' size='icon' aria-label='Delete message' onClick={() => setDeleting(m)}>
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={viewing !== null} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className='max-h-[90svh] overflow-y-auto sm:max-w-xl'>
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.name}</DialogTitle>
                <DialogDescription>
                  <a className='underline' href={`mailto:${viewing.email}`}>
                    {viewing.email}
                  </a>{' '}
                  · {new Date(viewing.createdAt).toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              <p className='rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap'>
                {viewing.message || '(no message)'}
              </p>
              <div className='flex flex-wrap items-center gap-2'>
                {STATUSES.map((s) => (
                  <Button
                    key={s}
                    size='sm'
                    variant={viewing.status === s ? 'default' : 'outline'}
                    className='capitalize'
                    onClick={() => setStatus(viewing, s)}
                  >
                    {s}
                  </Button>
                ))}
                <Button size='sm' variant='outline' asChild>
                  <a href={`mailto:${viewing.email}?subject=${encodeURIComponent('Re: your message to Partslk')}`}>
                    Reply by email
                  </a>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title='Delete this message?'
        desc={`The message from ${deleting?.name ?? ''} will be permanently removed.`}
        confirmText='Delete'
        destructive
        handleConfirm={async () => {
          if (!deleting) return
          try {
            await call(`/api/admin/messages/${deleting.id}`, { method: 'DELETE' })
            setItems((cur) => cur.filter((x) => x.id !== deleting.id))
            setDeleting(null)
            toast.success('Message deleted')
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not delete.')
            void load()
          }
        }}
      />
    </PageShell>
  )
}
