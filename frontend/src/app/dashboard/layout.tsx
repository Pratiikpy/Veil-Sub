import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Creator Dashboard — VeilSub',
  description: 'Manage your VeilSub creator profile, view aggregate stats, publish content, and share your creator page.',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
