'use client'

import { cn } from '@/admin/lib/utils'
import { siteConfig } from '@/admin/config/site'

export function Logo({
  className,
  alt = siteConfig.name,
}: {
  className?: string
  alt?: string
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={siteConfig.logo}
      alt={alt}
      className={cn('h-8 w-auto object-contain', className)}
    />
  )
}
