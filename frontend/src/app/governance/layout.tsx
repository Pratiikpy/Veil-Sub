import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Governance',
  description: 'Participate in VeilSub protocol governance and proposals.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
