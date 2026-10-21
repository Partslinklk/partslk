'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import LoadingBar, { type LoadingBarRef } from 'react-top-loading-bar'

export function NavigationProgress() {
  const ref = useRef<LoadingBarRef>(null)
  const pathname = usePathname()

  // Next.js doesn't expose a "pending" router state, so flash the bar
  // whenever the route changes.
  useEffect(() => {
    ref.current?.continuousStart()
    const id = setTimeout(() => ref.current?.complete(), 150)
    return () => clearTimeout(id)
  }, [pathname])

  return (
    <LoadingBar
      color='var(--muted-foreground)'
      ref={ref}
      shadow={true}
      height={2}
    />
  )
}
