import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your VeilSub profile, privacy, and notification preferences.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
