import Link from 'next/link'
import { Github, ExternalLink } from 'lucide-react'
import { PROGRAM_ID } from '@/lib/config'

export default function Footer() {
  return (
    <footer className="hidden md:block border-t border-white/[0.06] bg-black/80">
      <div className="max-w-[1120px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between text-xs text-[#525252]">
          <div className="flex items-center gap-4">
            <span className="font-serif italic text-[#71717a]">VeilSub</span>
            <span>·</span>
            <a
              href={`https://testnet.aleoscan.io/program?id=${PROGRAM_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-[#a1a1aa] transition-colors"
            >
              <code>{PROGRAM_ID}</code>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-[#a1a1aa] transition-colors">
              Privacy
            </Link>
            <Link href="/docs" className="hover:text-[#a1a1aa] transition-colors">
              Docs
            </Link>
            <a
              href="https://github.com/Pratiikpy/Veil-Sub"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-[#a1a1aa] transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
