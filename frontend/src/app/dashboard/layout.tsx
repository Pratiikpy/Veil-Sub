import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Creator Dashboard — VeilSub',
  description: 'Register as a creator, set subscription tiers, publish gated content, and track analytics. All subscriber identities stay private.',
  alternates: {
    canonical: '/dashboard',
  },
  openGraph: {
    title: 'Creator Dashboard — VeilSub',
    description: 'Manage your creator profile and subscriptions. Subscriber identities stay completely private.',
    url: '/dashboard',
  },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
