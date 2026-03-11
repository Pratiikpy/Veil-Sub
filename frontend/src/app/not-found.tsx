import { Shield, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.06) 0%, transparent 70%)',
        }}
      />
      <div className="relative text-center max-w-md px-4">
        <div className="relative w-16 h-16 mx-auto mb-6">
          <div className="absolute inset-0 rounded-2xl bg-violet-500/10 animate-pulse" />
          <div className="relative w-full h-full rounded-2xl bg-surface-1 border border-border flex items-center justify-center">
            <Shield className="w-8 h-8 text-violet-400" aria-hidden="true" />
          </div>
        </div>
        <p className="text-7xl font-bold text-white/10 mb-4 select-none">
          404
        </p>
        <h2
          className="text-3xl font-serif italic text-white mb-3"
          style={{ letterSpacing: '-0.03em' }}
        >
          Page Not Found
        </h2>
        <p className="text-white/70 mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-medium text-sm hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all active:scale-[0.98] btn-shimmer"
          >
            Go Home
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/[0.05] border border-border text-white/70 text-sm hover:bg-white/[0.08] hover:border-border-hover transition-all active:scale-[0.98]"
          >
            Explore Creators
          </Link>
        </div>
        <div className="mt-4 flex items-center justify-center gap-4 text-sm text-white/40">
          <Link href="/docs" className="hover:text-white/70 transition-colors">
            Documentation
          </Link>
          <span>·</span>
          <Link href="/verify" className="hover:text-white/70 transition-colors">
            Verify Access
          </Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-white/70 transition-colors">
            Privacy Model
          </Link>
        </div>
      </div>
    </div>
  )
}
