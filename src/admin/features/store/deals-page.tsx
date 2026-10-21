'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/admin/components/ui/tabs'
import { formatPrice } from '@/lib/format-price'
import type { Deal, ListedProduct } from '@/lib/db'
import { PageShell } from './page-shell'
import { ResourceManager, type Column, type Field } from './resource-manager'

const CTA = ['Add To Cart', 'View Products', 'Select Options', 'Buy Product']

const thumb = (image: string, name: string) => (
  <div className='flex items-center gap-3'>
    <div className='size-10 shrink-0 overflow-hidden rounded border bg-muted'>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt='' className='size-full object-contain' />
      )}
    </div>
    <span className='max-w-xs truncate font-medium'>{name}</span>
  </div>
)

const listFields: Field[] = [
  { key: 'name', label: 'Name', type: 'text', required: true, wide: true },
  { key: 'image', label: 'Image', type: 'image' },
  { key: 'price', label: 'Price (LKR)', type: 'number', required: true, step: 0.01 },
  {
    key: 'priceMax',
    label: 'Highest price (LKR)',
    type: 'number',
    step: 0.01,
    help: 'Optional. Fill in to show a price range.',
  },
  { key: 'rating', label: 'Rating (0–5)', type: 'number', step: 0.5, max: 5 },
  {
    key: 'ctaLabel',
    label: 'Button label',
    type: 'select',
    options: CTA.map((a) => ({ value: a, label: a })),
  },
]

const listColumns: Column<ListedProduct>[] = [
  { header: 'Product', cell: (p) => thumb(p.image, p.name) },
  {
    header: 'Price',
    cell: (p) =>
      p.priceMax > p.price
        ? `${formatPrice(p.price)} – ${formatPrice(p.priceMax)}`
        : formatPrice(p.price),
  },
  {
    header: 'Rating',
    className: 'hidden sm:table-cell',
    cell: (p) => `${p.rating} / 5`,
  },
]

export function DealsPage() {
  return (
    <PageShell
      title='Deals & Homepage'
      description='Deal of the Week, the featured list, Today’s Deal drawer and Popular Products.'
    >
      <Tabs defaultValue='weekly' className='space-y-4'>
        <TabsList className='h-auto flex-wrap justify-start'>
          <TabsTrigger value='weekly'>Deal of the Week</TabsTrigger>
          <TabsTrigger value='featured'>Featured &amp; Today’s Deal</TabsTrigger>
          <TabsTrigger value='popular'>Popular Products</TabsTrigger>
        </TabsList>

        <TabsContent value='weekly'>
          <ResourceManager<Deal & Record<string, unknown>>
            collection='deals'
            noun='Deal'
            idFrom='name'
            searchKeys={['name']}
            blank={{
              name: '',
              image: '',
              rating: 5,
              price: 0,
              originalPrice: 0,
              endsAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
            }}
            fields={[
              { key: 'name', label: 'Name', type: 'text', required: true, wide: true },
              { key: 'image', label: 'Image', type: 'image' },
              { key: 'price', label: 'Deal price (LKR)', type: 'number', required: true, step: 0.01 },
              { key: 'originalPrice', label: 'Original price (LKR)', type: 'number', step: 0.01 },
              { key: 'rating', label: 'Rating (0–5)', type: 'number', step: 0.5, max: 5 },
              {
                key: 'endsAt',
                label: 'Ends at',
                type: 'datetime',
                required: true,
                help: 'The countdown on the homepage runs to this time.',
              },
            ]}
            columns={[
              { header: 'Deal', cell: (d) => thumb(d.image, d.name) },
              {
                header: 'Price',
                cell: (d) => (
                  <div>
                    <p>{formatPrice(d.price)}</p>
                    {d.originalPrice ? (
                      <p className='text-xs text-muted-foreground line-through'>
                        {formatPrice(d.originalPrice)}
                      </p>
                    ) : null}
                  </div>
                ),
              },
              {
                header: 'Ends',
                className: 'hidden sm:table-cell',
                cell: (d) => new Date(d.endsAt).toLocaleString(),
              },
            ]}
          />
        </TabsContent>

        <TabsContent value='featured'>
          <ResourceManager<ListedProduct & Record<string, unknown>>
            collection='featured'
            noun='Featured product'
            idFrom='name'
            searchKeys={['name']}
            blank={{ name: '', image: '', rating: 5, price: 0, priceMax: 0, ctaLabel: 'Add To Cart' }}
            fields={listFields}
            columns={listColumns}
          />
        </TabsContent>

        <TabsContent value='popular'>
          <ResourceManager<ListedProduct & Record<string, unknown>>
            collection='popular'
            noun='Popular product'
            idFrom='name'
            searchKeys={['name']}
            blank={{ name: '', image: '', rating: 5, price: 0, priceMax: 0, originalPrice: 0, ctaLabel: 'Add To Cart' }}
            fields={[
              ...listFields.slice(0, 3),
              {
                key: 'originalPrice',
                label: 'Original price (LKR)',
                type: 'number',
                step: 0.01,
                help: 'Optional. Shows a discount badge.',
              },
              ...listFields.slice(3),
            ]}
            columns={listColumns}
          />
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}
