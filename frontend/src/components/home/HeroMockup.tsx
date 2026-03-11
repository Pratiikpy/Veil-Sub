'use client'

import { m } from 'framer-motion'
import { Lock, Shield, Check, Users, Coins } from 'lucide-react'

const TIERS = [
  { name: 'Basic', price: '1', selected: false },
  { name: 'Premium', price: '2', selected: true },
  { name: 'VIP', price: '5', selected: false },
]

export default function HeroMockup() {
  return (
    <m.div
      initial={{ opacity: 0, y: 50, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 2 }}
      transition={{ duration: 0.9, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="mt-16 sm:mt-20 max-w-2xl mx-auto"
      style={{ perspective: 1200, transformStyle: 'preserve-3d' }}
    >
      {/* Ambient glow behind mockup */}
      <div
        className="absolute inset-0 -z-10 blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 60%, rgba(139,92,246,0.18) 0%, transparent 60%)',
        }}
      />

      <div
        className="relative rounded-2xl overflow-hidden border border-white/[0.12]"
        style={{
          background: 'linear-gradient(180deg, rgba(10,10,10,0.7) 0%, rgba(10,10,10,0.6) 100%)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 50px rgba(139,92,246,0.12), inset 0 1px 1px rgba(255,255,255,0.06)',
        }}
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-white/[0.06]">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/[0.08]" />
          </div>
          <div className="flex-1 mx-4 sm:mx-8">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.04]">
              <Lock className="w-3 h-3 text-emerald-400/60 shrink-0" />
              <span className="text-[11px] text-white/60 font-mono truncate">
                veilsub.vercel.app/creator/aleo1hp9...epyxs
              </span>
            </div>
          </div>
        </div>

        {/* App content */}
        <div className="p-4 sm:p-8">
          {/* Creator header */}
          <m.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            className="flex items-center gap-4 mb-6"
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500/25 to-violet-600/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-violet-300">A</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">Alice Privacy</span>
                <span className="px-2 py-1 text-[9px] font-medium text-emerald-400 bg-emerald-500/[0.08] border border-emerald-500/[0.15] rounded">
                  Verified
                </span>
              </div>
              <span className="text-[11px] text-white/60 font-mono truncate">aleo1hp9m08f...epyxs</span>
            </div>
            <div className="ml-auto flex items-center gap-4 text-xs text-white/60">
              <span className="hidden sm:flex items-center gap-1">
                <Users className="w-3 h-3" /> 42
              </span>
              <span className="hidden sm:flex items-center gap-1">
                <Coins className="w-3 h-3" /> 126 ALEO
              </span>
            </div>
          </m.div>

          {/* Tier cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
            {TIERS.map((tier, i) => (
              <m.div
                key={tier.name}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 1.4 + i * 0.08 }}
                className={`relative p-4 rounded-xl border text-center transition-all ${
                  tier.selected
                    ? 'bg-violet-500/[0.08] border-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.08)]'
                    : 'bg-white/[0.02] border-white/[0.06]'
                }`}
              >
                {tier.selected && (
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-2 py-1 rounded-full bg-violet-500/20 border border-violet-500/30">
                    <span className="text-[8px] font-medium text-violet-300 uppercase tracking-wider">Popular</span>
                  </div>
                )}
                <p className="text-[10px] text-white/70 mb-0.5 mt-1 uppercase tracking-wider">{tier.name}</p>
                <p className={`text-2xl sm:text-3xl font-bold leading-none ${tier.selected ? 'text-violet-200' : 'text-white'}`}>{tier.price}</p>
                <p className="text-[10px] text-white/60 mt-1 font-medium">ALEO/mo</p>
                {tier.selected && (
                  <Check className="w-3.5 h-3.5 text-violet-400 mx-auto mt-2" />
                )}
              </m.div>
            ))}
          </div>

          {/* Subscribe button */}
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.7 }}
          >
            <div className="w-full py-4 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-sm font-semibold text-center transition-colors cursor-pointer">
              Subscribe Privately
            </div>
          </m.div>

          {/* Privacy notice */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 1.9 }}
            className="flex items-center justify-center gap-2 mt-4"
          >
            <Shield className="w-3 h-3 text-violet-400/70" />
            <span className="text-[11px] text-white/70">Your identity stays completely hidden</span>
          </m.div>
        </div>

        {/* Bottom fade — merges mockup into page background */}
        <div
          className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
          }}
        />
      </div>
    </m.div>
  )
}
