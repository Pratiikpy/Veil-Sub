'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  Send,
  Shield,
  Loader2,
  Wallet,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { useContractExecute } from '@/hooks/useContractExecute'
import { useWalletRecords } from '@/hooks/useWalletRecords'
import { MICROCREDITS_PER_CREDIT, FEATURED_CREATORS, getCreatorHash } from '@/lib/config'
import { formatCredits, isValidAleoAddress } from '@/lib/utils'
import { spring, staggerContainer, staggerItem } from '@/lib/motion'
import AddressAvatar from '@/components/ui/AddressAvatar'
import { SOCIAL_PROGRAM_ID, SOCIAL_FEES, hashToField } from './constants'
import { NotConnectedCard, PrivacyNotice } from './SharedComponents'

export default function PaidMessagesSection() {
  const { address, connected } = useWallet()
  const { execute } = useContractExecute()
  const { getCreditsRecords } = useWalletRecords()

  const [creatorAddress, setCreatorAddress] = useState('')
  const [messageContent, setMessageContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [creditsRecords, setCreditsRecords] = useState<string[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [lastReceipt, setLastReceipt] = useState<{ txId: string; messageHash: string; amount: number } | null>(null)

  // DM config for selected creator
  const [creatorDMConfig, setCreatorDMConfig] = useState<{ enabled: boolean; price: number; minTier: number } | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(false)

  // Load credits records on mount
  useEffect(() => {
    if (!connected) return
    let cancelled = false
    async function load() {
      setLoadingRecords(true)
      try {
        const records = await getCreditsRecords()
        if (!cancelled) setCreditsRecords(records)
      } catch {
        // Non-critical
      } finally {
        if (!cancelled) setLoadingRecords(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [connected, getCreditsRecords])

  // Fetch DM config when creator changes
  useEffect(() => {
    if (!creatorAddress || !isValidAleoAddress(creatorAddress)) {
      setCreatorDMConfig(null)
      return
    }
    const hash = getCreatorHash(creatorAddress)
    if (!hash) {
      setCreatorDMConfig(null)
      return
    }

    let cancelled = false
    setLoadingConfig(true)
    async function fetchDMConfig() {
      try {
        const [enabledRes, priceRes, tierRes] = await Promise.allSettled([
          fetch(`/api/aleo/program/${SOCIAL_PROGRAM_ID}/mapping/dm_enabled/${hash}`),
          fetch(`/api/aleo/program/${SOCIAL_PROGRAM_ID}/mapping/dm_price/${hash}`),
          fetch(`/api/aleo/program/${SOCIAL_PROGRAM_ID}/mapping/dm_min_tier/${hash}`),
        ])
        if (cancelled) return

        const enabledText = enabledRes.status === 'fulfilled' && enabledRes.value.ok
          ? await enabledRes.value.text() : null
        const priceText = priceRes.status === 'fulfilled' && priceRes.value.ok
          ? await priceRes.value.text() : null
        const tierText = tierRes.status === 'fulfilled' && tierRes.value.ok
          ? await tierRes.value.text() : null

        setCreatorDMConfig({
          enabled: enabledText?.includes('true') ?? false,
          price: priceText ? parseInt(priceText.replace(/"/g, '').replace(/u\d+$/,'').trim(), 10) || 0 : 0,
          minTier: tierText ? parseInt(tierText.replace(/"/g, '').replace(/u\d+$/,'').trim(), 10) || 1 : 1,
        })
      } catch {
        setCreatorDMConfig(null)
      } finally {
        if (!cancelled) setLoadingConfig(false)
      }
    }
    fetchDMConfig()
    return () => { cancelled = true }
  }, [creatorAddress])

  const handleSendMessage = useCallback(async () => {
    if (!address || !creatorAddress || !messageContent.trim() || submitting) return
    if (!isValidAleoAddress(creatorAddress)) {
      toast.error('Invalid creator address')
      return
    }
    if (creditsRecords.length === 0) {
      toast.error('No credits records available. Convert public credits first.')
      return
    }
    if (!creatorDMConfig?.enabled) {
      toast.error('This creator has not enabled DMs')
      return
    }

    setSubmitting(true)
    try {
      // Check public balance covers fee
      try {
        const pubRes = await fetch(`/api/aleo/program/credits.aleo/mapping/account/${encodeURIComponent(address || '')}`)
        if (pubRes.ok) {
          const pubText = await pubRes.text()
          const pubBal = parseInt(pubText.replace(/"/g, '').replace(/u\d+$/, '').trim(), 10)
          if (!isNaN(pubBal) && pubBal < SOCIAL_FEES.SEND_PAID_MESSAGE) {
            toast.error(`Insufficient public balance. You need ~${(SOCIAL_FEES.SEND_PAID_MESSAGE / 1_000_000).toFixed(2)} ALEO for fees. Get testnet credits from the faucet.`)
            setSubmitting(false)
            return
          }
        }
      } catch {
        // Non-critical — proceed and let the wallet handle it
      }

      const messageHash = await hashToField(messageContent.trim())

      const creatorHash = getCreatorHash(creatorAddress)
      if (!creatorHash) {
        toast.error('Creator hash not found. Creator may not be registered.')
        setSubmitting(false)
        return
      }

      const amount = creatorDMConfig.price
      const creditsRecord = creditsRecords[0]

      // Build DMAccessProof struct inline
      const dmProof = `{ creator: ${creatorAddress}, creator_hash: ${creatorHash}, tier: 1u8, expires_at: 999999999u32 }`

      const txId = await execute(
        'send_paid_message',
        [dmProof, `${messageHash}field`, creditsRecord, `${amount}u64`],
        SOCIAL_FEES.SEND_PAID_MESSAGE,
        SOCIAL_PROGRAM_ID,
      )
      if (txId) {
        toast.success('Paid message sent!', { description: `TX: ${txId.slice(0, 16)}...` })
        setLastReceipt({ txId, messageHash, amount })
        setMessageContent('')
      }
    } catch (err) {
      toast.error('Failed to send message', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setSubmitting(false)
    }
  }, [address, creatorAddress, messageContent, submitting, creditsRecords, creatorDMConfig, execute])

  if (!connected) {
    return <NotConnectedCard message="Connect your wallet to send paid on-chain messages to creators." />
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
      <motion.div variants={staggerItem} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
        <h3 className="text-sm font-medium text-white mb-4">Send Paid Message</h3>

        {/* Quick Select */}
        <div className="mb-4">
          <p className="text-xs text-white/60 mb-2">Quick select a creator:</p>
          <div className="flex flex-wrap gap-2">
            {FEATURED_CREATORS.map(c => (
              <button
                key={c.address}
                onClick={() => setCreatorAddress(c.address)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
                  creatorAddress === c.address
                    ? 'bg-violet-500/20 border border-violet-500/30 text-violet-200'
                    : 'bg-white/[0.03] border border-white/[0.06] text-white/60 hover:border-white/[0.12]'
                }`}
              >
                <AddressAvatar address={c.address} size={16} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Address Input */}
        <div className="mb-4">
          <label htmlFor="creator-addr" className="block text-xs text-white/50 mb-1.5">Creator address</label>
          <input
            id="creator-addr"
            type="text"
            value={creatorAddress}
            onChange={e => setCreatorAddress(e.target.value)}
            placeholder="aleo1..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/50 font-mono focus:outline-none focus:border-violet-500/40 transition-colors"
          />
        </div>

        {/* DM Config Status */}
        {creatorAddress && isValidAleoAddress(creatorAddress) && (
          <div className="mb-4">
            {loadingConfig ? (
              <div className="flex items-center gap-2 text-xs text-white/60">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading DM configuration...
              </div>
            ) : creatorDMConfig?.enabled ? (
              <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-400">DMs enabled</span>
                </div>
                <div className="flex gap-4 text-[11px] text-white/50">
                  <span>Price: {creatorDMConfig.price > 0 ? `${formatCredits(creatorDMConfig.price)} ALEO` : 'Free'}</span>
                  <span>Min tier: {creatorDMConfig.minTier}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-red-500/5 border border-red-500/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-xs text-red-400">This creator has not enabled on-chain DMs</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message Input */}
        <div className="mb-4">
          <label htmlFor="msg-content" className="block text-xs text-white/50 mb-1.5">Message content</label>
          <textarea
            id="msg-content"
            value={messageContent}
            onChange={e => setMessageContent(e.target.value)}
            placeholder="Your message (will be hashed on-chain)..."
            maxLength={500}
            rows={3}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-violet-500/40 transition-colors resize-none"
          />
          <p className="text-[11px] text-white/60 mt-1">
            {messageContent.length}/500 -- Only the hash is stored on-chain for privacy.
          </p>
        </div>

        {/* Wallet Status */}
        <div className="flex items-center gap-2 mb-4 text-xs text-white/60">
          <Wallet className="w-3.5 h-3.5" />
          {loadingRecords ? (
            <span>Loading records...</span>
          ) : (
            <span>{creditsRecords.length} credit record{creditsRecords.length !== 1 ? 's' : ''} available</span>
          )}
        </div>

        {/* Send */}
        <button
          onClick={handleSendMessage}
          disabled={submitting || !creatorDMConfig?.enabled || !messageContent.trim() || creditsRecords.length === 0}
          className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-200 font-medium text-sm hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none"
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating ZK Proof...</>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send Paid Message
              {creatorDMConfig?.price ? ` (${formatCredits(creatorDMConfig.price)} ALEO)` : ''}
            </>
          )}
        </button>
      </motion.div>

      {/* Receipt */}
      {lastReceipt && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.gentle}
          className="rounded-2xl bg-violet-500/5 border border-violet-500/10 p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-violet-400" />
            <h3 className="text-sm font-medium text-violet-300">MessageReceipt</h3>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-white/60">tx_id</span>
              <span className="text-white/70">{lastReceipt.txId.slice(0, 24)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">message_hash</span>
              <span className="text-white/70">{lastReceipt.messageHash.slice(0, 20)}...field</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">amount</span>
              <span className="text-white/70">{formatCredits(lastReceipt.amount)} ALEO</span>
            </div>
          </div>
        </motion.div>
      )}

      <PrivacyNotice text="Messages are hashed with Poseidon2 before storage. The on-chain record contains only the hash, not the content. Payment uses credits.aleo/transfer_private -- no public trace." />
    </motion.div>
  )
}
