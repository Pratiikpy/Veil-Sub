import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Messages',
  description: 'Private encrypted conversations with creators.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
