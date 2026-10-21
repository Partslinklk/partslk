'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/admin/components/ui/tabs'
import type { Brand, Make } from '@/lib/db'
import { PageShell } from './page-shell'
import { ResourceManager } from './resource-manager'

export function BrandsPage() {
  return (
    <PageShell
      title='Brands'
      description='Product brands for filtering, and the vehicle logos shown on the homepage.'
    >
      <Tabs defaultValue='brands' className='space-y-4'>
        <TabsList className='h-auto flex-wrap justify-start'>
          <TabsTrigger value='brands'>Product brands</TabsTrigger>
          <TabsTrigger value='makes'>Homepage vehicle logos</TabsTrigger>
        </TabsList>
        <TabsContent value='brands'>
          <ResourceManager<Brand & Record<string, unknown>>
            collection='brands'
            noun='Brand'
            idFrom='name'
            searchKeys={['name']}
            blank={{ name: '' }}
            fields={[
              { key: 'name', label: 'Name', type: 'text', required: true, wide: true },
            ]}
            columns={[
              { header: 'Brand', cell: (b) => <span className='font-medium'>{b.name}</span> },
            ]}
          />
        </TabsContent>
        <TabsContent value='makes'>
          <ResourceManager<Make & Record<string, unknown>>
            collection='makes'
            noun='Logo'
            idFrom='name'
            searchKeys={['name']}
            blank={{ name: '', logo: '' }}
            fields={[
              { key: 'name', label: 'Vehicle make', type: 'text', required: true, wide: true },
              { key: 'logo', label: 'Logo', type: 'image' },
            ]}
            columns={[
              {
                header: 'Logo',
                cell: (m) => (
                  <div className='flex items-center gap-3'>
                    <div className='flex h-10 w-16 items-center justify-center overflow-hidden rounded border bg-muted'>
                      {m.logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.logo} alt='' className='max-h-full max-w-full object-contain' />
                      )}
                    </div>
                    <span className='font-medium'>{m.name}</span>
                  </div>
                ),
              },
            ]}
          />
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}
