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
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={siteConfig.logo}
      alt={alt}
      className={cn('h-8 w-auto object-contain', className)}
    />
  )
}
