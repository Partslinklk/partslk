import { PageShell } from '@/admin/features/store/page-shell'
import { SettingsAppearance } from '@/admin/features/settings/appearance'

export default function Page() {
  return (
    <PageShell title='Settings' description='Customize how the admin panel looks for you.'>
      <SettingsAppearance />
    </PageShell>
  )
}
