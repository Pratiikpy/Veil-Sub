'use client'

import { useState, useEffect, useCallback, useReducer } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Users, Hash, Plus, Loader2, CheckCircle2, BadgeCheck, RefreshCw, ArrowRight, Search } from 'lucide-react'
import { useContractExecute } from '@/hooks/useContractExecute'
import { FEATURED_CREATORS, getCreatorHash, CREATOR_HASH_MAP } from '@/lib/config'
import { shortenAddress, isValidAleoAddress, computeWalletHash } from '@/lib/utils'
import { spring, staggerContainer, staggerItem } from '@/lib/motion'
import Skeleton from '@/components/ui/Skeleton'
import AddressAvatar from '@/components/ui/AddressAvatar'
import { SOCIAL_PROGRAM_ID, SOCIAL_FEES, TIER_OPTIONS } from './constants'
import { NotConnectedCard } from './SharedComponents'

interface ChatRoom {
  creatorHash: string
  roomId: number
  minTier: number
  memberCount: number
  creatorAddress?: string
}

// ─── Shared Chat Room Registry ──────────────────────────────────────────────
// Saved to localStorage so the discovery section can find rooms without
// needing to compute Poseidon2 hashes in JS.

interface SharedChatRoom {
  creatorAddress: string
  creatorHash: string
  roomId: number
  minTier: number
  timestamp: number
}

const SHARED_ROOMS_KEY = 'veilsub_chat_rooms'

function saveSharedChatRoom(room: SharedChatRoom): void {
  if (typeof window === 'undefined') return
  try {
    const existing = JSON.parse(localStorage.getItem(SHARED_ROOMS_KEY) || '[]') as SharedChatRoom[]
    // Deduplicate by creatorAddress + roomId
    const filtered = existing.filter(
      r => !(r.creatorAddress === room.creatorAddress && r.roomId === room.roomId)
    )
    filtered.push(room)
    localStorage.setItem(SHARED_ROOMS_KEY, JSON.stringify(filtered))
  } catch { /* localStorage unavailable */ }
}

function getSharedChatRooms(): SharedChatRoom[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(SHARED_ROOMS_KEY) || '[]') as SharedChatRoom[]
  } catch { return [] }
}

export default function ChatRoomsSection() {
  const { address, connected } = useWallet()
  const { execute } = useContractExecute()
  const creatorHash = address ? getCreatorHash(address) : null

  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState<string | null>(null)
  const [refreshKey, forceRefresh] = useReducer((x: number) => x + 1, 0)

  // Create room form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newRoomId, setNewRoomId] = useState('')
  const [newRoomMinTier, setNewRoomMinTier] = useState(1)

  // Join room form
  const [joinCreatorAddr, setJoinCreatorAddr] = useState('')
  const [joinRoomId, setJoinRoomId] = useState('')
  const [joinTier, setJoinTier] = useState(1)
  const [joinExpiry, setJoinExpiry] = useState('')
  const [showJoinForm, setShowJoinForm] = useState(false)

  // Check if current user already has a room (for duplicate prevention)
  const userHasRoom = rooms.some(r => r.creatorAddress === address)

  // Scan known creators for rooms + check shared localStorage registry
  useEffect(() => {
    let cancelled = false
    async function scanRooms() {
      const foundRooms: ChatRoom[] = []
      const seenKeys = new Set<string>()
      const creatorEntries = Object.entries(CREATOR_HASH_MAP)

      // 1. Scan on-chain via CREATOR_HASH_MAP (existing behavior)
      for (const [addr, hash] of creatorEntries) {
        for (let roomId = 1; roomId <= 5; roomId++) {
          try {
            const existsRes = await fetch(
              `/api/aleo/program/${SOCIAL_PROGRAM_ID}/mapping/chat_room_exists/${hash}`
            )
            if (!existsRes.ok) continue
            const existsText = await existsRes.text()
            if (!existsText.includes('true')) continue

            const memberRes = await fetch(
              `/api/aleo/program/${SOCIAL_PROGRAM_ID}/mapping/chat_member_count/${hash}`
            )
            const memberText = memberRes.ok ? await memberRes.text() : '0'
            const memberCount = parseInt(memberText.replace(/"/g, '').replace(/u\d+$/,'').trim(), 10) || 0

            const tierRes = await fetch(
              `/api/aleo/program/${SOCIAL_PROGRAM_ID}/mapping/chat_room_min_tier/${hash}`
            )
            const tierText = tierRes.ok ? await tierRes.text() : '1'
            const minTier = parseInt(tierText.replace(/"/g, '').replace(/u\d+$/,'').trim(), 10) || 1

            if (!cancelled) {
              const key = `${addr}-${roomId}`
              seenKeys.add(key)
              foundRooms.push({ creatorHash: hash, roomId, minTier, memberCount, creatorAddress: addr })
            }
            break // Only first room per creator
          } catch {
            // Continue scanning
          }
        }
      }

      // 2. Merge rooms from shared localStorage registry (catches rooms
      //    from creators not yet in CREATOR_HASH_MAP)
      const sharedRooms = getSharedChatRooms()
      for (const sr of sharedRooms) {
        const key = `${sr.creatorAddress}-${sr.roomId}`
        if (seenKeys.has(key)) continue
        seenKeys.add(key)
        foundRooms.push({
          creatorHash: sr.creatorHash,
          roomId: sr.roomId,
          minTier: sr.minTier,
          memberCount: 0,
          creatorAddress: sr.creatorAddress,
        })
      }

      // 3. Merge rooms from global Supabase registry (cross-device discovery)
      try {
        const regRes = await fetch('/api/registry?type=chat_room')
        if (regRes.ok) {
          const regData = await regRes.json()
          if (regData?.entries) {
            for (const entry of regData.entries) {
              const roomIdMatch = entry.item_id?.match(/^room_(\d+)$/)
              if (!roomIdMatch) continue
              const roomId = parseInt(roomIdMatch[1], 10)
              const key = `${entry.creator_address}-${roomId}`
              if (seenKeys.has(key)) continue
              seenKeys.add(key)
              const meta = entry.metadata || {}
              foundRooms.push({
                creatorHash: meta.creatorHash || '',
                roomId,
                minTier: meta.minTier || 1,
                memberCount: 0,
                creatorAddress: entry.creator_address,
              })
            }
          }
        }
      } catch { /* registry fetch failed — local data still available */ }

      if (!cancelled) {
        setRooms(foundRooms)
        setLoading(false)
      }
    }
    scanRooms()
    return () => { cancelled = true }
  }, [refreshKey])

  const handleCreateRoom = useCallback(async () => {
    if (!creatorHash || creating) return
    const roomIdNum = parseInt(newRoomId, 10)
    if (isNaN(roomIdNum) || roomIdNum < 1 || roomIdNum > 255) {
      toast.error('Room ID must be between 1 and 255')
      return
    }

    setCreating(true)
    try {
      // Check public balance covers fee
      try {
        const pubRes = await fetch(`/api/aleo/program/credits.aleo/mapping/account/${encodeURIComponent(address || '')}`)
        if (pubRes.ok) {
          const pubText = await pubRes.text()
          const pubBal = parseInt(pubText.replace(/"/g, '').replace(/u\d+$/, '').trim(), 10)
          if (!isNaN(pubBal) && pubBal < SOCIAL_FEES.CREATE_CHAT_ROOM) {
            toast.error(`Insufficient public balance. You need ~${(SOCIAL_FEES.CREATE_CHAT_ROOM / 1_000_000).toFixed(2)} ALEO for fees. Get testnet credits from the faucet.`)
            setCreating(false)
            return
          }
        }
      } catch {
        // Non-critical — proceed and let the wallet handle it
      }

      const txId = await execute(
        'create_chat_room',
        [`${creatorHash}`, `${roomIdNum}u8`, `${newRoomMinTier}u8`],
        SOCIAL_FEES.CREATE_CHAT_ROOM,
        SOCIAL_PROGRAM_ID,
      )
      if (txId) {
        // Save to shared registry so other users can discover this room
        saveSharedChatRoom({
          creatorAddress: address || '',
          creatorHash,
          roomId: roomIdNum,
          minTier: newRoomMinTier,
          timestamp: Date.now(),
        })

        // Save to global Supabase registry for cross-device discovery
        try {
          const regHash = await computeWalletHash(address || '')
          await fetch('/api/registry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'chat_room',
              creatorAddress: address,
              itemId: `room_${roomIdNum}`,
              label: `Chat Room #${roomIdNum}`,
              metadata: { minTier: newRoomMinTier, creatorHash, txId },
              walletAddress: address,
              walletHash: regHash,
              timestamp: Date.now(),
            }),
          })
        } catch { /* best-effort registry save */ }

        toast.success('Chat room submitted! Confirming on-chain (~15-30s). Check AleoScan to verify.', { description: `Room #${roomIdNum} -- TX: ${txId.slice(0, 16)}...`, duration: 8000 })

        // Auto-announce chat room in creator's feed (best-effort)
        if (address) {
          try {
            const walletHash = await computeWalletHash(address)
            const tierLabel = TIER_OPTIONS.find(t => t.value === newRoomMinTier)?.label || `Tier ${newRoomMinTier}`
            await fetch('/api/posts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                creator: address,
                walletHash,
                timestamp: Date.now(),
                title: '',
                body: `Chat Room #${roomIdNum} is now open! Join in the Social page, Chat Rooms tab.\n\nMin tier: ${tierLabel}\n\nMembership is proven via ZK circuit -- your address is never revealed to other members.`,
                postType: 'note',
                minTier: 0,
              }),
            })
          } catch { /* best-effort announcement */ }
        }

        setShowCreateForm(false)
        setNewRoomId('')
        setTimeout(() => { setLoading(true); forceRefresh() }, 15000)
      }
    } catch (err) {
      toast.error('Failed to create room', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setCreating(false)
    }
  }, [creatorHash, newRoomId, newRoomMinTier, creating, execute, address])

  const handleJoinRoom = useCallback(async () => {
    if (!address || !joinCreatorAddr || !joinRoomId || joining) return
    if (!isValidAleoAddress(joinCreatorAddr)) {
      toast.error('Invalid creator address')
      return
    }
    const roomIdNum = parseInt(joinRoomId, 10)
    if (isNaN(roomIdNum) || roomIdNum < 1 || roomIdNum > 255) {
      toast.error('Room ID must be 1-255')
      return
    }
    const expiryNum = parseInt(joinExpiry, 10)
    if (isNaN(expiryNum) || expiryNum <= 0) {
      toast.error('Enter a valid subscription expiry block height')
      return
    }

    setJoining(joinRoomId)
    try {
      // Check public balance covers fee
      try {
        const pubRes = await fetch(`/api/aleo/program/credits.aleo/mapping/account/${encodeURIComponent(address || '')}`)
        if (pubRes.ok) {
          const pubText = await pubRes.text()
          const pubBal = parseInt(pubText.replace(/"/g, '').replace(/u\d+$/, '').trim(), 10)
          if (!isNaN(pubBal) && pubBal < SOCIAL_FEES.JOIN_CHAT_ROOM) {
            toast.error(`Insufficient public balance. You need ~${(SOCIAL_FEES.JOIN_CHAT_ROOM / 1_000_000).toFixed(2)} ALEO for fees. Get testnet credits from the faucet.`)
            setJoining(null)
            return
          }
        }
      } catch {
        // Non-critical — proceed and let the wallet handle it
      }

      const txId = await execute(
        'join_chat_room',
        [joinCreatorAddr, `${roomIdNum}u8`, `${joinTier}u8`, `${expiryNum}u32`],
        SOCIAL_FEES.JOIN_CHAT_ROOM,
        SOCIAL_PROGRAM_ID,
      )
      if (txId) {
        toast.success('Join room submitted! Confirming on-chain (~15-30s). Check AleoScan to verify.', { description: `Room #${roomIdNum} -- TX: ${txId.slice(0, 16)}...`, duration: 8000 })
        setJoinCreatorAddr('')
        setJoinRoomId('')
        setJoinExpiry('')
        setTimeout(() => { setLoading(true); forceRefresh() }, 15000)
      }
    } catch (err) {
      toast.error('Failed to join room', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setJoining(null)
    }
  }, [address, joinCreatorAddr, joinRoomId, joinTier, joinExpiry, joining, execute])

  // Pre-fill join form from a discovered room
  const handleJoinFromDiscovery = useCallback((room: ChatRoom) => {
    if (room.creatorAddress) {
      setJoinCreatorAddr(room.creatorAddress)
    }
    setJoinRoomId(String(room.roomId))
    setJoinTier(room.minTier)
    setShowJoinForm(true)
    // Scroll the join form into view after state update
    setTimeout(() => {
      document.getElementById('join-room-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }, [])

  if (!connected) {
    return <NotConnectedCard message="Connect your wallet to create or join on-chain chat rooms." />
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
      {/* ── Discover Active Rooms ────────────────────────────────────────── */}
      <motion.div variants={staggerItem} className="rounded-2xl bg-gradient-to-b from-violet-500/[0.04] to-transparent border border-violet-500/10 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Search className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Discover Chat Rooms</h3>
              <p className="text-[11px] text-white/50">Active rooms from known creators on-chain</p>
            </div>
          </div>
          <button
            onClick={() => { setLoading(true); forceRefresh() }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white/50 hover:text-white/70 hover:bg-white/[0.04] transition-all text-xs"
            title="Refresh room list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/50">No chat rooms discovered yet</p>
            <p className="text-xs text-white/60 mt-1">Be the first to create one, or join by entering room details below</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map(room => {
              const featured = room.creatorAddress
                ? FEATURED_CREATORS.find(c => c.address === room.creatorAddress)
                : null
              const creatorLabel = featured?.label || (room.creatorAddress ? shortenAddress(room.creatorAddress) : 'Unknown Creator')
              const isOwnRoom = room.creatorAddress === address
              return (
                <motion.div
                  key={`${room.creatorHash}-${room.roomId}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-violet-500/20 transition-all group"
                >
                  {room.creatorAddress ? (
                    <AddressAvatar address={room.creatorAddress} size={40} />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                      <Hash className="w-5 h-5 text-violet-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {creatorLabel}
                      {isOwnRoom && <span className="ml-2 text-[10px] text-violet-400 font-normal">(Your Room)</span>}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-white/50 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {room.memberCount} member{room.memberCount !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Min Tier {room.minTier}
                      </span>
                      <span className="text-white/60">Room #{room.roomId}</span>
                    </div>
                  </div>
                  {!isOwnRoom && (
                    <button
                      onClick={() => handleJoinFromDiscovery(room)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-500/15 border border-violet-500/25 text-violet-200 text-xs font-medium hover:bg-violet-500/25 hover:border-violet-500/40 transition-all shrink-0 group-hover:border-violet-500/40"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Join
                    </button>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* ── Create Room ──────────────────────────────────────────────────── */}
      {creatorHash && (
        <motion.div variants={staggerItem}>
          {userHasRoom ? (
            <div className="flex items-center gap-2 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-white/50">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>You already have an active chat room. Only one room per creator is supported.</span>
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-white">Create New Room</span>
                    <p className="text-[11px] text-white/50">Open a gated chat room for your subscribers</p>
                  </div>
                </div>
                <ArrowRight className={`w-4 h-4 text-white/60 transition-transform ${showCreateForm ? 'rotate-90' : ''}`} />
              </button>
              <AnimatePresence>
                {showCreateForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={spring.gentle}
                    className="overflow-hidden"
                  >
                    <div className="rounded-2xl bg-white/[0.02] border border-violet-500/10 p-5 mt-2">
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <label htmlFor="room-id" className="block text-xs text-white/50 mb-1.5">Room ID (1-255)</label>
                          <input
                            id="room-id"
                            type="number"
                            min="1"
                            max="255"
                            value={newRoomId}
                            onChange={e => setNewRoomId(e.target.value)}
                            placeholder="1"
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-violet-500/40 transition-colors"
                          />
                        </div>
                        <div>
                          <label htmlFor="room-tier" className="block text-xs text-white/50 mb-1.5">Min Tier</label>
                          <select
                            id="room-tier"
                            value={newRoomMinTier}
                            onChange={e => setNewRoomMinTier(parseInt(e.target.value, 10))}
                            className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/40 transition-colors"
                          >
                            {TIER_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value} className="bg-zinc-900">{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={handleCreateRoom}
                        disabled={creating || !newRoomId}
                        className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-200 font-medium text-sm hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        {creating ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                        ) : (
                          <><Plus className="w-4 h-4" /> Create Room</>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>
      )}

      {/* ── Join Room Form ────────────────────────────────────────────────── */}
      <motion.div id="join-room-form" variants={staggerItem} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
        <button
          onClick={() => setShowJoinForm(!showJoinForm)}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="text-sm font-medium text-white">Join a Chat Room</h3>
          <ArrowRight className={`w-4 h-4 text-white/60 transition-transform ${showJoinForm ? 'rotate-90' : ''}`} />
        </button>

        {joinCreatorAddr && !showJoinForm && (
          <p className="text-xs text-violet-400 mt-1">
            Pre-filled from discovery -- click to expand
          </p>
        )}

        <AnimatePresence>
          {showJoinForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={spring.gentle}
              className="overflow-hidden"
            >
              <div className="space-y-3 mt-4">
                <div>
                  <label htmlFor="join-creator" className="block text-xs text-white/50 mb-1.5">Creator address</label>
                  <input
                    id="join-creator"
                    type="text"
                    value={joinCreatorAddr}
                    onChange={e => setJoinCreatorAddr(e.target.value)}
                    placeholder="aleo1..."
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/50 font-mono focus:outline-none focus:border-violet-500/40 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="join-room-id" className="block text-xs text-white/50 mb-1.5">Room ID</label>
                    <input
                      id="join-room-id"
                      type="number"
                      min="1"
                      max="255"
                      value={joinRoomId}
                      onChange={e => setJoinRoomId(e.target.value)}
                      placeholder="1"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-violet-500/40 transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="join-tier" className="block text-xs text-white/50 mb-1.5">Your Tier</label>
                    <select
                      id="join-tier"
                      value={joinTier}
                      onChange={e => setJoinTier(parseInt(e.target.value, 10))}
                      className="w-full appearance-none bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/40 transition-colors"
                    >
                      {TIER_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value} className="bg-zinc-900">{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="join-expiry" className="block text-xs text-white/50 mb-1.5">Sub Expiry</label>
                    <input
                      id="join-expiry"
                      type="number"
                      value={joinExpiry}
                      onChange={e => setJoinExpiry(e.target.value)}
                      placeholder="Block #"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-violet-500/40 transition-colors"
                    />
                  </div>
                </div>
                <button
                  onClick={handleJoinRoom}
                  disabled={!!joining || !joinCreatorAddr || !joinRoomId || !joinExpiry}
                  className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-200 font-medium text-sm hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {joining ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Joining...</>
                  ) : (
                    <><Users className="w-4 h-4" /> Join Room</>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 mt-4 text-[11px] text-white/60">
                <Shield className="w-3 h-3 shrink-0" />
                <span>
                  Membership is proven via ZK circuit -- your address is never revealed to other members.
                  You receive a ChatMembership struct as proof.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Prove Chat Membership */}
      <ProveMembershipSection />
    </motion.div>
  )
}

// ─── Prove Chat Membership ─────────────────────────────────────────────────

function ProveMembershipSection() {
  const { execute, connected, address } = useContractExecute()
  const [creatorHash, setCreatorHash] = useState('')
  const [roomId, setRoomId] = useState('')
  const [proving, setProving] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)

  const handleProve = useCallback(async () => {
    if (!connected) {
      toast.error('Connect your wallet first')
      return
    }
    if (!creatorHash) {
      toast.error('Enter the creator hash')
      return
    }
    const rid = parseInt(roomId, 10)
    if (isNaN(rid) || rid < 1 || rid > 255) {
      toast.error('Room ID must be between 1 and 255')
      return
    }

    setProving(true)
    setTxId(null)
    try {
      // Check public balance covers fee
      try {
        const pubRes = await fetch(`/api/aleo/program/credits.aleo/mapping/account/${encodeURIComponent(address || '')}`)
        if (pubRes.ok) {
          const pubText = await pubRes.text()
          const pubBal = parseInt(pubText.replace(/"/g, '').replace(/u\d+$/, '').trim(), 10)
          if (!isNaN(pubBal) && pubBal < SOCIAL_FEES.JOIN_CHAT_ROOM) {
            toast.error(`Insufficient public balance. You need ~${(SOCIAL_FEES.JOIN_CHAT_ROOM / 1_000_000).toFixed(2)} ALEO for fees. Get testnet credits from the faucet.`)
            setProving(false)
            return
          }
        }
      } catch {
        // Non-critical — proceed and let the wallet handle it
      }

      const result = await execute(
        'prove_chat_membership',
        [creatorHash, `${rid}u8`],
        SOCIAL_FEES.JOIN_CHAT_ROOM,
        SOCIAL_PROGRAM_ID,
      )
      if (result) {
        setTxId(result)
        toast.success('Membership proof submitted! Confirming on-chain (~15-30s). Check AleoScan to verify.', { duration: 8000 })
      }
    } catch (err) {
      toast.error('Membership proof failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setProving(false)
    }
  }, [connected, creatorHash, roomId, execute])

  return (
    <motion.div variants={staggerItem} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
      <h3 className="text-sm font-medium text-white mb-1 flex items-center gap-2">
        <BadgeCheck className="w-4 h-4 text-emerald-400" />
        Prove Chat Membership
      </h3>
      <p className="text-xs text-white/60 mb-4">
        Generate a zero-knowledge proof that you are a member of a chat room without revealing your identity.
      </p>

      <div className="space-y-3">
        <div>
          <label htmlFor="prove-creator-hash" className="block text-xs text-white/50 mb-1.5">Creator Hash (field)</label>
          <input
            id="prove-creator-hash"
            type="text"
            value={creatorHash}
            onChange={e => setCreatorHash(e.target.value)}
            placeholder="Creator hash of the room owner"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/50 font-mono focus:outline-none focus:border-emerald-500/40 transition-colors"
          />
        </div>
        <div>
          <label htmlFor="prove-room-id" className="block text-xs text-white/50 mb-1.5">Room ID (1-255)</label>
          <input
            id="prove-room-id"
            type="number"
            min="1"
            max="255"
            value={roomId}
            onChange={e => setRoomId(e.target.value)}
            placeholder="1"
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-emerald-500/40 transition-colors"
          />
        </div>
        <button
          onClick={handleProve}
          disabled={proving || !connected || !creatorHash || !roomId}
          className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 font-medium text-sm hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {proving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Proving...</>
          ) : (
            <><BadgeCheck className="w-4 h-4" /> Prove Membership</>
          )}
        </button>

        {txId && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/15">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-amber-400 font-medium">Proof submitted -- verify on AleoScan</p>
              <p className="text-xs text-white/60 font-mono truncate">{txId}</p>
              <p className="text-[11px] text-white/40 mt-1">Shield Wallet uses delegated proving. Check AleoScan to verify final status.</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-4 text-[11px] text-white/60">
        <Shield className="w-3 h-3 shrink-0" />
        <span>
          The ZK proof verifies you are a room member without revealing your address.
          Only the Poseidon2 nullifier is stored on-chain.
        </span>
      </div>
    </motion.div>
  )
}
