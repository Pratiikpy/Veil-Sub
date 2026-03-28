'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Hash, Shield, Clock, Lock } from 'lucide-react'
import PageTransition from '@/components/PageTransition'
import AnimatedTabs from '@/components/ui/AnimatedTabs'
import DMConfigSection from '@/components/social/DMConfigSection'
import PaidMessagesSection from '@/components/social/PaidMessagesSection'
import ChatRoomsSection from '@/components/social/ChatRoomsSection'
import StoriesSection from '@/components/social/StoriesSection'
import { TABS, type TabId } from '@/components/social/constants'

const PRIVACY_BADGES = [
  { label: 'Poseidon2 Keys', icon: Hash },
  { label: 'ZK Membership', icon: Shield },
  { label: 'Block Expiry', icon: Clock },
  { label: 'Private Transfer', icon: Lock },
] as const

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState<TabId>('dm-config')

  const tabItems = TABS.map(t => ({ id: t.id, label: t.label }))

  return (
    <PageTransition className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-serif italic text-white">On-Chain Social</h1>
              <p className="text-xs text-white/60">
                veilsub_social_v2.aleo -- 7 transitions, 12 mappings
              </p>
            </div>
          </div>
          <p className="text-sm text-white/50 max-w-xl">
            Privacy-first social features powered by zero-knowledge proofs. DMs use payment via
            credits.aleo/transfer_private. Chat membership is proven via ZK circuit. Stories
            expire cryptographically at block height.
          </p>
        </div>

        {/* Privacy Badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          {PRIVACY_BADGES.map(badge => (
            <div
              key={badge.label}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-[11px] text-white/60"
            >
              <badge.icon className="w-3 h-3 text-violet-400/60" />
              {badge.label}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="border-b border-white/[0.06] mb-6">
          <AnimatedTabs
            tabs={tabItems}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as TabId)}
          />
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dm-config' && <DMConfigSection />}
            {activeTab === 'paid-messages' && <PaidMessagesSection />}
            {activeTab === 'chat-rooms' && <ChatRoomsSection />}
            {activeTab === 'stories' && <StoriesSection />}
          </motion.div>
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}
