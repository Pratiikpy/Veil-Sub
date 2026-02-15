import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'On-Chain Explorer — VeilSub',
  description: 'Look up any creator\'s public on-chain stats on VeilSub. Subscriber counts, revenue, and tier prices — all verified on Aleo.',
}

export default function ExplorerLayout({ children }: { children: React.ReactNode }) {
  return children
}
