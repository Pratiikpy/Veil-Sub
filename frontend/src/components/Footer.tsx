import Link from 'next/link'
import { Github, ExternalLink, Shield } from 'lucide-react'
import { DEPLOYED_PROGRAM_ID } from '@/lib/config'

export default function Footer() {
  return (
    <footer className="border-t border-border/75 bg-black/80 pb-20 md:pb-0">
      {/* Desktop footer */}
      <div className="hidden md:block max-w-[1120px] mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-8 mb-6">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="font-serif italic text-white text-lg">VeilSub</span>
              <span className="px-2 py-1 text-[10px] font-medium text-white/40 bg-white/[0.04] border border-white/[0.06] rounded">
                v29
              </span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed max-w-[260px]">
              Subscribe privately. Prove access. Nobody sees who you support. Your address is never stored on-chain — subscriber identities are cryptographically unreachable.
            </p>
          </div>
          {/* Navigation */}
          <div>
            <p className="text-xs font-medium text-white/70 mb-4 uppercase tracking-wider">Platform</p>
            <div className="space-y-2">
              <Link href="/explore" className="block text-xs text-white/60 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded">Explore Creators</Link>
              <Link href="/verify" className="block text-xs text-white/60 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded">Verify Access</Link>
              <Link href="/explorer" className="block text-xs text-white/60 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded">On-Chain Explorer</Link>
              <Link href="/dashboard" className="block text-xs text-white/60 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded">Creator Dashboard</Link>
              <Link href="/analytics" className="block text-xs text-white/60 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded">Platform Analytics</Link>
            </div>
          </div>
          {/* Resources */}
          <div>
            <p className="text-xs font-medium text-white/70 mb-4 uppercase tracking-wider">Resources</p>
            <div className="space-y-2">
              <Link href="/docs" className="block text-xs text-white/60 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded">Documentation</Link>
              <Link href="/privacy" className="block text-xs text-white/60 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded">Privacy Model</Link>
              <a href="https://github.com/Pratiikpy/Veil-Sub" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded">
                <Github className="w-3 h-3" aria-hidden="true" /> GitHub
              </a>
              <Link href="/vision" className="block text-xs text-white/60 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded">Vision & Roadmap</Link>
            </div>
          </div>
        </div>
        {/* Bottom bar */}
        <div className="pt-5 border-t border-border/75 flex items-center justify-between text-xs text-white/60">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-3 h-3 text-white/30" aria-hidden="true" />
              <span>Blind renewals • Address-free on-chain storage • Complete privacy</span>
            </div>
            <span className="text-white/60">© 2026 VeilSub</span>
          </div>
          <a
            href={`https://testnet.aleoscan.io/program?id=${DEPLOYED_PROGRAM_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View ${DEPLOYED_PROGRAM_ID} on Aleoscan`}
            className="flex items-center gap-1 hover:text-white/70 transition-colors font-mono focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded"
          >
            {DEPLOYED_PROGRAM_ID}
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        </div>
      </div>
      {/* Mobile footer — condensed */}
      <div className="md:hidden px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="font-serif italic text-white text-sm">VeilSub</span>
            <span className="px-2 py-1 text-[9px] font-medium text-white/40 bg-white/[0.04] border border-white/[0.06] rounded">
              v29
            </span>
          </div>
          <a href="https://github.com/Pratiikpy/Veil-Sub" target="_blank" rel="noopener noreferrer" aria-label="GitHub repository" className="flex items-center gap-1 text-xs text-white/60 hover:text-white/70 transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded">
            <Github className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
          <Link href="/docs" className="text-xs text-white/60 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded">Docs</Link>
          <Link href="/privacy" className="text-xs text-white/60 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded">Privacy</Link>
          <Link href="/vision" className="text-xs text-white/60 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded">Vision</Link>
          <Link href="/explorer" className="text-xs text-white/60 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none rounded">On-Chain</Link>
        </div>
        <div className="pt-3 border-t border-border/75 flex items-center justify-between text-xs text-white/60">
          <div className="flex items-center gap-2">
            <Shield className="w-3 h-3 text-white/30 shrink-0" aria-hidden="true" />
            <span>Your address is never stored</span>
          </div>
          <span className="text-white/60">© 2026 VeilSub</span>
        </div>
      </div>
    </footer>
  )
}
