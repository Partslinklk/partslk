import {
  Boxes,
  LayoutDashboard,
  MessageSquareQuote,
  Palette,
  ShoppingCart,
  Tag,
  Tags,
  Users,
  Flame,
} from 'lucide-react'
import { Logo } from '@/admin/assets/logo'
import { siteConfig } from '@/admin/config/site'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'admin',
    email: 'support@partslk.com',
    avatar: '/admin/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: siteConfig.name,
      logo: Logo,
      plan: siteConfig.tagline,
    },
  ],
  navGroups: [
    {
      title: 'General',
      items: [
        { title: 'Dashboard', url: '/', icon: LayoutDashboard },
        { title: 'Orders', url: '/orders', icon: ShoppingCart },
        { title: 'Customers', url: '/customers', icon: Users },
      ],
    },
    {
      title: 'Catalog',
      items: [
        { title: 'Products', url: '/products', icon: Boxes },
        { title: 'Categories', url: '/categories', icon: Tags },
        { title: 'Brands', url: '/brands', icon: Tag },
      ],
    },
    {
      title: 'Website',
      items: [
        { title: 'Deals & Homepage', url: '/deals', icon: Flame },
        { title: 'Testimonials', url: '/testimonials', icon: MessageSquareQuote },
      ],
    },
    {
      title: 'Other',
      items: [{ title: 'Settings', url: '/settings', icon: Palette }],
    },
  ],
}
