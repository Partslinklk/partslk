'use client'

import * as React from 'react'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/admin/components/ui/sidebar'

type TeamSwitcherProps = {
  teams: {
    name: string
    logo: React.ElementType
    plan: string
  }[]
}

// Single-site admin: shows the site logo and name (no team dropdown).
export function TeamSwitcher({ teams }: TeamSwitcherProps) {
  const team = teams[0]

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='hover:bg-transparent active:bg-transparent'
          asChild
        >
          <div>
            <div className='size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground hidden group-data-[collapsible=icon]:flex'>
              {team.name.charAt(0)}
            </div>
            <div className='group-data-[collapsible=icon]:hidden'>
              <team.logo className='h-9' />
            </div>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
