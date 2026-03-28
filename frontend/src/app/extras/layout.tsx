import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Extras',
  description: 'Anonymous creator reviews and provably fair on-chain lottery on VeilSub.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
