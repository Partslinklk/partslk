'use client'

import { Badge } from '@/admin/components/ui/badge'
import { COLOR_OPTIONS, type ShopProduct } from '@/lib/products-catalog'
import { formatPrice } from '@/lib/format-price'
import type { Brand, Category } from '@/lib/db'
import { PageShell } from './page-shell'
import { ResourceManager, type Field } from './resource-manager'
import { useCollection } from './use-collection'

const ACTIONS = ['Add To Cart', 'Select Options', 'Buy Product', 'View Products']

export function ProductsPage() {
  const categories = useCollection<Category>('categories').items
  const brands = useCollection<Brand>('brands').items

  const fields: Field[] = [
    { key: 'name', label: 'Name', type: 'text', required: true, wide: true },
    { key: 'image', label: 'Image', type: 'image' },
    { key: 'description', label: 'Description', type: 'textarea' },
    {
      key: 'categories',
      label: 'Categories',
      type: 'multiselect',
      options: categories.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      key: 'brand',
      label: 'Brand',
      type: 'select',
      options: [
        { value: '', label: '— None —' },
        ...brands.map((b) => ({ value: b.name, label: b.name })),
      ],
    },
    {
      key: 'size',
      label: 'Size',
      type: 'select',
      options: [
        { value: 'Small', label: 'Small' },
        { value: 'Medium', label: 'Medium' },
      ],
    },
    {
      key: 'colors',
      label: 'Colors',
      type: 'multiselect',
      options: COLOR_OPTIONS.map((c) => ({ value: c.id, label: c.name })),
    },
    { key: 'price', label: 'Price (LKR)', type: 'number', required: true, step: 0.01 },
    {
      key: 'originalPrice',
      label: 'Original price (LKR)',
      type: 'number',
      step: 0.01,
      help: 'Optional. Shows a discount when higher than the price.',
    },
    { key: 'stock', label: 'Stock', type: 'number' },
    { key: 'rating', label: 'Rating (0–5)', type: 'number', step: 0.5, max: 5 },
    { key: 'reviewCount', label: 'Review count', type: 'number' },
    {
      key: 'action',
      label: 'Button label',
      type: 'select',
      options: ACTIONS.map((a) => ({ value: a, label: a })),
    },
    {
      key: 'highlight',
      label: 'Badge',
      type: 'select',
      options: [
        { value: '', label: 'None' },
        { value: 'best-seller', label: 'Best seller' },
        { value: 'new-arrival', label: 'New arrival' },
      ],
    },
    {
      key: 'published',
      label: 'Visibility',
      type: 'checkbox',
      help: 'Show this product on the website',
    },
  ]

  return (
    <PageShell
      title='Products'
      description='Add, edit and remove the parts sold in your shop.'
    >
      <ResourceManager<ShopProduct & Record<string, unknown>>
        collection='products'
        noun='Product'
        idFrom='name'
        searchKeys={['name', 'brand', 'id']}
        fields={fields}
        blank={{
          name: '',
          image: '',
          description: '',
          categories: [],
          brand: '',
          colors: [],
          size: 'Small',
          price: 0,
          rating: 5,
          reviewCount: 0,
          action: 'Add To Cart',
          stock: 10,
          published: true,
        }}
        normalize={(p) => {
          const next = { ...p }
          if (!next.highlight) delete next.highlight
          if (!next.originalPrice) delete next.originalPrice
          return next
        }}
        columns={[
          {
            header: 'Product',
            cell: (p) => (
              <div className='flex items-center gap-3'>
                <div className='size-10 shrink-0 overflow-hidden rounded border bg-muted'>
                  {p.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt='' className='size-full object-contain' />
                  )}
                </div>
                <div className='min-w-0'>
                  <p className='max-w-xs truncate font-medium'>{p.name}</p>
                  <p className='text-xs text-muted-foreground'>{p.brand || 'No brand'}</p>
                </div>
              </div>
            ),
          },
          {
            header: 'Categories',
            className: 'hidden md:table-cell',
            cell: (p) => (
              <span className='text-muted-foreground'>
                {p.categories
                  .map((id) => categories.find((c) => c.id === id)?.name ?? id)
                  .join(', ') || '—'}
              </span>
            ),
          },
          {
            header: 'Price',
            cell: (p) => (
              <div>
                <p>{formatPrice(p.price)}</p>
                {p.originalPrice ? (
                  <p className='text-xs text-muted-foreground line-through'>
                    {formatPrice(p.originalPrice)}
                  </p>
                ) : null}
              </div>
            ),
          },
          {
            header: 'Stock',
            className: 'hidden sm:table-cell',
            cell: (p) =>
              (p.stock ?? 0) <= 5 ? (
                <Badge variant='destructive'>{p.stock ?? 0} left</Badge>
              ) : (
                p.stock
              ),
          },
          {
            header: 'Status',
            className: 'hidden sm:table-cell',
            cell: (p) =>
              p.published === false ? (
                <Badge variant='outline'>Hidden</Badge>
              ) : (
                <Badge variant='secondary'>Live</Badge>
              ),
          },
        ]}
      />
    </PageShell>
  )
}
