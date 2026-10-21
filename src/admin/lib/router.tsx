'use client'

/**
 * Thin adapter that gives the shadcn-admin template (written for TanStack
 * Router) the same navigation API on top of the Next.js App Router.
 *
 * All paths used inside the admin are "base-less" (e.g. `/users`); the
 * `/admin` prefix is added when navigating and stripped when reading.
 */
import { useCallback, useMemo, type ComponentProps } from 'react'
import NextLink from 'next/link'
import {
  usePathname,
  useRouter as useNextRouter,
  useSearchParams,
} from 'next/navigation'
import type { ZodType } from 'zod'

export const ADMIN_BASE = '/admin'

export type LinkProps = { to: string }

type SearchRecord = Record<string, unknown>

export type NavigateOptions = {
  to?: string
  search?: true | SearchRecord | ((prev: SearchRecord) => SearchRecord)
  replace?: boolean
}

export function withBase(to: string) {
  if (!to.startsWith('/')) return to
  if (to === ADMIN_BASE || to.startsWith(`${ADMIN_BASE}/`)) return to
  return to === '/' ? ADMIN_BASE : `${ADMIN_BASE}${to}`
}

function stripBase(pathname: string) {
  if (pathname === ADMIN_BASE) return '/'
  return pathname.startsWith(`${ADMIN_BASE}/`)
    ? pathname.slice(ADMIN_BASE.length)
    : pathname
}

// Same wire format TanStack Router uses: JSON for non-strings.
function parseValue(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function serializeValue(value: unknown): string {
  if (typeof value === 'string') {
    try {
      // A string that would parse as something else must be quoted.
      return typeof JSON.parse(value) === 'string'
        ? value
        : JSON.stringify(value)
    } catch {
      return value
    }
  }
  return JSON.stringify(value)
}

function parseSearch(params: URLSearchParams): SearchRecord {
  const result: SearchRecord = {}
  params.forEach((value, key) => {
    result[key] = parseValue(value)
  })
  return result
}

function buildQuery(search: SearchRecord) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null) continue
    params.set(key, serializeValue(value))
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function Link({
  to,
  disabled,
  ...props
}: LinkProps &
  Omit<ComponentProps<typeof NextLink>, 'href'> & { disabled?: boolean }) {
  return (
    <NextLink
      href={withBase(to)}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      {...props}
    />
  )
}

export function useLocation<T = ReturnType<typeof buildLocation>>(opts?: {
  select?: (location: ReturnType<typeof buildLocation>) => T
}): T {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const location = buildLocation(pathname, searchParams.toString())
  return opts?.select ? opts.select(location) : (location as T)
}

function buildLocation(pathname: string, searchStr: string) {
  const path = stripBase(pathname)
  return {
    pathname: path,
    searchStr: searchStr ? `?${searchStr}` : '',
    href: `${path}${searchStr ? `?${searchStr}` : ''}`,
  }
}

export function useSearch<T = SearchRecord>(schema?: ZodType<T>): T {
  const searchParams = useSearchParams()
  const key = searchParams.toString()
  return useMemo(() => {
    const raw = parseSearch(new URLSearchParams(key))
    if (!schema) return raw as T
    const parsed = schema.safeParse(raw)
    return parsed.success ? parsed.data : (raw as T)
  }, [key, schema])
}

export function useNavigate() {
  const router = useNextRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchKey = searchParams.toString()

  return useCallback(
    ({ to, search, replace }: NavigateOptions) => {
      const target = to ? withBase(to) : pathname
      const prev = parseSearch(new URLSearchParams(searchKey))
      let next: SearchRecord = {}
      if (search === true) next = prev
      else if (typeof search === 'function') next = search(prev)
      else if (search) next = search
      else if (!to) next = prev
      const url = `${target}${buildQuery(next)}`
      if (replace) router.replace(url)
      else router.push(url)
    },
    [router, pathname, searchKey]
  )
}

export function useRouter() {
  const router = useNextRouter()
  return {
    history: {
      go: (n: number) => window.history.go(n),
      back: () => router.back(),
    },
    navigate: ({ to, replace }: { to: string; replace?: boolean }) =>
      replace ? router.replace(withBase(to)) : router.push(withBase(to)),
  }
}
