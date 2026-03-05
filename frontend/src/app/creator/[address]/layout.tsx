import type { Metadata } from 'next'
import { APP_NAME } from '@/lib/config'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>
}): Promise<Metadata> {
  const { address } = await params
  const short = address.length > 16
    ? `${address.slice(0, 10)}...${address.slice(-6)}`
    : address

  return {
    title: `${short} — Creator on ${APP_NAME}`,
    description: `View this creator's subscription tiers, content, and privacy-first profile on ${APP_NAME}. Subscribe privately with zero-knowledge proofs on Aleo.`,
    openGraph: {
      title: `Creator ${short} — ${APP_NAME}`,
      description: `Subscribe privately to this creator on ${APP_NAME}. Zero-footprint verification powered by Aleo.`,
    },
  }
}

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
