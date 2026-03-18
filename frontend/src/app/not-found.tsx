import { Shield, ArrowRight, Compass } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Floating orbs — CSS only */}
      <div
        className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full pointer-events-none animate-float opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full pointer-events-none animate-float-delayed opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full pointer-events-none animate-float-slow opacity-25"
        style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)' }}
      />

      <div className="relative text-center max-w-lg px-6">
        {/* Large 404 — gradient text */}
        <p
          className="text-[10rem] sm:text-[12rem] font-bold leading-none select-none mb-2"
          style={{
            background: 'linear-gradient(180deg, rgba(139,92,246,0.25) 0%, rgba(139,92,246,0.03) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.04em',
          }}
        >
          404
        </p>

        {/* Shield icon */}
        <div className="w-12 h-12 mx-auto mb-6 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <Shield className="w-6 h-6 text-violet-400" aria-hidden="true" />
        </div>

        <h1
          className="text-2xl sm:text-3xl font-serif italic text-white mb-3"
          style={{ letterSpacing: '-0.02em' }}
        >
          This page is as private as your subscriptions
        </h1>
        <p className="text-[var(--text-secondary)] mb-10 leading-relaxed text-sm sm:text-base">
          It doesn&apos;t exist. And even if it did, we wouldn&apos;t tell anyone.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-violet-600 text-white font-medium text-sm hover:bg-violet-500 hover:shadow-[0_0_24px_rgba(139,92,246,0.3)] transition-all active:scale-[0.97] btn-shimmer"
          >
            Go Home
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] text-sm hover:bg-white/[0.04] hover:border-[var(--border-strong)] transition-all active:scale-[0.97]"
          >
            <Compass className="w-4 h-4" aria-hidden="true" />
            Explore Creators
          </Link>
        </div>
      </div>
    </div>
  )
}
