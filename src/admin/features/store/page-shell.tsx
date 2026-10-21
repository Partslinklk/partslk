'use client'

import { ConfigDrawer } from '@/admin/components/config-drawer'
import { Header } from '@/admin/components/layout/header'
import { Main } from '@/admin/components/layout/main'
import { ProfileDropdown } from '@/admin/components/profile-dropdown'
import { Search } from '@/admin/components/search'
import { ThemeSwitch } from '@/admin/components/theme-switch'

export function PageShell({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>
      <Main>
        <div className='mb-6 flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>{title}</h2>
            {description && (
              <p className='text-muted-foreground'>{description}</p>
            )}
          </div>
          {actions}
        </div>
        {children}
      </Main>
    </>
  )
}
