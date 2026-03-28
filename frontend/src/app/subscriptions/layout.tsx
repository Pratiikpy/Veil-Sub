import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Subscriptions',
  description: 'Manage your active subscriptions and access passes.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
