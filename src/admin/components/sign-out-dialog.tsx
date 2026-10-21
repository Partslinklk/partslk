'use client'

import { useAuthStore } from '@/admin/stores/auth-store'
import { ConfirmDialog } from '@/admin/components/confirm-dialog'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const { auth } = useAuthStore()

  const handleSignOut = async () => {
    auth.reset()
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => null)
    window.location.assign('/admin/sign-in')
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Sign out'
      desc='Are you sure you want to sign out? You will need to sign in again to access the admin panel.'
      confirmText='Sign out'
      destructive
      handleConfirm={handleSignOut}
      className='sm:max-w-sm'
    />
  )
}
