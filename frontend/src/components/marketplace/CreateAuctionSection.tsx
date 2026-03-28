'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Plus,
  Gavel,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Image,
  Megaphone,
  Star,
  Shield,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import GlassCard from '@/components/GlassCard'
import Button from '@/components/ui/Button'
import { useContractExecute } from '@/hooks/useContractExecute'
import { MICROCREDITS_PER_CREDIT } from '@/lib/config'
import { MARKETPLACE_PROGRAM_ID, MARKETPLACE_FEES } from './constants'
import {
  saveAuctionToStorage,
  updateAuctionStorageWithId,
  saveSharedAuction,
  updateSharedAuctionId,
  pollForAuctionId,
  fetchBlockHeight,
  scanBlocksForAuctionId,
} from './helpers'
import { computeWalletHash } from '@/lib/utils'
import TransactionProgress from './TransactionProgress'
import type { TxStatus } from './TransactionProgress'
import PrivacyNotice from './PrivacyNotice'

// ─── Auction Templates ────────────────────────────────────────────────────────

const templates = [
  {
    key: 'featured',
    label: 'Featured Slot',
    icon: Star,
    color: 'amber',
    description: 'Premium homepage placement for top creators',
    slotPrefix: '100',
  },
  {
    key: 'exclusive',
    label: 'Exclusive Content',
    icon: Sparkles,
    color: 'violet',
    description: 'Gate premium content behind auction-won access',
    slotPrefix: '200',
  },
  {
    key: 'banner',
    label: 'Banner Ad',
    icon: Image,
    color: 'blue',
    description: 'Creator spotlight banner displayed to all visitors',
    slotPrefix: '300',
  },
  {
    key: 'promo',
    label: 'Promotion Slot',
    icon: Megaphone,
    color: 'emerald',
    description: 'Promoted content in the discovery feed',
    slotPrefix: '400',
  },
]

// ─── Color map for dynamic Tailwind classes ───────────────────────────────────

const templateColors: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  amber: { bg: 'bg-amber-500/5', border: 'border-amber-500/20', text: 'text-amber-400', iconBg: 'bg-amber-500/10' },
  violet: { bg: 'bg-violet-500/5', border: 'border-violet-500/20', text: 'text-violet-400', iconBg: 'bg-violet-500/10' },
  blue: { bg: 'bg-blue-500/5', border: 'border-blue-500/20', text: 'text-blue-400', iconBg: 'bg-blue-500/10' },
  emerald: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', text: 'text-emerald-400', iconBg: 'bg-emerald-500/10' },
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CreateAuctionSectionProps {
  onCreated?: () => void
}

export default function CreateAuctionSection({ onCreated }: CreateAuctionSectionProps = {}) {
  const { execute, connected, address } = useContractExecute()
  const [slotLabel, setSlotLabel] = useState('')
  const [contentSlotId, setContentSlotId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastTxId, setLastTxId] = useState<string | null>(null)
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txError, setTxError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedAuctionId, setCopiedAuctionId] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null)
  const [onChainAuctionId, setOnChainAuctionId] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extractionTimedOut, setExtractionTimedOut] = useState(false)
  const creatingRef = useRef(false)
  const pollCleanupRef = useRef<(() => void) | null>(null)
  const extractionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track submission data for post-extraction updates
  const submitDataRef = useRef<{ slotId: string; label: string } | null>(null)

  // Cleanup polling and timeout on unmount
  useEffect(() => {
    return () => {
      pollCleanupRef.current?.()
      if (extractionTimeoutRef.current) clearTimeout(extractionTimeoutRef.current)
    }
  }, [])

  // If extraction is stuck for 2 minutes, time out
  useEffect(() => {
    if (extracting && !onChainAuctionId) {
      extractionTimeoutRef.current = setTimeout(() => {
        if (!onChainAuctionId) {
          setExtractionTimedOut(true)
          setExtracting(false)
          pollCleanupRef.current?.()
        }
      }, 120_000)
      return () => {
        if (extractionTimeoutRef.current) clearTimeout(extractionTimeoutRef.current)
      }
    }
    if (onChainAuctionId && extractionTimeoutRef.current) {
      clearTimeout(extractionTimeoutRef.current)
      extractionTimeoutRef.current = null
    }
  }, [extracting, onChainAuctionId])

  const copyTxId = useCallback(() => {
    if (!lastTxId) return
    navigator.clipboard.writeText(lastTxId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [lastTxId])

  const copyAuctionId = useCallback(() => {
    if (!onChainAuctionId) return
    navigator.clipboard.writeText(onChainAuctionId)
    setCopiedAuctionId(true)
    toast.success('Auction ID copied! Share this with bidders.')
    setTimeout(() => setCopiedAuctionId(false), 2000)
  }, [onChainAuctionId])

  const applyTemplate = useCallback((templateKey: string) => {
    const tpl = templates.find((t) => t.key === templateKey)
    if (!tpl) return
    setActiveTemplate(templateKey)
    setSlotLabel(tpl.label)
    // Generate a unique-ish slot ID based on template prefix + timestamp suffix
    const suffix = Math.floor(Date.now() / 1000) % 100000
    setContentSlotId(`${tpl.slotPrefix}${suffix}`)
  }, [])

  // Shared callback: called when the real auction_id is found (from TX poll or block scan)
  const handleAuctionIdFound = useCallback(
    (realAuctionId: string, slotIdFormatted: string, auctionLabel: string, txId: string) => {
      setOnChainAuctionId(realAuctionId)
      setExtracting(false)
      // Update storage with the real on-chain auction ID
      updateAuctionStorageWithId(slotIdFormatted, realAuctionId, auctionLabel)
      updateSharedAuctionId(slotIdFormatted, address || '', realAuctionId)
      // Update Supabase registry with the real auction_id
      try {
        computeWalletHash(address || '').then(regHash => {
          fetch('/api/registry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'auction',
              creatorAddress: address,
              itemId: realAuctionId,
              label: auctionLabel,
              metadata: { txId, slotId: slotIdFormatted, status: 'open', auctionId: realAuctionId },
              walletAddress: address,
              walletHash: regHash,
              timestamp: Date.now(),
            }),
          })
        })
      } catch { /* best-effort */ }
      toast.success(
        'Auction ID extracted! Share this with bidders.',
        { duration: 6000 }
      )
      // Notify parent that auction was created
      onCreated?.()
      // Auto-announce auction in creator's feed with the real auction ID
      if (address) {
        try {
          computeWalletHash(address).then(walletHash => {
            const marketplaceUrl = `${window.location.origin}/marketplace?auction=${encodeURIComponent(realAuctionId)}`
            fetch('/api/posts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                creator: address,
                walletHash,
                timestamp: Date.now(),
                title: '',
                body: `Sealed-bid auction is now live: "${auctionLabel}"\n\nAuction ID: ${realAuctionId}\nBid here: ${marketplaceUrl}\n\nYour bid amount stays hidden until the reveal phase. Highest bidder wins at the second-highest price (Vickrey auction).`,
                postType: 'note',
                minTier: 0,
              }),
            })
          })
        } catch { /* best-effort announcement */ }
      }
    },
    [address, onCreated]
  )

  const handleCreate = useCallback(async () => {
    if (creatingRef.current) return
    if (!connected) {
      toast.error('Please connect your wallet')
      return
    }
    if (!contentSlotId) {
      toast.error('Please enter a content slot ID')
      return
    }

    creatingRef.current = true
    setSubmitting(true)
    setLastTxId(null)
    setTxStatus('submitting')
    setTxError(null)
    setOnChainAuctionId(null)
    setExtracting(false)
    setExtractionTimedOut(false)
    pollCleanupRef.current?.()

    try {
      // Check public balance covers fee
      try {
        const pubRes = await fetch(
          `/api/aleo/program/credits.aleo/mapping/account/${encodeURIComponent(address || '')}`
        )
        if (pubRes.ok) {
          const pubText = await pubRes.text()
          const pubBal = parseInt(
            pubText.replace(/"/g, '').replace(/u\d+$/, '').trim(),
            10
          )
          if (!isNaN(pubBal) && pubBal < MARKETPLACE_FEES.CREATE_AUCTION) {
            toast.error(
              `Insufficient public balance. You need ~${(MARKETPLACE_FEES.CREATE_AUCTION / MICROCREDITS_PER_CREDIT).toFixed(2)} ALEO for fees.`
            )
            setSubmitting(false)
            setTxStatus('idle')
            creatingRef.current = false
            return
          }
        }
      } catch {
        // Non-critical
      }

      setTxStatus('pending')
      const slotIdFormatted = contentSlotId.endsWith('field')
        ? contentSlotId
        : `${contentSlotId}field`
      const auctionLabel = slotLabel || `Auction ${slotIdFormatted.slice(0, 8)}...`

      // Record block height BEFORE submitting TX — needed for block scanning
      // if Shield Wallet returns a shield_* temp ID
      const preSubmitHeight = await fetchBlockHeight()

      const txId = await execute(
        'create_auction',
        [slotIdFormatted],
        MARKETPLACE_FEES.CREATE_AUCTION,
        MARKETPLACE_PROGRAM_ID
      )
      if (txId) {
        // Save with slotId as temporary key (will be updated once we extract auction_id)
        saveAuctionToStorage(slotIdFormatted, auctionLabel)
        submitDataRef.current = { slotId: slotIdFormatted, label: auctionLabel }

        // Save to shared registry so other users can discover this auction
        saveSharedAuction({
          slotId: slotIdFormatted,
          label: auctionLabel,
          creatorAddress: address || '',
          txId,
          timestamp: Date.now(),
        })

        // Save to global Supabase registry so ALL users can discover this auction
        try {
          const regHash = await computeWalletHash(address || '')
          await fetch('/api/registry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'auction',
              creatorAddress: address,
              itemId: slotIdFormatted,
              label: auctionLabel,
              metadata: { txId, status: 'open' },
              walletAddress: address,
              walletHash: regHash,
              timestamp: Date.now(),
            }),
          })
        } catch { /* best-effort registry save */ }

        setLastTxId(txId)
        setTxStatus('confirmed')
        toast.success('Auction submitted! Extracting on-chain auction ID...', {
          duration: 8000,
        })
        // Trigger immediate parent refresh so card appears in "Your Auctions"
        onCreated?.()

        // Determine extraction strategy based on TX ID format
        const isRealTxId = txId.startsWith('at1') || txId.startsWith('au1')

        if (isRealTxId) {
          // Strategy 1: Real TX ID — poll the Provable API by TX ID
          setExtracting(true)
          pollCleanupRef.current = pollForAuctionId(
            txId,
            (realAuctionId) => {
              handleAuctionIdFound(realAuctionId, slotIdFormatted, auctionLabel, txId)
            }
          )
        } else {
          // Strategy 2: Shield Wallet shield_* temp ID — use block scanning
          // Scan blocks from the pre-submission height forward to find our
          // create_auction transition and extract the auction_id from its outputs.
          setExtracting(true)
          toast.info(
            'Shield Wallet detected — scanning blocks for your auction. This may take 1-2 minutes...',
            { duration: 15000 }
          )

          // Run block scan asynchronously
          scanBlocksForAuctionId(preSubmitHeight).then((result) => {
            if (result) {
              // Found the real TX ID and auction ID from block scanning
              setLastTxId(result.txId)
              handleAuctionIdFound(result.auctionId, slotIdFormatted, auctionLabel, result.txId)
              // Also update the shared auction with the real TX ID
              updateSharedAuctionId(slotIdFormatted, address || '', result.auctionId)
            } else {
              // Block scanning timed out — fall back to manual instructions
              setExtracting(false)
              setExtractionTimedOut(true)
              // Still announce with what we have
              if (address) {
                computeWalletHash(address).then(walletHash => {
                  const marketplaceUrl = `${window.location.origin}/marketplace`
                  fetch('/api/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      creator: address,
                      walletHash,
                      timestamp: Date.now(),
                      title: '',
                      body: `Sealed-bid auction submitted: "${auctionLabel}"\n\nSlot ID: ${slotIdFormatted}\nBid here: ${marketplaceUrl}\n\nCheck AleoScan for the auction ID once the transaction confirms.`,
                      postType: 'note',
                      minTier: 0,
                    }),
                  })
                }).catch(() => { /* best-effort announcement */ })
              }
            }
          }).catch(() => {
            setExtracting(false)
            setExtractionTimedOut(true)
          })
        }

        setSlotLabel('')
        setActiveTemplate(null)
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to create auction'
      setTxError(msg)
      setTxStatus('failed')
      toast.error(msg)
    } finally {
      setSubmitting(false)
      creatingRef.current = false
    }
  }, [connected, contentSlotId, slotLabel, execute, address, handleAuctionIdFound])

  return (
    <GlassCard className="!p-6 sm:!p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-500/10 border border-violet-500/20">
          <Plus className="w-5 h-5 text-violet-400" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Create Auction</h3>
          <p className="text-xs text-white/50">
            Open a sealed-bid auction for a content slot
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Auction Templates */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Quick Templates
          </label>
          <div className="grid grid-cols-2 gap-2">
            {templates.map((tpl) => {
              const Icon = tpl.icon
              const colors = templateColors[tpl.color]
              const isActive = activeTemplate === tpl.key
              return (
                <button
                  key={tpl.key}
                  type="button"
                  onClick={() => applyTemplate(tpl.key)}
                  className={`text-left p-3 rounded-xl border transition-all duration-200 ${
                    isActive
                      ? `${colors.bg} ${colors.border} ring-1 ring-white/10`
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center ${colors.iconBg}`}
                    >
                      <Icon
                        className={`w-3 h-3 ${colors.text}`}
                        aria-hidden="true"
                      />
                    </div>
                    <span
                      className={`text-xs font-semibold ${isActive ? colors.text : 'text-white/70'}`}
                    >
                      {tpl.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/40 leading-relaxed">
                    {tpl.description}
                  </p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Auction Label */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Auction Label
          </label>
          <input
            type="text"
            value={slotLabel}
            onChange={(e) => setSlotLabel(e.target.value)}
            placeholder="e.g. Featured Slot #1"
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/50"
          />
        </div>

        {/* Content Slot ID */}
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Content Slot ID
          </label>
          <input
            type="text"
            value={contentSlotId}
            onChange={(e) => {
              setContentSlotId(e.target.value)
              setActiveTemplate(null)
            }}
            placeholder="Unique numeric ID (e.g. 12345)"
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/50"
          />
          <p className="text-xs text-white/40 mt-1">
            The auction ID is derived on-chain from your address + this slot ID
            via Poseidon2
          </p>
        </div>

        {/* Privacy notice */}
        <PrivacyNotice variant="general" />

        {/* Submit */}
        <Button
          variant="accent"
          className="w-full rounded-xl"
          onClick={handleCreate}
          disabled={submitting || !connected || !contentSlotId}
        >
          {submitting ? (
            <>
              <Loader2
                className="w-4 h-4 animate-spin"
                aria-hidden="true"
              />
              Creating auction...
            </>
          ) : (
            <>
              <Gavel className="w-4 h-4" aria-hidden="true" />
              Create Auction (
              {(MARKETPLACE_FEES.CREATE_AUCTION / MICROCREDITS_PER_CREDIT).toFixed(2)}{' '}
              ALEO)
            </>
          )}
        </Button>

        {/* Transaction Progress Stepper */}
        {txStatus !== 'idle' && (
          <TransactionProgress
            status={txStatus}
            txId={lastTxId}
            error={txError}
            onRetry={txStatus === 'failed' ? handleCreate : undefined}
          />
        )}

        {/* On-Chain Auction ID — extracted from TX output */}
        {lastTxId && txStatus === 'confirmed' && onChainAuctionId && (
          <div className="p-4 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">
                Auction Live -- Share This ID With Bidders
              </span>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.04] border border-white/[0.08]">
              <p className="text-[10px] text-white/40 mb-1">On-Chain Auction ID</p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-white font-mono break-all flex-1">
                  {onChainAuctionId}
                </p>
                <button
                  onClick={copyAuctionId}
                  className="shrink-0 p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                  aria-label="Copy auction ID"
                >
                  {copiedAuctionId ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-3 h-3 text-emerald-400/60" aria-hidden="true" />
              <p className="text-xs text-white/50">
                This Poseidon2 hash was computed on-chain from your address + slot ID.
                Bidders enter this ID to place sealed bids.
              </p>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-white/40">Transaction</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-white/50">
                  {lastTxId.slice(0, 16)}...
                </span>
                <button
                  onClick={copyTxId}
                  className="text-white/40 hover:text-white/60 transition-colors"
                  aria-label="Copy TX ID"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
            <a
              href={`https://testnet.aleoscan.io/transaction?id=${lastTxId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Verify on AleoScan
            </a>
          </div>
        )}

        {/* Extracting auction ID — polling in progress */}
        {lastTxId && txStatus === 'confirmed' && extracting && !onChainAuctionId && (
          <div className="p-4 rounded-xl bg-amber-500/[0.06] border border-amber-500/15 space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              <span className="text-sm font-medium text-amber-400">
                Extracting Auction ID from Transaction...
              </span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              The transaction is confirming on-chain. Once finalized, the
              Poseidon2 auction ID will be extracted from the transition output.
              This typically takes 15-60 seconds.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40">Transaction</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-white/50">
                  {lastTxId.slice(0, 20)}...
                </span>
                <button
                  onClick={copyTxId}
                  className="text-white/40 hover:text-white/60 transition-colors"
                  aria-label="Copy TX ID"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Extraction timed out — fallback instructions */}
        {lastTxId && txStatus === 'confirmed' && extractionTimedOut && !onChainAuctionId && (
          <div className="p-4 rounded-xl bg-amber-500/[0.06] border border-amber-500/15 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-sm font-medium text-amber-400">
                Auction Submitted -- Find Auction ID on Explorer
              </span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              The auction ID could not be extracted automatically. This can happen
              with Shield Wallet (delegated proving) or if the transaction is still
              confirming. Find the auction ID manually:
            </p>
            <ol className="text-xs text-white/50 space-y-1.5 list-decimal list-inside">
              <li>Open the transaction on AleoScan (link below)</li>
              <li>Find the <code className="text-violet-400/80 bg-white/[0.04] px-1 rounded">create_auction</code> transition</li>
              <li>In the output section, look for the <code className="text-violet-400/80 bg-white/[0.04] px-1 rounded">future</code> output</li>
              <li>The first argument (a field value like <code className="text-violet-400/80 bg-white/[0.04] px-1 rounded">12345field</code>) is your auction ID</li>
            </ol>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-white/40">Transaction</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-white/50">
                  {lastTxId.slice(0, 20)}...
                </span>
                <button
                  onClick={copyTxId}
                  className="text-white/40 hover:text-white/60 transition-colors"
                  aria-label="Copy TX ID"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
            <a
              href={`https://testnet.aleoscan.io/transaction?id=${lastTxId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              View on AleoScan to find your auction ID
            </a>
            <p className="text-[11px] text-white/40">
              Shield Wallet uses delegated proving. The real transaction ID may differ
              from the one shown above.
            </p>
          </div>
        )}
      </div>
    </GlassCard>
  )
}
