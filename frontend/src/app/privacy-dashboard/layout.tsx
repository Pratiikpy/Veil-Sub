import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Dashboard — VeilSub',
  description:
    'Visualize exactly what the blockchain sees for every VeilSub operation. Interactive privacy comparison powered by BSP (Blind Subscription Protocol).',
  alternates: {
    canonical: '/privacy-dashboard',
  },
  openGraph: {
    title: 'Privacy Dashboard — VeilSub',
    description:
      'See what YOU see vs what the CHAIN sees for every operation. Zero addresses in finalize, Poseidon2 field-hashed mappings, zero-footprint verification.',
    url: '/privacy-dashboard',
  },
}

export default function PrivacyDashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
