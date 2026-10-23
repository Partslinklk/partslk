'use client'

import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ImageIcon, Loader2, Plus, Star, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/admin/components/ui/button'
import { Input } from '@/admin/components/ui/input'

const MAX_IMAGES = 12

/**
 * Product gallery editor: upload several photos at once (front, back, sides, details...), reorder them,
 * choose the cover (the first photo) and remove any. Files go to Supabase Storage via /api/admin/upload.
 */
export function ImagesField({
  value,
  onChange,
}: {
  value: string[]
  onChange: (value: string[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)
  const [url, setUrl] = useState('')

  async function uploadAll(files: File[]) {
    const room = MAX_IMAGES - value.length
    if (room <= 0) return toast.error(`A product can have at most ${MAX_IMAGES} images.`)
    const batch = files.slice(0, room)
    if (batch.length < files.length) toast.warning(`Only the first ${batch.length} image(s) were added (limit ${MAX_IMAGES}).`)

    setUploading(batch.length)
    const added: string[] = []
    for (const file of batch) {
      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/admin/upload', { method: 'POST', body: form })
        const json = (await res.json()) as { url?: string; error?: string }
        if (!res.ok || !json.url) throw new Error(json.error || 'Upload failed.')
        added.push(json.url)
      } catch (err) {
        toast.error(`${file.name}: ${err instanceof Error ? err.message : 'Upload failed.'}`)
      } finally {
        setUploading((n) => n - 1)
      }
    }
    if (added.length) onChange([...value, ...added])
  }

  function addUrl() {
    const next = url.trim()
    if (!next) return
    if (!/^(\/[^\s"'()\\]*|https?:\/\/[^\s"'()\\]+)$/.test(next)) {
      return toast.error('Use an image path like /photo.png or a full https:// address.')
    }
    if (value.includes(next)) return toast.error('That image is already in the gallery.')
    if (value.length >= MAX_IMAGES) return toast.error(`A product can have at most ${MAX_IMAGES} images.`)
    onChange([...value, next])
    setUrl('')
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return
    const next = [...value]
    next.splice(to, 0, next.splice(from, 1)[0])
    onChange(next)
  }

  return (
    <div className='space-y-3'>
      {value.length === 0 && uploading === 0 ? (
        <div className='flex h-24 items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground'>
          <ImageIcon className='size-5' /> No images yet. The first one you add becomes the cover.
        </div>
      ) : (
        <ul className='grid grid-cols-3 gap-3 sm:grid-cols-4'>
          {value.map((src, i) => (
            <li key={src} className='group relative aspect-square overflow-hidden rounded-md border bg-muted'>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Product image ${i + 1}`} className='size-full object-contain' />
              {i === 0 && (
                <span className='absolute start-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground'>
                  Cover
                </span>
              )}
              <div className='absolute inset-x-0 bottom-0 flex items-center justify-between gap-0.5 bg-background/90 p-0.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'>
                <Button type='button' variant='ghost' size='icon' className='size-6' aria-label='Move earlier' disabled={i === 0} onClick={() => move(i, i - 1)}>
                  <ChevronLeft />
                </Button>
                {i !== 0 && (
                  <Button type='button' variant='ghost' size='icon' className='size-6' aria-label='Make cover' title='Make cover' onClick={() => move(i, 0)}>
                    <Star />
                  </Button>
                )}
                <Button type='button' variant='ghost' size='icon' className='size-6' aria-label='Move later' disabled={i === value.length - 1} onClick={() => move(i, i + 1)}>
                  <ChevronRight />
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='size-6 text-destructive'
                  aria-label='Remove image'
                  onClick={() => onChange(value.filter((_, n) => n !== i))}
                >
                  <X />
                </Button>
              </div>
            </li>
          ))}
          {Array.from({ length: uploading }).map((_, n) => (
            <li key={`up-${n}`} className='flex aspect-square items-center justify-center rounded-md border bg-muted'>
              <Loader2 className='size-5 animate-spin text-muted-foreground' />
            </li>
          ))}
        </ul>
      )}

      <div className='flex flex-wrap gap-2'>
        <input
          ref={inputRef}
          type='file'
          multiple
          accept='image/png,image/jpeg,image/webp,image/gif'
          className='hidden'
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            if (files.length) void uploadAll(files)
          }}
        />
        <Button type='button' variant='outline' disabled={uploading > 0 || value.length >= MAX_IMAGES} onClick={() => inputRef.current?.click()}>
          {uploading > 0 ? <Loader2 className='animate-spin' /> : <Upload />}
          Upload images
        </Button>
        <Input
          className='min-w-0 flex-1 basis-40'
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addUrl()
            }
          }}
          placeholder='…or paste an image address'
        />
        <Button type='button' variant='outline' onClick={addUrl} disabled={!url.trim()}>
          <Plus /> Add
        </Button>
      </div>
      <p className='text-xs text-muted-foreground'>
        {value.length}/{MAX_IMAGES} images · PNG, JPG, WebP or GIF up to 5 MB each · the first image is the cover shown on product cards.
      </p>
    </div>
  )
}
