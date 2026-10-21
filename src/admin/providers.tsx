'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AxiosError } from 'axios'
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/admin/stores/auth-store'
import { handleServerError } from '@/admin/lib/handle-server-error'
import { Toaster } from '@/admin/components/ui/sonner'
import { NavigationProgress } from '@/admin/components/navigation-progress'
import { DirectionProvider } from '@/admin/context/direction-provider'
import { FontProvider } from '@/admin/context/font-provider'
import { ThemeProvider } from '@/admin/context/theme-provider'

const isDev = process.env.NODE_ENV === 'development'

export function AdminProviders({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              if (isDev) console.log({ failureCount, error })

              if (failureCount >= 0 && isDev) return false
              if (failureCount > 3 && !isDev) return false

              return !(
                error instanceof AxiosError &&
                [401, 403].includes(error.response?.status ?? 0)
              )
            },
            refetchOnWindowFocus: !isDev,
            staleTime: 10 * 1000, // 10s
          },
          mutations: {
            onError: (error) => {
              handleServerError(error)

              if (error instanceof AxiosError) {
                if (error.response?.status === 304) {
                  toast.error('Content not modified!')
                }
              }
            },
          },
        },
        queryCache: new QueryCache({
          onError: (error) => {
            if (error instanceof AxiosError) {
              if (error.response?.status === 401) {
                toast.error('Session expired!')
                useAuthStore.getState().auth.reset()
                const redirect = `${window.location.pathname.replace(/^\/admin/, '') || '/'}${window.location.search}`
                router.push(`/admin/sign-in?redirect=${encodeURIComponent(redirect)}`)
              }
              if (error.response?.status === 500) {
                toast.error('Internal Server Error!')
                // Only navigate to error page in production to avoid disrupting HMR in development
                if (!isDev) {
                  router.push('/admin/500')
                }
              }
            }
          },
        }),
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <FontProvider>
          <DirectionProvider>
            <Suspense>
              <NavigationProgress />
              {children}
            </Suspense>
            <Toaster duration={5000} />
          </DirectionProvider>
        </FontProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
