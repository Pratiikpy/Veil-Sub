'use client'

import { useState, useEffect, useCallback, useReducer } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Users, Hash, Plus, Loader2, CheckCircle2, BadgeCheck, RefreshCw } from 'lucide-react'
import { useContractExecute } from '@/hooks/useContractExecute'
import { FEATURED_CREATORS, getCreatorHash, CREATOR_HASH_MAP } from '@/lib/config'
import { shortenAddress, isValidAleoAddress } from '@/lib/utils'
import { spring, staggerContainer, staggerItem } from '@/lib/motion'
import Skeleton from '@/components/ui/Skeleton'
import { SOCIAL_PROGRAM_ID, SOCIAL_FEES, TIER_OPTIONS } from './constants'
import { NotConnectedCard } from './SharedComponents'

interface ChatRoom {
  creatorHash: string
  roomId: number
  minTier: number
  memberCount: number
  creatorAddress?: string
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

  // Scan known creators for rooms
  useEffect(() => {
    let cancelled = false
    async function scanRooms() {
      const foundRooms: ChatRoom[] = []
      const creatorEntries = Object.entries(CREATOR_HASH_MAP)

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
              foundRooms.push({ creatorHash: hash, roomId, minTier, memberCount, creatorAddress: addr })
            }
            break // Only first room per creator
          } catch {
            // Continue scanning
          }
        }
      }

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
        toast.success('Chat room created! Room list will refresh after finalize.', { description: `Room #${roomIdNum} -- TX: ${txId.slice(0, 16)}...` })
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
  }, [creatorHash, newRoomId, newRoomMinTier, creating, execute])

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
        toast.success('Joined chat room! Member count will update after finalize.', { description: `Room #${roomIdNum} -- TX: ${txId.slice(0, 16)}...` })
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

  if (!connected) {
    return <NotConnectedCard message="Connect your wallet to create or join on-chain chat rooms." />
  }

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
      {/* Room List */}
      <motion.div variants={staggerItem} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-white">Chat Rooms</h3>
            <button
              onClick={() => { setLoading(true); forceRefresh() }}
              className="p-1 rounded-lg text-white/50 hover:text-white/70 transition-colors"
              title="Refresh room list"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          {creatorHash && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/60 hover:text-white hover:border-white/[0.16] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Room
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-10">
            <Users className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/50">No chat rooms discovered</p>
            <p className="text-xs text-white/60 mt-1">Create one or join by entering room details below</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map(room => {
              const creatorLabel = room.creatorAddress
                ? FEATURED_CREATORS.find(c => c.address === room.creatorAddress)?.label || shortenAddress(room.creatorAddress)
                : 'Unknown Creator'
              return (
                <motion.div
                  key={`${room.creatorHash}-${room.roomId}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                    <Hash className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {creatorLabel} -- Room #{room.roomId}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-white/60">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {room.memberCount} member{room.memberCount !== 1 ? 's' : ''}
                      </span>
                      <span>Min Tier: {room.minTier}</span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Create Room Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring.gentle}
            className="overflow-hidden"
          >
            <div className="rounded-2xl bg-white/[0.02] border border-violet-500/10 p-5">
              <h3 className="text-sm font-medium text-violet-300 mb-4">Create New Chat Room</h3>
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

      {/* Join Room Form */}
      <motion.div variants={staggerItem} className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
        <h3 className="text-sm font-medium text-white mb-4">Join a Chat Room</h3>
        <div className="space-y-3">
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
        toast.success('Membership proved on-chain!')
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
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-emerald-400 font-medium">Membership proved!</p>
              <p className="text-xs text-white/60 font-mono truncate">{txId}</p>
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
