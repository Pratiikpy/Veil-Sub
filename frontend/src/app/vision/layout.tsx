import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vision & Use Cases — VeilSub',
  description: 'VeilSub is a reusable zero-knowledge access control primitive. Explore use cases from anonymous journalism to DAO membership.',
}

export default function VisionLayout({ children }: { children: React.ReactNode }) {
  return children
}
