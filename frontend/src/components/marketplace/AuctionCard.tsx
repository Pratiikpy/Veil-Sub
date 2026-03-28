'use client'

import { useState, useCallback, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { spring } from '@/lib/motion'
import {
  Gavel,
  Lock,
  Unlock,
  Trophy,
  XCircle,
  Loader2,
  Share2,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Shield,
} from 'lucide-react'
import { toast } from 'sonner'
import AddressAvatar from '@/components/ui/AddressAvatar'
import Button from '@/components/ui/Button'
import { useContractExecute } from '@/hooks/useContractExecute'
import { MICROCREDITS_PER_CREDIT } from '@/lib/config'
import { shortenAddress } from '@/lib/utils'
import { MARKETPLACE_PROGRAM_ID, MARKETPLACE_FEES, AUCTION_STATUS } from './constants'
import type { AuctionStatus } from './constants'
import { AuctionStatusBadge } from './SharedComponents'
import {
  generateSalt,
  saveBidToStorage,
  getBidsFromStorage,
  verifyBidOnChain,
  fetchBlockHeight,
  scanBlocksForAuctionId,
} from './helpers'
import TransactionProgress from './TransactionProgress'
import type { TxStatus } from './TransactionProgress'
import PrivacyNotice from './PrivacyNotice'

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface AuctionCardData {
  auctionId: string        // real Poseidon2 hash (hidden from user)
  label: string
  creatorAddress: string
  status: AuctionStatus
  bidCount: number
  highest: number
  second: number
  winnerHash: string
  createdAt?: string
}

interface AuctionCardProps {
  auction: AuctionCardData
  isCreator: boolean
  currentAddress: string | null
  onStatusChange?: () => void
}

// ─── Component ──────────────────────────────────────────────────────────────────

export default function AuctionCard({
  auction,
  isCreator,
  currentAddress,
  onStatusChange,
}: AuctionCardProps) {
  const { execute, connected } = useContractExecute()

  // Bid form state
  const [bidExpanded, setBidExpanded] = useState(false)
  const [bidAmount, setBidAmount] = useState('')
  const [salt] = useState(() => generateSalt())
  const [saltCopied, setSaltCopied] = useState(false)

  // Management form state
  const [winnerAddr, setWinnerAddr] = useState('')
  const [managementExpanded, setManagementExpanded] = useState(false)

  // Transaction state
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txError, setTxError] = useState<string | null>(null)
  const [lastTxId, setLastTxId] = useState<string | null>(null)

  // Share state
  const [copiedShare, setCopiedShare] = useState(false)

  // Technical details
  const [showTechnical, setShowTechnical] = useState(false)

  const actionRef = useRef(false)

  // Check if user has a stored bid for this auction
  const storedBids = getBidsFromStorage()
  const formattedId = auction.auctionId.endsWith('field')
    ? auction.auctionId
    : `${auction.auctionId}field`
  const userBid = storedBids.find(b => b.auctionId === formattedId)
  const hasBid = !!userBid

  // ─── Share handler ──────────────────────────────────────────────────────────

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/marketplace?auction=${encodeURIComponent(auction.auctionId)}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedShare(true)
      toast.success('Share URL copied to clipboard')
      setTimeout(() => setCopiedShare(false), 2000)
    }).catch(() => toast.error('Failed to copy URL'))
  }, [auction.auctionId])

  // ─── Copy salt ──────────────────────────────────────────────────────────────

  const copySalt = useCallback(() => {
    navigator.clipboard.writeText(salt)
    setSaltCopied(true)
    setTimeout(() => setSaltCopied(false), 2000)
  }, [salt])

  // ─── Place bid handler ──────────────────────────────────────────────────────

  const handlePlaceBid = useCallback(async () => {
    if (actionRef.current) return
    if (!connected) {
      toast.error('Please connect your wallet')
      return
    }
    const amountNum = parseInt(bidAmount, 10)
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid bid amount')
      return
    }

    actionRef.current = true
    setSubmitting('bid')
    setTxStatus('submitting')
    setTxError(null)
    setLastTxId(null)

    try {
      // First verify the auction exists at this ID (catches slot_id vs auction_id mismatch)
      let auctionExists = false
      try {
        const statusRes = await fetch(`/api/aleo/program/${MARKETPLACE_PROGRAM_ID}/mapping/auction_status/${formattedId}`)
        if (statusRes.ok) {
          const statusRaw = await statusRes.text()
          auctionExists = statusRaw !== 'null' && statusRaw !== ''
        }
      } catch { /* ignore */ }

      if (!auctionExists) {
        setTxStatus('failed')
        setTxError('This auction ID is not valid on-chain. The auction may not have been created yet, or the ID is a slot ID instead of the real Poseidon2 auction ID. Check AleoScan for the correct auction ID.')
        toast.error('Invalid auction ID — auction not found on-chain.')
        setSubmitting(null)
        actionRef.current = false
        return
      }

      setTxStatus('pending')

      // Record block height BEFORE submission for block scanning fallback
      const preSubmitHeight = await fetchBlockHeight()
      const prevBidCount = auction.bidCount

      const txId = await execute(
        'place_sealed_bid',
        [formattedId, `${amountNum}u64`, salt],
        MARKETPLACE_FEES.PLACE_BID,
        MARKETPLACE_PROGRAM_ID
      )

      if (txId) {
        setLastTxId(txId)

        // IMPORTANT: Do NOT save bid or show success until verified on-chain.
        // Shield Wallet returns shield_* IDs before TX confirms — many get rejected.
        toast.info('Bid submitted! Verifying on-chain — this takes ~30-60s...', { duration: 30000, id: 'bid-verify' })
        setTxStatus('pending')

        // Use onChainVerify pattern: poll auction_bid_count as source of truth.
        // This works regardless of whether we have a real TX ID or a shield_* ID.
        let verified = false
        for (let i = 0; i < 20; i++) {
          await new Promise(r => setTimeout(r, 5000))
          try {
            const bidVerified = await verifyBidOnChain(formattedId, prevBidCount)
            if (bidVerified) {
              verified = true
              break
            }
          } catch { /* retry */ }
        }

        toast.dismiss('bid-verify')

        if (verified) {
          // If we had a shield_* ID, try to get the real TX ID from block scanning
          const isShieldId = !txId.startsWith('at1') && !txId.startsWith('au1')
          let finalTxId = txId
          if (isShieldId && preSubmitHeight > 0) {
            // Quick block scan (just a few attempts since we know the TX confirmed)
            try {
              const latestHeight = await fetchBlockHeight()
              if (latestHeight > preSubmitHeight) {
                const start = Math.max(preSubmitHeight + 1, latestHeight - 10)
                for (let h = latestHeight; h >= start; h--) {
                  try {
                    const blockRes = await fetch(`/api/aleo/block/${h}/transactions`)
                    if (!blockRes.ok) continue
                    const transactions = await blockRes.json()
                    if (!Array.isArray(transactions)) continue
                    for (const confirmed of transactions) {
                      if (confirmed.status !== 'accepted') continue
                      const tx = confirmed.transaction
                      if (!tx?.execution?.transitions) continue
                      for (const transition of tx.execution.transitions) {
                        const prog = transition.program || transition.program_id
                        const func = transition.function || transition.function_name
                        if (prog === MARKETPLACE_PROGRAM_ID && func === 'place_sealed_bid') {
                          finalTxId = tx.id as string
                        }
                      }
                    }
                  } catch { continue }
                }
              }
            } catch { /* keep shield_* ID as fallback */ }
            if (finalTxId !== txId) {
              setLastTxId(finalTxId)
            }
          }

          // Only save bid AFTER on-chain verification
          saveBidToStorage({
            auctionId: formattedId,
            amount: amountNum,
            salt,
            commitment: finalTxId,
            timestamp: Date.now(),
          })
          setTxStatus('confirmed')
          toast.success('Bid confirmed on-chain! Your bid amount is sealed.', { duration: 6000 })
          setBidAmount('')
          setBidExpanded(false)
          onStatusChange?.()
        } else {
          setTxStatus('failed')
          setTxError('Bid was rejected on-chain. Possible reasons: (1) You already bid on this auction (one bid per bidder). (2) The auction is closed. (3) The auction ID is incorrect. No ALEO was spent.')
          toast.error('Bid rejected on-chain. No ALEO spent.')
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to place bid'
      setTxStatus('failed')
      setTxError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(null)
      actionRef.current = false
    }
  }, [connected, bidAmount, salt, formattedId, execute, onStatusChange, auction.bidCount])

  // ─── Management actions ─────────────────────────────────────────────────────

  const handleAction = useCallback(async (action: string) => {
    if (actionRef.current) return
    if (!connected) {
      toast.error('Please connect your wallet')
      return
    }

    actionRef.current = true
    setSubmitting(action)
    setTxStatus('submitting')
    setTxError(null)
    setLastTxId(null)

    try {
      const feeMap: Record<string, number> = {
        close: MARKETPLACE_FEES.CLOSE_BIDDING,
        resolve: MARKETPLACE_FEES.RESOLVE_AUCTION,
        cancel: MARKETPLACE_FEES.CANCEL_AUCTION,
        reveal: MARKETPLACE_FEES.REVEAL_BID,
      }
      const feeAmount = feeMap[action] ?? 200_000

      setTxStatus('pending')
      let txId: string | null = null

      switch (action) {
        case 'close': {
          txId = await execute(
            'close_bidding',
            [formattedId],
            feeAmount,
            MARKETPLACE_PROGRAM_ID
          )
          if (txId) toast.success('Close bidding submitted!')
          break
        }
        case 'reveal': {
          if (!userBid) {
            toast.error('No stored bid found for this auction.')
            setTxStatus('idle')
            break
          }
          toast.info(
            'Reveal requires the BidReceipt record from your wallet. Use your wallet to execute reveal_bid directly.',
            { duration: 6000 }
          )
          setTxStatus('idle')
          break
        }
        case 'resolve': {
          if (!winnerAddr) {
            toast.error('Please enter the winner address')
            setTxStatus('idle')
            break
          }
          txId = await execute(
            'resolve_auction',
            [formattedId, winnerAddr],
            feeAmount,
            MARKETPLACE_PROGRAM_ID
          )
          if (txId) toast.success('Resolve submitted!')
          break
        }
        case 'cancel': {
          txId = await execute(
            'cancel_auction',
            [formattedId],
            feeAmount,
            MARKETPLACE_PROGRAM_ID
          )
          if (txId) toast.success('Cancel submitted!')
          break
        }
      }

      if (txId) {
        setLastTxId(txId)
        setTxStatus('confirmed')
        onStatusChange?.()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to ${action}`
      setTxError(msg)
      setTxStatus('failed')
      toast.error(msg)
    } finally {
      setSubmitting(null)
      actionRef.current = false
    }
  }, [connected, formattedId, winnerAddr, userBid, execute, onStatusChange])

  // ─── Status-dependent action button logic ─────────────────────────────────

  function renderActionButton() {
    if (auction.status === AUCTION_STATUS.RESOLVED) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-blue-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Resolved</span>
        </div>
      )
    }

    if (isCreator) {
      if (auction.status === AUCTION_STATUS.OPEN) {
        return (
          <button
            onClick={(e) => { e.stopPropagation(); setManagementExpanded(!managementExpanded) }}
            className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            Manage
          </button>
        )
      }
      if (auction.status === AUCTION_STATUS.CLOSED) {
        return (
          <button
            onClick={(e) => { e.stopPropagation(); setManagementExpanded(!managementExpanded) }}
            className="px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs font-medium text-violet-400 hover:bg-violet-500/20 transition-colors"
          >
            Resolve
          </button>
        )
      }
    }

    // Bidder view
    if (auction.status === AUCTION_STATUS.OPEN) {
      if (hasBid) {
        return (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Bid Placed</span>
          </div>
        )
      }
      return (
        <button
          onClick={(e) => { e.stopPropagation(); setBidExpanded(!bidExpanded) }}
          className="px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs font-medium text-violet-400 hover:bg-violet-500/20 transition-colors"
        >
          Place Bid
        </button>
      )
    }

    if (auction.status === AUCTION_STATUS.CLOSED) {
      if (hasBid) {
        return (
          <button
            onClick={(e) => { e.stopPropagation(); handleAction('reveal') }}
            disabled={submitting !== null}
            className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-40"
          >
            {submitting === 'reveal' ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              'Reveal Bid'
            )}
          </button>
        )
      }
      return (
        <div className="flex items-center gap-1.5 text-xs text-white/40">
          <EyeOff className="w-3 h-3" />
          <span>Reveal Phase</span>
        </div>
      )
    }

    return null
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const statusGradient =
    auction.status === AUCTION_STATUS.OPEN
      ? 'from-emerald-500/60 via-emerald-400/30 to-transparent'
      : auction.status === AUCTION_STATUS.CLOSED
        ? 'from-amber-500/60 via-amber-400/30 to-transparent'
        : 'from-blue-500/60 via-blue-400/30 to-transparent'

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden hover:border-white/[0.12] transition-all group">
      {/* Top accent gradient */}
      <div className={`h-[2px] bg-gradient-to-r ${statusGradient}`} />

      <div className="p-4 sm:p-5">
        {/* Header row: avatar + label + status + action */}
        <div className="flex items-start gap-3 mb-3">
          <AddressAvatar address={auction.creatorAddress} size={36} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate group-hover:text-violet-300 transition-colors">
              {auction.label || 'Sealed-Bid Auction'}
            </p>
            <p className="text-xs text-white/50 truncate">
              {shortenAddress(auction.creatorAddress)}
              {isCreator && (
                <span className="ml-1.5 text-violet-400/70 font-medium">(you)</span>
              )}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <AuctionStatusBadge status={auction.status} />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 text-xs text-white/50">
            <span className="flex items-center gap-1">
              <Gavel className="w-3 h-3 text-white/40" />
              {auction.bidCount} bid{auction.bidCount !== 1 ? 's' : ''}
            </span>
            {auction.status >= AUCTION_STATUS.CLOSED && auction.highest > 0 && (
              <span className="flex items-center gap-1">
                <Trophy className="w-3 h-3 text-amber-400/70" />
                {auction.highest}
              </span>
            )}
            {auction.createdAt && (
              <span className="text-white/30">
                {new Date(auction.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Share button */}
            <button
              onClick={handleShare}
              className="p-1.5 rounded-lg text-white/30 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
              title="Copy share URL"
            >
              {copiedShare ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
            </button>
            {/* Action button */}
            {renderActionButton()}
          </div>
        </div>

        {/* Resolved settlement info */}
        {auction.status === AUCTION_STATUS.RESOLVED && auction.second > 0 && (
          <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10 mb-3">
            <p className="text-xs text-white/50">
              <span className="text-blue-400 font-medium">Vickrey Settlement: </span>
              Winner pays {auction.second} (second-highest bid)
            </p>
          </div>
        )}

        {/* ── Inline Bid Form (expands when "Place Bid" clicked) ─────────── */}
        <AnimatePresence>
          {bidExpanded && auction.status === AUCTION_STATUS.OPEN && !hasBid && (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={spring.gentle}
              className="overflow-hidden"
            >
              <div className="pt-3 border-t border-white/[0.06] space-y-3">
                {/* Bid amount */}
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">
                    Bid Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder="Amount in microcredits"
                      className="w-full px-3 py-2 pr-12 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/40"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/30">
                      u64
                    </span>
                  </div>
                </div>

                {/* Salt (auto-generated) */}
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">
                    Salt <span className="text-white/30">(auto-generated, saved locally)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[10px] text-white/40 font-mono truncate">
                      {salt.slice(0, 24)}...
                    </div>
                    <button
                      type="button"
                      onClick={copySalt}
                      className="shrink-0 p-2 text-xs text-white/50 hover:text-white/80 bg-white/[0.04] border border-white/10 rounded-xl transition-colors"
                      aria-label="Copy salt"
                    >
                      {saltCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-400/50 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                    Saved in your browser. Needed to reveal your bid later.
                  </p>
                </div>

                {/* Privacy notice */}
                <PrivacyNotice variant="bid" />

                {/* Submit bid */}
                <Button
                  variant="accent"
                  size="sm"
                  className="w-full rounded-xl"
                  onClick={handlePlaceBid}
                  disabled={submitting !== null || !connected || !bidAmount}
                >
                  {submitting === 'bid' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Committing bid...
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      Submit Sealed Bid ({(MARKETPLACE_FEES.PLACE_BID / MICROCREDITS_PER_CREDIT).toFixed(2)} ALEO)
                    </>
                  )}
                </Button>

                {/* Transaction progress */}
                {txStatus !== 'idle' && (
                  <TransactionProgress
                    status={txStatus}
                    txId={lastTxId}
                    error={txError}
                    onRetry={txStatus === 'failed' ? handlePlaceBid : undefined}
                  />
                )}
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* ── Creator Management Panel (expands for creators) ──────────── */}
        <AnimatePresence>
          {managementExpanded && isCreator && (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={spring.gentle}
              className="overflow-hidden"
            >
              <div className="pt-3 border-t border-white/[0.06] space-y-3">
                {auction.status === AUCTION_STATUS.OPEN && (
                  <>
                    <PrivacyNotice variant="bid" />
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => handleAction('close')}
                        disabled={submitting !== null}
                      >
                        {submitting === 'close' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Lock className="w-3 h-3" />
                        )}
                        Close Bidding
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl text-red-400 hover:text-red-300"
                        onClick={() => handleAction('cancel')}
                        disabled={submitting !== null}
                      >
                        {submitting === 'cancel' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        Cancel
                      </Button>
                    </div>
                  </>
                )}

                {auction.status === AUCTION_STATUS.CLOSED && (
                  <div className="space-y-3">
                    <PrivacyNotice variant="reveal" />

                    {/* Bidder reveal button */}
                    {hasBid && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full rounded-xl"
                        onClick={() => handleAction('reveal')}
                        disabled={submitting !== null}
                      >
                        {submitting === 'reveal' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Unlock className="w-3 h-3" />
                        )}
                        Reveal My Bid
                      </Button>
                    )}

                    {/* Resolve section */}
                    <div className="pt-2 border-t border-white/[0.04] space-y-2">
                      <PrivacyNotice variant="resolve" />
                      <input
                        type="text"
                        value={winnerAddr}
                        onChange={(e) => setWinnerAddr(e.target.value)}
                        placeholder="Winner address (aleo1...)"
                        className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/40"
                      />
                      <Button
                        variant="accent"
                        size="sm"
                        className="w-full rounded-xl"
                        onClick={() => handleAction('resolve')}
                        disabled={submitting !== null || !winnerAddr}
                      >
                        {submitting === 'resolve' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trophy className="w-3 h-3" />
                        )}
                        Resolve Auction (Vickrey)
                      </Button>
                    </div>
                  </div>
                )}

                {/* Transaction progress */}
                {txStatus !== 'idle' && (
                  <TransactionProgress
                    status={txStatus}
                    txId={lastTxId}
                    error={txError}
                  />
                )}
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* ── Technical details (hidden by default) ────────────────────── */}
        <div className="mt-2 pt-2 border-t border-white/[0.04]">
          <button
            type="button"
            onClick={() => setShowTechnical(!showTechnical)}
            className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/40 transition-colors"
          >
            {showTechnical ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
            {showTechnical ? 'Hide' : 'Show'} technical details
          </button>
          <AnimatePresence>
            {showTechnical && (
              <m.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/30">Auction ID (Poseidon2)</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(auction.auctionId)
                        toast.success('Auction ID copied')
                      }}
                      className="text-white/30 hover:text-white/50 transition-colors"
                    >
                      <Copy className="w-2.5 h-2.5" />
                    </button>
                  </div>
                  <p className="text-[9px] font-mono text-white/30 break-all leading-relaxed">
                    {auction.auctionId}
                  </p>
                  {auction.winnerHash && auction.winnerHash !== '0field' && (
                    <p className="text-[9px] text-white/25">
                      <span className="text-white/35">Winner hash:</span> {auction.winnerHash}
                    </p>
                  )}
                  {lastTxId && (
                    <a
                      href={`https://testnet.aleoscan.io/transaction?id=${lastTxId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-violet-400/60 hover:text-violet-400 transition-colors"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      View on AleoScan
                    </a>
                  )}
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
