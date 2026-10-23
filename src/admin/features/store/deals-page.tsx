'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/admin/components/ui/badge'
import { Button } from '@/admin/components/ui/button'
import { Input } from '@/admin/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/admin/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/admin/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/admin/components/ui/table'
import { formatPrice } from '@/lib/format-price'
import type { ShopProduct } from '@/lib/products-catalog'
import { Link } from '@/admin/lib/router'
import { PageShell } from './page-shell'
import { useCollection } from './use-collection'

type Collection = 'deals' | 'featured' | 'popular'

/** One homepage entry. Name, image and prices come live from the linked product. */
type Entry = {
  id: string
  name: string
  image: string
  rating: number
  price: number
  originalPrice?: number
  endsAt?: string
  published?: boolean
}

// <input type="datetime-local"> wants local "YYYY-MM-DDTHH:mm".
function toLocalInput(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const inAWeek = () => toLocalInput(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString())

function Thumb({ image, name, note }: { image: string; name: string; note?: string }) {
  return (
    <div className='flex items-center gap-3'>
      <div className='size-10 shrink-0 overflow-hidden rounded border bg-muted'>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt='' className='size-full object-contain' />
        )}
      </div>
      <div className='min-w-0'>
        <p className='max-w-xs truncate font-medium'>{name}</p>
        {note && <p className='text-xs text-muted-foreground'>{note}</p>}
      </div>
    </div>
  )
}

function HomepageList({
  collection,
  noun,
  help,
}: {
  collection: Collection
  noun: string
  help: string
}) {
  const isDeal = collection === 'deals'
  const [now] = useState(() => Date.now()) // for the "Ended" badge; refreshed whenever the page is reloaded
  const products = useCollection<ShopProduct>('products')
  const list = useCollection<Entry>(collection)

  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  // Deal form: choosing a product, then its deal price and end time.
  const [deal, setDeal] = useState<{
    id: string
    name: string
    regular: number
    price: string
    endsAt: string
    isEdit: boolean
  } | null>(null)

  const taken = useMemo(() => new Set(list.items.map((i) => i.id)), [list.items])
  const available = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.items
      .filter((p) => !taken.has(p.id))
      .filter((p) => !q || `${p.name} ${p.brand} ${p.id}`.toLowerCase().includes(q))
  }, [products.items, taken, query])

  const entryFrom = (p: ShopProduct): Entry => ({
    id: p.id,
    name: p.name,
    image: p.image,
    rating: p.rating,
    price: p.price,
    originalPrice: p.originalPrice,
    published: p.published,
  })

  function closeAdd() {
    setAdding(false)
    setQuery('')
    setPicked([])
    setDeal(null)
  }

  async function addPicked() {
    const chosen = products.items.filter((p) => picked.includes(p.id)).map(entryFrom)
    if (!chosen.length) return
    if (await list.save([...list.items, ...chosen], `${chosen.length} added to the homepage`)) closeAdd()
  }

  function startDeal(p: ShopProduct) {
    setDeal({
      id: p.id,
      name: p.name,
      regular: p.price,
      price: String(Math.round(p.price * 0.9 * 100) / 100),
      endsAt: inAWeek(),
      isEdit: false,
    })
  }

  async function saveDeal() {
    if (!deal) return
    const price = Number(deal.price)
    const ends = new Date(deal.endsAt)
    if (!(price >= 0) || deal.price === '') return toast.error('Enter the deal price.')
    if (Number.isNaN(ends.getTime())) return toast.error('Choose when the deal ends.')
    if (price >= deal.regular) toast.warning('The deal price is not lower than the regular price, so it will not look like a deal.')

    const endsAt = ends.toISOString()
    const next = deal.isEdit
      ? list.items.map((i) => (i.id === deal.id ? { ...i, price, endsAt } : i))
      : [
          ...list.items,
          { ...entryFrom(products.items.find((p) => p.id === deal.id)!), price, originalPrice: deal.regular, endsAt },
        ]
    if (await list.save(next, deal.isEdit ? 'Deal updated' : 'Deal added')) closeAdd()
  }

  async function move(i: number, to: number) {
    if (to < 0 || to >= list.items.length) return
    const next = [...list.items]
    next.splice(to, 0, next.splice(i, 1)[0])
    await list.save(next, 'Order updated')
  }

  const noProducts = !products.loading && products.items.length === 0

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <p className='max-w-2xl text-sm text-muted-foreground'>{help}</p>
        <Button onClick={() => setAdding(true)} disabled={noProducts}>
          <Plus /> Add {noun}
        </Button>
      </div>

      {noProducts && (
        <p className='rounded-md border border-dashed p-4 text-sm text-muted-foreground'>
          You haven’t added any products yet.{' '}
          <Link to='/products' className='underline underline-offset-4'>
            Add products first
          </Link>
          , then pick them here.
        </p>
      )}

      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Price</TableHead>
              {isDeal && <TableHead className='hidden sm:table-cell'>Ends</TableHead>}
              <TableHead className='w-40 text-end'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading ? (
              <TableRow>
                <TableCell colSpan={4} className='h-24 text-center text-muted-foreground'>
                  Loading…
                </TableCell>
              </TableRow>
            ) : list.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className='h-24 text-center text-muted-foreground'>
                  Nothing here yet.
                </TableCell>
              </TableRow>
            ) : (
              list.items.map((item, i) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Thumb
                      image={item.image}
                      name={item.name}
                      note={item.published === false ? 'Hidden product: not shown on the website' : undefined}
                    />
                  </TableCell>
                  <TableCell>
                    <p>{formatPrice(item.price)}</p>
                    {isDeal && item.originalPrice ? (
                      <p className='text-xs text-muted-foreground line-through'>{formatPrice(item.originalPrice)}</p>
                    ) : null}
                    {!isDeal && item.originalPrice ? (
                      <p className='text-xs text-muted-foreground line-through'>{formatPrice(item.originalPrice)}</p>
                    ) : null}
                  </TableCell>
                  {isDeal && (
                    <TableCell className='hidden text-muted-foreground sm:table-cell'>
                      {item.endsAt ? new Date(item.endsAt).toLocaleString() : '—'}
                      {item.endsAt && new Date(item.endsAt).getTime() < now && (
                        <Badge variant='outline' className='ms-2'>
                          Ended
                        </Badge>
                      )}
                    </TableCell>
                  )}
                  <TableCell className='text-end'>
                    <Button variant='ghost' size='icon' aria-label='Move up' disabled={i === 0 || list.saving} onClick={() => move(i, i - 1)}>
                      <ArrowUp />
                    </Button>
                    <Button variant='ghost' size='icon' aria-label='Move down' disabled={i === list.items.length - 1 || list.saving} onClick={() => move(i, i + 1)}>
                      <ArrowDown />
                    </Button>
                    {isDeal && (
                      <Button
                        variant='ghost'
                        size='icon'
                        aria-label='Edit deal'
                        onClick={() => {
                          setAdding(true)
                          setDeal({
                            id: item.id,
                            name: item.name,
                            regular: item.originalPrice ?? item.price,
                            price: String(item.price),
                            endsAt: toLocalInput(item.endsAt ?? ''),
                            isEdit: true,
                          })
                        }}
                      >
                        <Pencil />
                      </Button>
                    )}
                    <Button
                      variant='ghost'
                      size='icon'
                      aria-label='Remove from homepage'
                      disabled={list.saving}
                      onClick={() => list.save(list.items.filter((x) => x.id !== item.id), 'Removed from the homepage (the product itself is untouched)')}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={adding} onOpenChange={(o) => !o && closeAdd()}>
        <DialogContent className='max-h-[90svh] overflow-y-auto sm:max-w-xl'>
          {deal ? (
            <>
              <DialogHeader>
                <DialogTitle>{deal.isEdit ? 'Edit deal' : 'Set up the deal'}</DialogTitle>
                <DialogDescription>
                  {deal.name} · regular price {formatPrice(deal.regular)}
                </DialogDescription>
              </DialogHeader>
              <div className='grid gap-4'>
                <label className='grid gap-1.5 text-sm font-medium'>
                  Deal price (LKR)
                  <Input type='number' min={0} step={0.01} value={deal.price} onChange={(e) => setDeal({ ...deal, price: e.target.value })} />
                  <span className='text-xs font-normal text-muted-foreground'>
                    Customers pay this price at checkout while the deal runs.
                  </span>
                </label>
                <label className='grid gap-1.5 text-sm font-medium'>
                  Ends at
                  <Input type='datetime-local' value={deal.endsAt} onChange={(e) => setDeal({ ...deal, endsAt: e.target.value })} />
                  <span className='text-xs font-normal text-muted-foreground'>The countdown on the homepage runs to this time.</span>
                </label>
                <div className='flex justify-end gap-2'>
                  <Button variant='outline' onClick={deal.isEdit ? closeAdd : () => setDeal(null)}>
                    {deal.isEdit ? 'Cancel' : 'Back'}
                  </Button>
                  <Button onClick={saveDeal} disabled={list.saving}>
                    {deal.isEdit ? 'Save deal' : 'Add deal'}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Add {noun}</DialogTitle>
                <DialogDescription>
                  {isDeal ? 'Choose the product that is on offer.' : 'Tick the products to show. You can add several at once.'}
                </DialogDescription>
              </DialogHeader>
              <div className='relative'>
                <Search className='absolute start-3 top-2.5 size-4 text-muted-foreground' />
                <Input className='ps-9' placeholder='Search your products…' value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <ul className='max-h-80 divide-y overflow-y-auto rounded-md border'>
                {available.length === 0 && (
                  <li className='p-4 text-center text-sm text-muted-foreground'>
                    {products.items.length === 0 ? 'No products yet.' : taken.size >= products.items.length ? 'All your products are already here.' : 'No matches.'}
                  </li>
                )}
                {available.map((p) => {
                  const on = picked.includes(p.id)
                  return (
                    <li key={p.id}>
                      <button
                        type='button'
                        className='flex w-full items-center gap-3 p-2 text-start hover:bg-muted/60'
                        onClick={() => (isDeal ? startDeal(p) : setPicked((cur) => (on ? cur.filter((x) => x !== p.id) : [...cur, p.id])))}
                      >
                        {!isDeal && <input type='checkbox' readOnly checked={on} className='pointer-events-none' />}
                        <Thumb
                          image={p.images?.[0] || p.image}
                          name={p.name}
                          note={`${formatPrice(p.price)}${p.published === false ? ' · hidden' : ''}`}
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
              {!isDeal && (
                <div className='flex justify-end gap-2'>
                  <Button variant='outline' onClick={closeAdd}>
                    Cancel
                  </Button>
                  <Button onClick={addPicked} disabled={picked.length === 0 || list.saving}>
                    Add {picked.length || ''} {picked.length === 1 ? 'product' : 'products'}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function DealsPage() {
  return (
    <PageShell
      title='Deals & Homepage'
      description='Choose which of your products appear in Deal of the Week, the featured list and Popular Products.'
    >
      <Tabs defaultValue='weekly' className='space-y-4'>
        <TabsList className='h-auto flex-wrap justify-start'>
          <TabsTrigger value='weekly'>Deal of the Week</TabsTrigger>
          <TabsTrigger value='featured'>Featured &amp; Today’s Deal</TabsTrigger>
          <TabsTrigger value='popular'>Popular Products</TabsTrigger>
        </TabsList>

        <TabsContent value='weekly'>
          <HomepageList
            collection='deals'
            noun='deal'
            help='Pick a product and give it a deal price and an end time. The homepage shows a countdown, and customers are charged the deal price while it runs.'
          />
        </TabsContent>
        <TabsContent value='featured'>
          <HomepageList
            collection='featured'
            noun='featured product'
            help='The list beside Deal of the Week on the homepage and in the Today’s Deal drawer. Name, picture and price come from the product.'
          />
        </TabsContent>
        <TabsContent value='popular'>
          <HomepageList
            collection='popular'
            noun='popular product'
            help='The Popular Products row on the homepage. If the product has an original price, a discount badge shows automatically.'
          />
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}
