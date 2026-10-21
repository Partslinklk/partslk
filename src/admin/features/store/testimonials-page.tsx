'use client'

import type { Testimonial } from '@/lib/db'
import { PageShell } from './page-shell'
import { ResourceManager } from './resource-manager'

export function TestimonialsPage() {
  return (
    <PageShell
      title='Testimonials'
      description='Customer reviews shown in "What Our Customers Say" on the homepage.'
    >
      <ResourceManager<Testimonial & Record<string, unknown>>
        collection='testimonials'
        noun='Testimonial'
        idFrom='name'
        searchKeys={['name', 'quote']}
        blank={{ name: '', meta: 'Verified Buyer', quote: '', rating: 5, avatar: '' }}
        fields={[
          { key: 'name', label: 'Customer name', type: 'text', required: true },
          { key: 'meta', label: 'Subtitle', type: 'text', placeholder: 'Verified Buyer · Honda Civic' },
          { key: 'quote', label: 'Review', type: 'textarea', required: true },
          { key: 'rating', label: 'Rating (1–5)', type: 'number', step: 1, min: 1, max: 5 },
          { key: 'avatar', label: 'Photo', type: 'image' },
        ]}
        columns={[
          {
            header: 'Customer',
            cell: (t) => (
              <div>
                <p className='font-medium'>{t.name}</p>
                <p className='text-xs text-muted-foreground'>{t.meta}</p>
              </div>
            ),
          },
          {
            header: 'Review',
            className: 'hidden sm:table-cell',
            cell: (t) => <p className='max-w-md truncate text-muted-foreground'>{t.quote}</p>,
          },
          {
            header: 'Rating',
            className: 'hidden sm:table-cell',
            cell: (t) => `${t.rating} / 5`,
          },
        ]}
      />
    </PageShell>
  )
}
