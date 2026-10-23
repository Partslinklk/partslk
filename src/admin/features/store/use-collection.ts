'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

export type CollectionName =
  | 'products'
  | 'categories'
  | 'brands'
  | 'makes'
  | 'deals'
  | 'featured'
  | 'popular'
  | 'testimonials'
  | 'orders'

async function call(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as {
      error?: string
      fields?: Record<string, string>
    }
    const detail = json.fields ? Object.values(json.fields)[0] : ''
    throw new Error([json.error, detail].filter(Boolean).join(' ') || 'Could not save.')
  }
}

/**
 * Load a store collection and save changes to it. `save(next)` takes the full desired list
 * and is translated into per-row requests (POST new / PUT changed / DELETE removed, then a
 * reorder when the order differs) so pages don't need to know about the REST API.
 */
export function useCollection<T extends { id: string }>(name: CollectionName) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const base = name === 'orders' ? '/api/admin/orders' : `/api/admin/${name}`

  const load = useCallback(async () => {
    const res = await fetch(base)
    if (!res.ok) throw new Error('Could not load data.')
    return (await res.json()) as T[]
  }, [base])

  useEffect(() => {
    let cancelled = false
    load()
      .then((data) => !cancelled && setItems(data))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : 'Could not load data.')
      )
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [load])

  /** Persist `next`; the list only updates once the server accepted it. */
  const save = useCallback(
    async (next: T[], message = 'Saved') => {
      setSaving(true)
      try {
        const prevById = new Map(items.map((i) => [i.id, i]))
        const nextIds = new Set(next.map((i) => i.id))

        for (const old of items) {
          if (!nextIds.has(old.id)) await call('DELETE', `${base}/${encodeURIComponent(old.id)}`)
        }
        for (const item of next) {
          const old = prevById.get(item.id)
          if (old && JSON.stringify(old) !== JSON.stringify(item)) {
            await call('PUT', `${base}/${encodeURIComponent(item.id)}`, item)
          }
        }
        for (const item of next) {
          if (!prevById.has(item.id)) await call('POST', base, item)
        }

        const survivors = items.filter((i) => nextIds.has(i.id)).map((i) => i.id)
        const expected = [...survivors, ...next.filter((i) => !prevById.has(i.id)).map((i) => i.id)]
        if (name !== 'orders' && expected.join() !== next.map((i) => i.id).join()) {
          await call('PUT', `${base}/reorder`, { ids: next.map((i) => i.id) })
        }

        setItems(next)
        toast.success(message)
        return true
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not save.')
        // A partial failure may have changed some rows; resync with the server.
        load().then(setItems).catch(() => undefined)
        return false
      } finally {
        setSaving(false)
      }
    },
    [items, base, name, load]
  )

  const reload = useCallback(async () => setItems(await load()), [load])

  return { items, loading, saving, save, reload }
}

export function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'item'
  )
}

export function uniqueId(base: string, taken: string[]) {
  let id = slugify(base)
  let n = 2
  while (taken.includes(id)) id = `${slugify(base)}-${n++}`
  return id
}
