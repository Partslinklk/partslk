'use client'

import { useRef, useState } from 'react'
import { ImageIcon, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/admin/components/ui/button'
import { Input } from '@/admin/components/ui/input'

/** Image URL/path input with an upload button (files land in /public/uploads). */
export function ImageField({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function upload(file: File) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: form,
      })
      const json = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !json.url) throw new Error(json.error || 'Upload failed.')
      onChange(json.url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className='flex items-center gap-3'>
      <div className='flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted'>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt='' className='size-full object-contain' />
        ) : (
          <ImageIcon className='size-6 text-muted-foreground' />
        )}
      </div>
      <div className='flex min-w-0 flex-1 flex-wrap gap-2'>
        <Input
          className='min-w-0 flex-1 basis-40'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder='/product-1.png or https://…'
        />
        <input
          ref={inputRef}
          type='file'
          accept='image/png,image/jpeg,image/webp,image/gif'
          className='hidden'
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
            e.target.value = ''
          }}
        />
        <Button
          type='button'
          variant='outline'
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className='animate-spin' /> : <Upload />}
          Upload
        </Button>
      </div>
    </div>
  )
}
