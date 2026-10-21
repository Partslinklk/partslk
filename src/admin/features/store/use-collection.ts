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

/** Load a store collection from the JSON store and save changes back to it. */
export function useCollection<T extends { id: string }>(name: CollectionName) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/data/${name}`)
      .then((res) => {
        if (!res.ok) throw new Error('Could not load data.')
        return res.json() as Promise<T[]>
      })
      .then((data) => !cancelled && setItems(data))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : 'Could not load data.')
      )
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [name])

  /** Persist `next`; the list only updates once the server accepted it. */
  const save = useCallback(
    async (next: T[], message = 'Saved') => {
      setSaving(true)
      try {
        const res = await fetch(`/api/admin/data/${name}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        })
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as {
            error?: string
          }
          throw new Error(json.error || 'Could not save.')
        }
        setItems(next)
        toast.success(message)
        return true
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not save.')
        return false
      } finally {
        setSaving(false)
      }
    },
    [name]
  )

  return { items, loading, saving, save }
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
