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
            <div className="flex items-center gap-2 mb-3">
              <span className="font-serif italic text-white text-lg">VeilSub</span>
              <span className="px-1.5 py-0.5 text-[10px] font-medium text-violet-400/70 bg-violet-500/[0.08] border border-violet-500/[0.12] rounded">
                v27
              </span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed max-w-[240px]">
              Privacy-first creator subscriptions powered by zero-knowledge proofs on Aleo.
            </p>
          </div>
          {/* Navigation */}
          <div>
            <p className="text-xs font-medium text-white/70 mb-3 uppercase tracking-wider">Platform</p>
            <div className="space-y-2">
              <Link href="/explore" className="block text-xs text-white/60 hover:text-white transition-colors">Explore Creators</Link>
              <Link href="/verify" className="block text-xs text-white/60 hover:text-white transition-colors">Verify Access</Link>
              <Link href="/explorer" className="block text-xs text-white/60 hover:text-white transition-colors">On-Chain Explorer</Link>
              <Link href="/dashboard" className="block text-xs text-white/60 hover:text-white transition-colors">Creator Dashboard</Link>
              <Link href="/analytics" className="block text-xs text-white/60 hover:text-white transition-colors">Platform Analytics</Link>
            </div>
          </div>
          {/* Resources */}
          <div>
            <p className="text-xs font-medium text-white/70 mb-3 uppercase tracking-wider">Resources</p>
            <div className="space-y-2">
              <Link href="/docs" className="block text-xs text-white/60 hover:text-white transition-colors">Documentation</Link>
              <Link href="/privacy" className="block text-xs text-white/60 hover:text-white transition-colors">Privacy Model</Link>
              <a href="https://github.com/Pratiikpy/Veil-Sub" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors">
                <Github className="w-3 h-3" aria-hidden="true" /> GitHub
              </a>
              <Link href="/vision" className="block text-xs text-white/60 hover:text-white transition-colors">Vision & Roadmap</Link>
            </div>
          </div>
        </div>
        {/* Bottom bar */}
        <div className="pt-5 border-t border-border/75 flex items-center justify-between text-xs text-white/60">
          <div className="flex items-center gap-2">
            <Shield className="w-3 h-3 text-violet-400/50" />
            <span>Built on Aleo—zero-knowledge by default</span>
          </div>
          <a
            href={`https://testnet.aleoscan.io/program?id=${DEPLOYED_PROGRAM_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View ${DEPLOYED_PROGRAM_ID} on Aleoscan`}
            className="flex items-center gap-1 hover:text-white/70 transition-colors font-mono"
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
            <span className="px-1.5 py-0.5 text-[9px] font-medium text-violet-400/70 bg-violet-500/[0.08] border border-violet-500/[0.12] rounded">
              v27
            </span>
          </div>
          <a href="https://github.com/Pratiikpy/Veil-Sub" target="_blank" rel="noopener noreferrer" aria-label="GitHub repository" className="flex items-center gap-1 text-xs text-white/60 hover:text-white/70 transition-colors">
            <Github className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
          <Link href="/docs" className="text-xs text-white/60 hover:text-white transition-colors">Docs</Link>
          <Link href="/privacy" className="text-xs text-white/60 hover:text-white transition-colors">Privacy</Link>
          <Link href="/vision" className="text-xs text-white/60 hover:text-white transition-colors">Vision</Link>
          <Link href="/explorer" className="text-xs text-white/60 hover:text-white transition-colors">On-Chain</Link>
        </div>
        <div className="pt-3 border-t border-border/75 flex items-center gap-2 text-[10px] text-white/60">
          <Shield className="w-3 h-3 text-violet-400/50 shrink-0" />
          <span>Built on Aleo—zero-knowledge by default</span>
        </div>
      </div>
    </footer>
  )
}
