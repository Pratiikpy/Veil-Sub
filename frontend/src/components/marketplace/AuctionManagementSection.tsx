'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { spring } from '@/lib/motion'
import {
  Gavel,
  Lock,
  Unlock,
  XCircle,
  CheckCircle2,
  Trophy,
  Eye,
  ArrowRight,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Shield,
  Search,
  Share2,
  Copy,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import GlassCard from '@/components/GlassCard'
import Button from '@/components/ui/Button'
import { useContractExecute } from '@/hooks/useContractExecute'
import { MARKETPLACE_PROGRAM_ID, MARKETPLACE_FEES, AUCTION_STATUS } from './constants'
import type { AuctionData, StoredBid, AuctionStatus } from './constants'
import { getBidsFromStorage, getAuctionsFromStorage, queryMapping, parseU64, parseU8 } from './helpers'
import { AuctionStatusBadge } from './SharedComponents'
import AuctionLifecycleStepper from './AuctionLifecycleStepper'
import AuctionPrivacyDashboard from './AuctionPrivacyDashboard'
import TransactionProgress from './TransactionProgress'
import type { TxStatus } from './TransactionProgress'
import PrivacyNotice from './PrivacyNotice'

// ─── Component ────────────────────────────────────────────────────────────────

export default function AuctionManagementSection() {
  const { execute, connected, address } = useContractExecute()
  const [auctionId, setAuctionId] = useState('')
  const [winnerAddr, setWinnerAddr] = useState('')
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [auctionData, setAuctionData] = useState<AuctionData | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [storedBids, setStoredBids] = useState<StoredBid[]>([])
  const [storedAuctions, setStoredAuctions] = useState<{ id: string; label: string }[]>([])
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txError, setTxError] = useState<string | null>(null)
  const [lastTxId, setLastTxId] = useState<string | null>(null)
  const [copiedShareUrl, setCopiedShareUrl] = useState<string | null>(null)
  const actionRef = useRef(false)

  useEffect(() => {
    setStoredBids(getBidsFromStorage())
    setStoredAuctions(getAuctionsFromStorage())
  }, [])

  // Check URL params for shared auction ID
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const sharedAuctionId = params.get('auction')
    if (sharedAuctionId) {
      setAuctionId(sharedAuctionId)
    }
  }, [])

  const handleShareAuction = useCallback((id: string) => {
    const url = `${window.location.origin}/marketplace?auction=${encodeURIComponent(id)}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedShareUrl(id)
      toast.success('Share URL copied to clipboard')
      setTimeout(() => setCopiedShareUrl(null), 2000)
    }).catch(() => {
      toast.error('Failed to copy URL')
    })
  }, [])

  const lookupAuction = useCallback(async () => {
    if (!auctionId) return
    setLookingUp(true)
    try {
      const idFormatted = auctionId.endsWith('field')
        ? auctionId
        : `${auctionId}field`
      const [statusRaw, creatorRaw, bidCountRaw, highestRaw, secondRaw, winnerRaw] =
        await Promise.all([
          queryMapping('auction_status', idFormatted),
          queryMapping('auction_creator', idFormatted),
          queryMapping('auction_bid_count', idFormatted),
          queryMapping('auction_highest', idFormatted),
          queryMapping('auction_second', idFormatted),
          queryMapping('auction_winner', idFormatted),
        ])

      if (statusRaw === null) {
        toast.error('Auction not found')
        setAuctionData(null)
        return
      }

      setAuctionData({
        id: idFormatted,
        label: `Auction ${idFormatted.slice(0, 12)}...`,
        status: parseU8(statusRaw) as AuctionStatus,
        creatorHash: creatorRaw?.replace(/"/g, '') || '0field',
        bidCount: parseU64(bidCountRaw),
        highest: parseU64(highestRaw),
        second: parseU64(secondRaw),
        winnerHash: winnerRaw?.replace(/"/g, '') || '0field',
      })
    } catch {
      toast.error('Failed to query auction')
    } finally {
      setLookingUp(false)
    }
  }, [auctionId])

  const handleAction = useCallback(
    async (action: string) => {
      if (actionRef.current) return
      if (!connected) {
        toast.error('Please connect your wallet')
        return
      }
      const idFormatted = auctionId.endsWith('field')
        ? auctionId
        : `${auctionId}field`
      actionRef.current = true
      setSubmitting(action)
      setTxStatus('submitting')
      setTxError(null)
      setLastTxId(null)

      try {
        // Check public balance covers fee
        const feeMap: Record<string, number> = {
          close: MARKETPLACE_FEES.CLOSE_BIDDING,
          resolve: MARKETPLACE_FEES.RESOLVE_AUCTION,
          cancel: MARKETPLACE_FEES.CANCEL_AUCTION,
          reveal: MARKETPLACE_FEES.REVEAL_BID,
        }
        const feeAmount = feeMap[action] ?? 200_000
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
            if (!isNaN(pubBal) && pubBal < feeAmount) {
              toast.error(
                `Insufficient public balance. You need ~${(feeAmount / 1_000_000).toFixed(2)} ALEO for fees.`
              )
              setSubmitting(null)
              setTxStatus('idle')
              actionRef.current = false
              return
            }
          }
        } catch {
          // Non-critical
        }

        setTxStatus('pending')
        let txId: string | null = null

        switch (action) {
          case 'close': {
            txId = await execute(
              'close_bidding',
              [idFormatted],
              MARKETPLACE_FEES.CLOSE_BIDDING,
              MARKETPLACE_PROGRAM_ID
            )
            if (txId) toast.success('Bidding closed! Bidders can now reveal.')
            break
          }
          case 'reveal': {
            const bid = storedBids.find((b) => b.auctionId === idFormatted)
            if (!bid) {
              toast.error(
                'No stored bid found for this auction. You need the BidReceipt record from your wallet.'
              )
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
              [idFormatted, winnerAddr],
              MARKETPLACE_FEES.RESOLVE_AUCTION,
              MARKETPLACE_PROGRAM_ID
            )
            if (txId)
              toast.success(
                'Auction resolved! Winner pays Vickrey second-price.'
              )
            break
          }
          case 'cancel': {
            txId = await execute(
              'cancel_auction',
              [idFormatted],
              MARKETPLACE_FEES.CANCEL_AUCTION,
              MARKETPLACE_PROGRAM_ID
            )
            if (txId) toast.success('Auction cancelled.')
            break
          }
        }

        if (txId) {
          setLastTxId(txId)
          setTxStatus('confirmed')
          toast.info(
            'On-chain state updates in ~15-30s. Use refresh to check.',
            { duration: 6000 }
          )
          setTimeout(() => lookupAuction(), 15000)
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
    },
    [connected, auctionId, winnerAddr, storedBids, execute, lookupAuction, address]
  )

  return (
    <GlassCard className="!p-6 sm:!p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20">
          <Gavel className="w-5 h-5 text-amber-400" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Manage Auction</h3>
          <p className="text-xs text-white/50">
            Look up, close, reveal, resolve, or cancel
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* ── Browse Known Auctions ──────────────────────────────────────── */}
        {storedAuctions.length > 0 && (
          <div className="p-4 rounded-xl bg-gradient-to-b from-amber-500/[0.04] to-transparent border border-amber-500/10">
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-white">Known Auctions</span>
              <span className="text-[10px] text-white/60">({storedAuctions.length})</span>
            </div>
            <div className="space-y-2">
              {storedAuctions.map((auction) => (
                <div
                  key={auction.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-amber-500/20 transition-colors"
                >
                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left"
                    onClick={() => {
                      setAuctionId(auction.id)
                      setAuctionData(null)
                      setTxStatus('idle')
                    }}
                  >
                    <p className="text-xs font-medium text-white truncate">{auction.label}</p>
                    <p className="text-[10px] font-mono text-white/40 truncate">{auction.id}</p>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      onClick={() => handleShareAuction(auction.id)}
                      className="p-1.5 rounded-lg text-white/40 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                      title="Copy share URL"
                    >
                      {copiedShareUrl === auction.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setAuctionId(auction.id)
                        setAuctionData(null)
                        setTxStatus('idle')
                        // Auto-lookup
                        setTimeout(() => {
                          const btn = document.getElementById('auction-lookup-btn')
                          btn?.click()
                        }, 50)
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium hover:bg-amber-500/20 transition-all"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auction ID Lookup */}
        <div className="flex gap-2">
          <input
            type="text"
            value={auctionId}
            onChange={(e) => {
              setAuctionId(e.target.value)
              setAuctionData(null)
              setTxStatus('idle')
            }}
            placeholder="Auction ID (field) -- or select from above"
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/50"
          />
          <Button
            id="auction-lookup-btn"
            variant="secondary"
            className="rounded-xl shrink-0"
            onClick={lookupAuction}
            disabled={lookingUp || !auctionId}
          >
            {lookingUp ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </Button>
          {auctionData && (
            <Button
              variant="ghost"
              className="rounded-xl shrink-0"
              onClick={lookupAuction}
              disabled={lookingUp}
              title="Refresh on-chain data"
            >
              <RefreshCw
                className={`w-4 h-4 ${lookingUp ? 'animate-spin' : ''}`}
              />
            </Button>
          )}
        </div>

        {/* Auction Data Display */}
        <AnimatePresence>
          {auctionData && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={spring.gentle}
              className="overflow-hidden space-y-4"
            >
              {/* Lifecycle Stepper */}
              <AuctionLifecycleStepper currentStatus={auctionData.status} />

              {/* Data grid */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Status</span>
                  <AuctionStatusBadge status={auctionData.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Bids</span>
                  <span className="text-sm font-semibold text-white">
                    {auctionData.bidCount}
                  </span>
                </div>
                {auctionData.status >= AUCTION_STATUS.CLOSED && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/60">
                        Highest Revealed
                      </span>
                      <span className="text-sm font-mono text-white">
                        {auctionData.highest > 0
                          ? `${auctionData.highest}`
                          : '--'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/60">
                        Second Price (Vickrey)
                      </span>
                      <span className="text-sm font-mono text-white">
                        {auctionData.second > 0
                          ? `${auctionData.second}`
                          : '--'}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">Creator Hash</span>
                  <span className="text-xs font-mono text-white/50 truncate max-w-[180px]">
                    {auctionData.creatorHash}
                  </span>
                </div>

                {/* Action buttons — context-aware per status */}
                <div className="pt-3 border-t border-white/[0.06] space-y-2">
                  {auctionData.status === AUCTION_STATUS.OPEN && (
                    <>
                      {/* Privacy notice for open phase */}
                      <PrivacyNotice variant="bid" className="mb-2" />
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

                  {auctionData.status === AUCTION_STATUS.CLOSED && (
                    <div className="space-y-3">
                      {/* Privacy notice for reveal phase */}
                      <PrivacyNotice variant="reveal" />

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

                      {/* Resolve section */}
                      <div className="pt-2 border-t border-white/[0.04]">
                        <PrivacyNotice variant="resolve" className="mb-2" />
                        <input
                          type="text"
                          value={winnerAddr}
                          onChange={(e) => setWinnerAddr(e.target.value)}
                          placeholder="Winner address (aleo1...)"
                          className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/50 mb-2"
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

                  {auctionData.status === AUCTION_STATUS.RESOLVED && (
                    <div className="text-center py-3 space-y-2">
                      <p className="text-xs text-emerald-400 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Auction finalized via Vickrey settlement
                      </p>
                      {auctionData.winnerHash !== '0field' && (
                        <p className="text-xs text-white/50 font-mono truncate">
                          Winner hash: {auctionData.winnerHash}
                        </p>
                      )}
                      {auctionData.second > 0 && (
                        <div className="p-2.5 rounded-lg bg-violet-500/5 border border-violet-500/10">
                          <p className="text-xs text-white/50">
                            <span className="text-violet-400 font-medium">
                              Settlement price:{' '}
                            </span>
                            {auctionData.second} (second-highest bid)
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Privacy Dashboard */}
              <AuctionPrivacyDashboard status={auctionData.status} />

              {/* Transaction Progress */}
              {txStatus !== 'idle' && (
                <TransactionProgress
                  status={txStatus}
                  txId={lastTxId}
                  error={txError}
                />
              )}
            </m.div>
          )}
        </AnimatePresence>

        {/* Stored bids list */}
        {storedBids.length > 0 && (
          <div>
            <p className="text-xs font-medium text-white/50 mb-2">
              Your Stored Bids
            </p>
            <div className="space-y-2">
              {storedBids.map((bid) => (
                <button
                  key={bid.auctionId}
                  type="button"
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:border-white/[0.12] transition-colors text-left"
                  onClick={() => {
                    setAuctionId(bid.auctionId)
                    setAuctionData(null)
                    setTxStatus('idle')
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-white/60 truncate">
                      {bid.auctionId}
                    </p>
                    <p className="text-xs text-white/40">
                      Amount: {bid.amount} |{' '}
                      {new Date(bid.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <ArrowRight
                    className="w-3 h-3 text-white/20 shrink-0"
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  )
}
