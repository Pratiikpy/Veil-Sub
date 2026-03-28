import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Feed',
  description: 'Your private content feed from subscribed creators.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
