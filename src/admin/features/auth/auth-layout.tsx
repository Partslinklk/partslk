'use client'

import { Logo } from '@/admin/assets/logo'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='container grid h-svh max-w-none items-center justify-items-center'>
      <div className='mx-auto flex w-full max-w-[480px] flex-col justify-center space-y-2 py-8 sm:p-8'>
        <div className='mb-4 flex items-center justify-center'>
          <Logo className='h-12' />
        </div>
        {children}
      </div>
    </div>
  )
}
