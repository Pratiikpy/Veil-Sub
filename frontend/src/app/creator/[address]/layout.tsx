import type { Metadata } from 'next'
import { shortenAddress } from '@/lib/utils'
import { FEATURED_CREATORS } from '@/lib/config'

interface CreatorLayoutProps {
  children: React.ReactNode
  params: Promise<{ address: string }>
}

// Capitalize first letter of category for display
function formatCategory(cat: string): string {
  if (!cat) return 'Creator'
  return cat.charAt(0).toUpperCase() + cat.slice(1)
}

export async function generateMetadata({ params }: CreatorLayoutProps): Promise<Metadata> {
  const { address } = await params

  // Check if this is a featured creator with a known display name
  const featuredCreator = FEATURED_CREATORS.find(c => c.address === address)
  const displayName = featuredCreator?.label || shortenAddress(address)
  const category = formatCategory(featuredCreator?.category || '')

  const title = `${displayName} — ${category} on VeilSub`
  const description = featuredCreator?.bio
    ? `Subscribe to ${displayName}: ${featuredCreator.bio}. Private subscriptions with zero-knowledge proof verification.`
    : `Subscribe privately to ${displayName} on VeilSub. Your identity stays hidden with zero-knowledge proofs on Aleo.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://veil-sub.vercel.app'}/creator/${address}`,
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return children
}
