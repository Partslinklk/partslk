'use client'

import { siteConfig } from '@/admin/config/site'
import { cn } from '@/admin/lib/utils'

type FooterProps = React.ComponentProps<'footer'>

export function Footer({ className, ...props }: FooterProps) {
  return (
    <footer
      className={cn(
        'text-muted-foreground mt-auto shrink-0 border-t px-4 py-4 text-center text-sm',
        className
      )}
      {...props}
    >
      <span>
        &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
      </span>
    </footer>
  )
}
