import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'On-Chain Explorer — VeilSub',
  description: 'Query VeilSub on-chain data directly from Aleo testnet. Verify creator registrations, content metadata, and program deployment without a wallet.',
}

export default function ExplorerLayout({ children }: { children: React.ReactNode }) {
  return children
}
