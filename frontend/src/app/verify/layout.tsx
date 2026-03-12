import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Verify Access — VeilSub',
  description: 'Prove you hold a valid AccessPass using a zero-knowledge proof. Zero-footprint verification — your identity stays completely private on-chain.',
  alternates: {
    canonical: '/verify',
  },
  openGraph: {
    title: 'Verify Access — VeilSub',
    description: 'Prove your subscription with zero-knowledge cryptography. Your identity never appears on-chain.',
    url: '/verify',
  },
}

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return children
}
