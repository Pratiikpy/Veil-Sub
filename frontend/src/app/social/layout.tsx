import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Social',
  description: 'Privacy-first social features: DMs, paid messages, chat rooms, and stories on VeilSub.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
