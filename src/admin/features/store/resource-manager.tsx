'use client'

import { useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { cn } from '@/admin/lib/utils'
import { Button } from '@/admin/components/ui/button'
import { Input } from '@/admin/components/ui/input'
import { Textarea } from '@/admin/components/ui/textarea'
import { Label } from '@/admin/components/ui/label'
import { ConfirmDialog } from '@/admin/components/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { ImageField } from './image-field'
import { uniqueId, useCollection, type CollectionName } from './use-collection'

type Option = { value: string; label: string }

export type Field = {
  key: string
  label: string
  type:
    | 'text'
    | 'textarea'
    | 'number'
    | 'select'
    | 'multiselect'
    | 'checkbox'
    | 'image'
    | 'lines'
    | 'datetime'
  options?: Option[]
  required?: boolean
  help?: string
  step?: number
  min?: number
  max?: number
  placeholder?: string
  /** Span both columns in the form. */
  wide?: boolean
}

export type Column<T> = {
  header: string
  cell: (item: T) => React.ReactNode
  className?: string
}

type Item = { id: string } & Record<string, unknown>

type Props<T extends Item> = {
  collection: CollectionName
  /** Singular label, e.g. "Product". */
  noun: string
  columns: Column<T>[]
  fields: Field[]
  /** Blank item shown in the "add" form. */
  blank: Omit<T, 'id'>
  /** Field whose value becomes the new item's id. */
  idFrom: string
  searchKeys: string[]
  /** Tidy up values just before saving (drop empty optionals, etc). */
  normalize?: (item: T) => T
  emptyText?: string
}

const selectClass =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

// <input type="datetime-local"> wants local "YYYY-MM-DDTHH:mm".
function toLocalInput(iso: unknown) {
  const d = new Date(String(iso ?? ''))
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ResourceManager<T extends Item>({
  collection,
  noun,
  columns,
  fields,
  blank,
  idFrom,
  searchKeys,
  normalize,
  emptyText,
}: Props<T>) {
  const { items, loading, saving, save } = useCollection<T>(collection)
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<T | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [deleting, setDeleting] = useState<T | null>(null)
  const [error, setError] = useState('')

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) =>
      searchKeys.some((k) =>
        String(item[k] ?? '')
          .toLowerCase()
          .includes(q)
      )
    )
  }, [items, query, searchKeys])

  function openNew() {
    setEditing({ id: '', ...blank } as unknown as T)
    setIsNew(true)
    setError('')
  }

  function openEdit(item: T) {
    setEditing({ ...item })
    setIsNew(false)
    setError('')
  }

  function set(key: string, value: unknown) {
    setEditing((cur) => (cur ? ({ ...cur, [key]: value } as T) : cur))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    for (const f of fields) {
      const v = editing[f.key]
      if (
        f.required &&
        (v === undefined || v === null || String(v).trim() === '')
      ) {
        setError(`${f.label} is required.`)
        return
      }
    }
    let item = editing
    if (isNew) {
      item = {
        ...item,
        id: uniqueId(
          String(item[idFrom] ?? noun),
          items.map((i) => i.id)
        ),
      }
    }
    if (normalize) item = normalize(item)
    const next = isNew
      ? [item, ...items]
      : items.map((i) => (i.id === item.id ? item : i))
    if (await save(next, isNew ? `${noun} added` : `${noun} updated`))
      setEditing(null)
  }

  async function confirmDelete() {
    if (!deleting) return
    const ok = await save(
      items.filter((i) => i.id !== deleting.id),
      `${noun} deleted`
    )
    if (ok) setDeleting(null)
  }

  function renderField(f: Field) {
    if (!editing) return null
    const value = editing[f.key]
    const id = `f-${f.key}`

    switch (f.type) {
      case 'textarea':
        return (
          <Textarea
            id={id}
            rows={4}
            value={String(value ?? '')}
            placeholder={f.placeholder}
            onChange={(e) => set(f.key, e.target.value)}
          />
        )
      case 'lines':
        return (
          <Textarea
            id={id}
            rows={4}
            value={Array.isArray(value) ? (value as string[]).join('\n') : ''}
            placeholder={f.placeholder}
            onChange={(e) => set(f.key, e.target.value.split('\n'))}
            onBlur={() =>
              set(
                f.key,
                (Array.isArray(value) ? (value as string[]) : [])
                  .map((l) => l.trim())
                  .filter(Boolean)
              )
            }
          />
        )
      case 'number':
        return (
          <Input
            id={id}
            type='number'
            step={f.step ?? 1}
            min={f.min ?? 0}
            max={f.max}
            value={value === undefined || value === null ? '' : String(value)}
            onChange={(e) =>
              set(f.key, e.target.value === '' ? undefined : Number(e.target.value))
            }
          />
        )
      case 'select':
        return (
          <select
            id={id}
            className={selectClass}
            value={String(value ?? '')}
            onChange={(e) => set(f.key, e.target.value)}
          >
            {f.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )
      case 'multiselect': {
        const current = Array.isArray(value) ? (value as string[]) : []
        return (
          <div className='flex flex-wrap gap-2'>
            {f.options?.map((o) => {
              const on = current.includes(o.value)
              return (
                <label
                  key={o.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm',
                    on && 'border-primary bg-primary/5'
                  )}
                >
                  <input
                    type='checkbox'
                    checked={on}
                    onChange={() =>
                      set(
                        f.key,
                        on
                          ? current.filter((v) => v !== o.value)
                          : [...current, o.value]
                      )
                    }
                  />
                  {o.label}
                </label>
              )
            })}
            {!f.options?.length && (
              <p className='text-sm text-muted-foreground'>No options yet.</p>
            )}
          </div>
        )
      }
      case 'checkbox':
        return (
          <label className='flex items-center gap-2 text-sm'>
            <input
              id={id}
              type='checkbox'
              checked={Boolean(value)}
              onChange={(e) => set(f.key, e.target.checked)}
            />
            {f.help}
          </label>
        )
      case 'image':
        return (
          <ImageField
            value={String(value ?? '')}
            onChange={(v) => set(f.key, v)}
          />
        )
      case 'datetime':
        return (
          <Input
            id={id}
            type='datetime-local'
            value={toLocalInput(value)}
            onChange={(e) => {
              const d = new Date(e.target.value)
              set(f.key, Number.isNaN(d.getTime()) ? '' : d.toISOString())
            }}
          />
        )
      default:
        return (
          <Input
            id={id}
            value={String(value ?? '')}
            placeholder={f.placeholder}
            onChange={(e) => set(f.key, e.target.value)}
          />
        )
    }
  }

  return (
    <>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
        <div className='relative w-full max-w-xs'>
          <Search className='absolute inset-s-2.5 top-2.5 size-4 text-muted-foreground' />
          <Input
            className='ps-8'
            placeholder={`Search ${noun.toLowerCase()}s…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button className='max-sm:w-full' onClick={openNew}>
          <Plus /> Add {noun}
        </Button>
      </div>

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.header} className={c.className}>
                  {c.header}
                </TableHead>
              ))}
              <TableHead className='w-24 text-end'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className='h-24 text-center text-muted-foreground'
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : shown.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className='h-24 text-center text-muted-foreground'
                >
                  {query
                    ? 'No matches.'
                    : (emptyText ?? `No ${noun.toLowerCase()}s yet.`)}
                </TableCell>
              </TableRow>
            ) : (
              shown.map((item) => (
                <TableRow key={item.id}>
                  {columns.map((c) => (
                    <TableCell key={c.header} className={c.className}>
                      {c.cell(item)}
                    </TableCell>
                  ))}
                  <TableCell className='text-end'>
                    <Button
                      variant='ghost'
                      size='icon'
                      aria-label={`Edit ${noun}`}
                      onClick={() => openEdit(item)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      aria-label={`Delete ${noun}`}
                      className='text-destructive hover:text-destructive'
                      onClick={() => setDeleting(item)}
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

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className='max-h-[90svh] w-[calc(100%-1.5rem)] overflow-y-auto p-4 sm:max-w-2xl sm:p-6'>
          <DialogHeader>
            <DialogTitle>{isNew ? `Add ${noun}` : `Edit ${noun}`}</DialogTitle>
            <DialogDescription>
              Changes appear on the website as soon as you save.
            </DialogDescription>
          </DialogHeader>
          <form
            id='resource-form'
            onSubmit={submit}
            className='grid gap-4 sm:grid-cols-2'
          >
            {fields.map((f) => (
              <div
                key={f.key}
                className={cn(
                  'grid content-start gap-1.5',
                  (f.wide ||
                    ['textarea', 'lines', 'multiselect', 'image'].includes(
                      f.type
                    )) &&
                    'sm:col-span-2'
                )}
              >
                <Label htmlFor={`f-${f.key}`}>
                  {f.label}
                  {f.required && <span className='text-destructive'> *</span>}
                </Label>
                {renderField(f)}
                {f.help && f.type !== 'checkbox' && (
                  <p className='text-xs text-muted-foreground'>{f.help}</p>
                )}
              </div>
            ))}
            {error && (
              <p className='text-sm text-destructive sm:col-span-2'>{error}</p>
            )}
          </form>
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type='submit' form='resource-form' disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete this ${noun.toLowerCase()}?`}
        desc={`"${String(deleting?.[idFrom] ?? '')}" will be removed from the website. This cannot be undone.`}
        confirmText='Delete'
        destructive
        isLoading={saving}
        handleConfirm={confirmDelete}
      />
    </>
  )
}
