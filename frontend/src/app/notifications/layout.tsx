import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Notifications',
  description: 'Stay updated on subscriptions, tips, and content.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
