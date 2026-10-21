'use client'

import { Badge } from '@/admin/components/ui/badge'
import type { Category } from '@/lib/db'
import { PageShell } from './page-shell'
import { ResourceManager } from './resource-manager'

export function CategoriesAdminPage() {
  return (
    <PageShell
      title='Categories'
      description='Categories used for filtering products and the "Shop by Categories" section.'
    >
      <ResourceManager<Category & Record<string, unknown>>
        collection='categories'
        noun='Category'
        idFrom='name'
        searchKeys={['name']}
        blank={{ name: '', image: '', links: [], featured: false }}
        fields={[
          { key: 'name', label: 'Name', type: 'text', required: true, wide: true },
          { key: 'image', label: 'Image', type: 'image' },
          {
            key: 'links',
            label: 'Sub-links',
            type: 'lines',
            help: 'One per line.',
          },
          {
            key: 'featured',
            label: 'Homepage',
            type: 'checkbox',
            help: 'Show in "Shop by Categories" on the homepage',
          },
        ]}
        columns={[
          {
            header: 'Category',
            cell: (c) => (
              <div className='flex items-center gap-3'>
                <div className='size-10 shrink-0 overflow-hidden rounded border bg-muted'>
                  {c.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt='' className='size-full object-contain' />
                  )}
                </div>
                <span className='font-medium'>{c.name}</span>
              </div>
            ),
          },
          {
            header: 'Sub-links',
            className: 'hidden md:table-cell',
            cell: (c) => (
              <span className='text-muted-foreground'>{c.links.join(', ') || '—'}</span>
            ),
          },
          {
            header: 'Homepage',
            className: 'hidden sm:table-cell',
            cell: (c) =>
              c.featured ? <Badge variant='secondary'>Featured</Badge> : '—',
          },
        ]}
      />
    </PageShell>
  )
}
