import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Developers',
  description: 'Developer portal for VeilSub API, SDK, and integration guides.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
