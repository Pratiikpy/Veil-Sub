import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'On-Chain Explorer — VeilSub',
  description: 'Query VeilSub on-chain data directly from Aleo testnet. Verify creator registrations, content metadata, and program deployment without a wallet.',
  alternates: {
    canonical: '/explorer',
  },
  openGraph: {
    title: 'On-Chain Explorer — VeilSub',
    description: 'Query on-chain data from Aleo testnet. Verify registrations, content metadata, and deployment.',
    url: '/explorer',
  },
}

export default function ExplorerLayout({ children }: { children: React.ReactNode }) {
  return children
}
