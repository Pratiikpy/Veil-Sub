'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import {
  MessageCircle,
  Send,
  Shield,
  Lock,
  ArrowLeft,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { m, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { computeWalletHash, shortenAddress } from '@/lib/utils'
import { encryptContent, decryptContent, isE2EEncrypted } from '@/lib/e2eEncryption'
import { useWalletRecords } from '@/hooks/useWalletRecords'
import { parseAccessPass } from '@/lib/utils'
import { FEATURED_CREATORS, ALEO_ADDRESS_RE } from '@/lib/config'
import PageTransition from '@/components/PageTransition'
import AddressAvatar from '@/components/ui/AddressAvatar'
import { useUnreadMessages } from '@/hooks/useUnreadMessages'

// ---- Types ----

interface Message {
  id: string
  creator_address: string
  thread_id: string
  sender_type: 'subscriber' | 'creator'
  tier: number | null
  content: string
  created_at: string
}

interface Thread {
  thread_id: string
  tier: number | null
  last_message: string
  last_sender_type: string
  last_message_at: string
  message_count: number
}

// ---- Helpers ----

const ANON_SALT = 'veilsub-msg-anon-v1'

/** Compute a per-creator anonymous ID: SHA-256(wallet + creator + salt) */
async function computeMessageAnonId(walletAddress: string, creatorAddress: string): Promise<string> {
  const data = new TextEncoder().encode(walletAddress + creatorAddress + ANON_SALT)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return 'now'
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Tier-based styles matching PostComments */
const TIER_STYLES: Record<number, { bg: string; text: string; border: string; label: string }> = {
  1: { bg: 'bg-violet-500/10', text: 'text-violet-300', border: 'border-violet-500/20', label: 'Supporter' },
  2: { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/20', label: 'Premium' },
  3: { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/20', label: 'VIP' },
}

function getTierStyle(tier: number) {
  return TIER_STYLES[tier] || TIER_STYLES[1]
}

function getTierLabel(tier: number): string {
  const names: Record<number, string> = { 1: 'Supporter', 2: 'Premium', 3: 'VIP' }
  return `Tier ${tier} ${names[tier] || 'Subscriber'}`
}

function getCreatorDisplayName(address: string): string {
  const featured = FEATURED_CREATORS.find(c => c.address === address)
  return featured?.label || shortenAddress(address)
}

// ---- Main Component ----

export default function MessagesPage() {
  const { connected, address } = useWallet()
  const searchParams = useSearchParams()
  const creatorParam = searchParams.get('creator')
  const threadParam = searchParams.get('thread')
  const peerParam = searchParams.get('peer')
  const { getAccessPasses } = useWalletRecords()
  const { refreshUnread } = useUnreadMessages()

  // State
  const [threads, setThreads] = useState<Thread[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [decryptedMessages, setDecryptedMessages] = useState<Map<string, string>>(new Map())
  const [activeThread, setActiveThread] = useState<string | null>(threadParam || null)
  const [activeCreator, setActiveCreator] = useState<string | null>(creatorParam || null)
  const [activeTier, setActiveTier] = useState<number | null>(null)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingThreads, setLoadingThreads] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [isCreator, setIsCreator] = useState(false)
  const [userPasses, setUserPasses] = useState<{ creator: string; tier: number }[]>([])
  const [anonId, setAnonId] = useState<string | null>(null)
  const [mobileShowThread, setMobileShowThread] = useState(!!threadParam)
  const [isPeerThread, setIsPeerThread] = useState(peerParam === 'true')

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Track message IDs sent by current user (for peer mode message ownership)
  const sentMessageIdsRef = useRef<Set<string>>(new Set())
  const prevAddressRef = useRef(address)
  // PC-3: Double-click guard for sendMessage
  const sendingRef = useRef(false)

  // Reset all messaging state when wallet address changes (DI-1)
  useEffect(() => {
    if (prevAddressRef.current !== address) {
      prevAddressRef.current = address
      setThreads([])
      setMessages([])
      setDecryptedMessages(new Map())
      setActiveThread(null)
      setActiveCreator(null)
      setAnonId(null)
      setMobileShowThread(false)
      sentMessageIdsRef.current = new Set()
    }
  }, [address])

  // Determine if the current user is a creator (when viewing their own inbox)
  useEffect(() => {
    if (connected && address && activeCreator) {
      setIsCreator(address === activeCreator)
    } else {
      setIsCreator(false)
    }
  }, [connected, address, activeCreator])

  // Load user's access passes to determine which creators they can message
  useEffect(() => {
    if (!connected) {
      setUserPasses([])
      return
    }
    let cancelled = false
    async function loadPasses() {
      try {
        const passTexts = await getAccessPasses()
        if (cancelled) return
        const parsed = passTexts
          .map(p => parseAccessPass(p))
          .filter((p): p is NonNullable<typeof p> => p !== null)
          .map(p => ({ creator: p.creator, tier: p.tier }))
        setUserPasses(parsed)
      } catch {
        // Silently fail — passes are optional for creators viewing their inbox
      }
    }
    loadPasses()
    return () => { cancelled = true }
  }, [connected, getAccessPasses])

  // Compute anon_id when creator and wallet are known (subscriber mode)
  useEffect(() => {
    if (!address || !activeCreator || isCreator) {
      setAnonId(null)
      return
    }
    let cancelled = false
    computeMessageAnonId(address, activeCreator).then(id => {
      if (!cancelled) setAnonId(id)
    })
    return () => { cancelled = true }
  }, [address, activeCreator, isCreator])

  // Set active tier from passes when creator changes
  useEffect(() => {
    if (activeCreator && !isCreator) {
      const pass = userPasses.find(p => p.creator === activeCreator)
      setActiveTier(pass?.tier ?? null)
    }
  }, [activeCreator, isCreator, userPasses])

  // Auto-select thread for subscriber (they only have one thread per creator)
  useEffect(() => {
    if (anonId && !isCreator && activeCreator) {
      setActiveThread(anonId)
      setMobileShowThread(true)
    }
  }, [anonId, isCreator, activeCreator])

  // Build auth query params for GET requests (SEC-3)
  const buildAuthParams = useCallback(async () => {
    if (!address) return ''
    try {
      const walletHash = await computeWalletHash(address)
      const timestamp = Date.now()
      return `&walletAddress=${encodeURIComponent(address)}&walletHash=${encodeURIComponent(walletHash)}&timestamp=${timestamp}`
    } catch {
      return ''
    }
  }, [address])

  // Fetch threads (creator view) or subscriber messages
  const fetchThreads = useCallback(async () => {
    if (!activeCreator) return
    setLoadingThreads(true)
    try {
      const authParams = await buildAuthParams()
      const url = `/api/messages?creator=${encodeURIComponent(activeCreator)}${authParams}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        if (data.threads) {
          setThreads(data.threads)
        }
      }
    } catch {
      toast.error('Could not load messages. Please try again.')
    } finally {
      setLoadingThreads(false)
    }
  }, [activeCreator, buildAuthParams])

  // Fetch messages for a specific thread
  const fetchMessages = useCallback(async () => {
    if (!activeCreator || !activeThread) return
    setLoadingMessages(true)
    try {
      const authParams = await buildAuthParams()
      // For peer threads or creator view, use ?thread=; for subscriber-to-creator, use ?subscriber=
      const useThreadParam = isCreator || isPeerThread
      const url = useThreadParam
        ? `/api/messages?creator=${encodeURIComponent(activeCreator)}&thread=${encodeURIComponent(activeThread)}${authParams}`
        : `/api/messages?creator=${encodeURIComponent(activeCreator)}&subscriber=${encodeURIComponent(activeThread)}${authParams}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        if (data.messages) {
          setMessages(data.messages)
        }
      }
    } catch {
      toast.error('Could not load messages. Please try again.')
    } finally {
      setLoadingMessages(false)
    }
  }, [activeCreator, activeThread, isCreator, isPeerThread, buildAuthParams])

  // Load threads on mount / creator change
  useEffect(() => {
    if (isCreator) {
      fetchThreads()
    }
  }, [isCreator, fetchThreads])

  // Load messages when thread changes
  useEffect(() => {
    if (activeThread) {
      fetchMessages()
    }
  }, [activeThread, fetchMessages])

  // Mark thread as read when opened
  useEffect(() => {
    if (!activeThread || !activeCreator || !address) return
    let cancelled = false
    async function markRead() {
      try {
        const walletHash = await computeWalletHash(address!)
        const timestamp = Date.now()
        await fetch('/api/messages', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletHash,
            creatorAddress: activeCreator,
            threadId: activeThread,
            walletAddress: address,
            timestamp,
          }),
        })
        if (!cancelled) refreshUnread()
      } catch {
        // Non-critical failure
      }
    }
    markRead()
    return () => { cancelled = true }
  }, [activeThread, activeCreator, address, refreshUnread])

  // Decrypt messages when they change
  useEffect(() => {
    if (messages.length === 0) return
    // Find the tier for this thread
    const threadTier = activeTier || messages.find(m => m.tier)?.tier || 1
    if (!activeCreator) return

    let cancelled = false
    async function decrypt() {
      const newDecrypted = new Map<string, string>()
      for (const msg of messages) {
        if (isE2EEncrypted(msg.content)) {
          try {
            const plaintext = await decryptContent(msg.content, activeCreator!, threadTier)
            if (!cancelled) newDecrypted.set(msg.id, plaintext)
          } catch {
            if (!cancelled) newDecrypted.set(msg.id, '[Unable to decrypt]')
          }
        } else {
          newDecrypted.set(msg.id, msg.content)
        }
      }
      if (!cancelled) setDecryptedMessages(newDecrypted)
    }
    decrypt()
    return () => { cancelled = true }
  }, [messages, activeCreator, activeTier])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [decryptedMessages])

  // Send a message
  const sendMessage = useCallback(async () => {
    if (!messageText.trim() || !activeCreator || !address || sending) return
    if (sendingRef.current) return
    sendingRef.current = true

    const senderType = isCreator ? 'creator' : 'subscriber'
    // For peer threads, use activeThread (the pre-computed peer hash)
    // For creator replying, use activeThread
    // For subscriber messaging creator, use anonId
    const threadId = isCreator ? activeThread : (isPeerThread ? activeThread : anonId)
    if (!threadId) {
      toast.error('Cannot determine conversation thread')
      return
    }

    // Subscribers must have an active pass
    const tier = isCreator ? null : activeTier
    if (!isCreator && !tier) {
      toast.error('You need an active subscription to message this creator')
      return
    }

    // Optimistic: show message immediately
    const optimisticId = `optimistic_${Date.now()}`
    const plaintext = messageText.trim()
    const optimisticMsg: Message = {
      id: optimisticId,
      creator_address: activeCreator,
      thread_id: threadId!,
      sender_type: senderType as 'subscriber' | 'creator',
      tier: senderType === 'subscriber' ? (tier ?? null) : null,
      content: plaintext,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimisticMsg])
    setDecryptedMessages(prev => {
      const next = new Map(prev)
      next.set(optimisticId, plaintext)
      return next
    })
    const savedText = messageText.trim()
    setMessageText('')
    setTimeout(() => inputRef.current?.focus(), 100)

    setSending(true)
    try {
      // Encrypt the message
      const encryptedContent = tier
        ? await encryptContent(savedText, activeCreator, tier)
        : await encryptContent(savedText, activeCreator, messages.find(m => m.tier)?.tier || 1)

      // Build auth payload
      const walletHash = await computeWalletHash(address)
      const timestamp = Date.now()

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creatorAddress: activeCreator,
          content: encryptedContent,
          threadId,
          senderType,
          tier: senderType === 'subscriber' ? tier : undefined,
          walletAddress: address,
          walletHash,
          timestamp,
        }),
      })

      if (res.ok) {
        const { message: saved } = await res.json()
        sentMessageIdsRef.current.add(saved.id)
        // Replace optimistic message with server version
        setMessages(prev => prev.map(m => m.id === optimisticId ? saved : m))
        setDecryptedMessages(prev => {
          const next = new Map(prev)
          next.delete(optimisticId)
          next.set(saved.id, plaintext)
          return next
        })
        // Update thread list for creator
        if (isCreator) {
          fetchThreads()
        }
        // Refresh unread badge
        refreshUnread()
      } else {
        const errData = await res.json().catch(() => ({ error: 'Failed to send' }))
        // Rollback optimistic message — mark as failed instead of removing
        setMessages(prev => prev.filter(m => m.id !== optimisticId))
        setDecryptedMessages(prev => {
          const next = new Map(prev)
          next.delete(optimisticId)
          return next
        })
        setMessageText(savedText) // Restore the message text so user doesn't lose it
        toast.error(errData.error || 'Failed to send message')
      }
    } catch (err) {
      // Rollback optimistic message
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      setDecryptedMessages(prev => {
        const next = new Map(prev)
        next.delete(optimisticId)
        return next
      })
      setMessageText(savedText) // Restore the message text
      toast.error('Failed to send message. Your message has been restored.')
    } finally {
      setSending(false)
      sendingRef.current = false
    }
  }, [messageText, activeCreator, address, sending, isCreator, isPeerThread, activeThread, anonId, activeTier, messages, fetchThreads, refreshUnread])

  // Determine which creators the subscriber can message
  const subscribedCreators = useMemo(() => {
    const unique = new Map<string, number>()
    for (const pass of userPasses) {
      if (!unique.has(pass.creator) || (unique.get(pass.creator) ?? 0) < pass.tier) {
        unique.set(pass.creator, pass.tier)
      }
    }
    return Array.from(unique.entries()).map(([creator, tier]) => ({ creator, tier }))
  }, [userPasses])

  // ---- Render: Not connected ----
  if (!connected) {
    return (
      <PageTransition className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-8 h-8 text-white/60" />
            </div>
            <h2 className="text-2xl font-serif italic text-white mb-3">Private Messages</h2>
            <p className="text-white/60 max-w-md mx-auto mb-6">
              Connect your wallet to access encrypted private messages with creators you subscribe to.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-white/60">
              <Lock className="w-3.5 h-3.5" />
              End-to-end encrypted
            </div>
          </div>
        </div>
      </PageTransition>
    )
  }

  // ---- Render: No active creator selected (subscriber landing) ----
  if (!activeCreator && !isCreator) {
    return (
      <PageTransition className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-serif italic text-white mb-6">Messages</h1>

          {subscribedCreators.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-8 h-8 text-white/60" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No conversations yet</h3>
              <p className="text-sm text-white/60 max-w-md mx-auto mb-6">
                Subscribe to a creator to start a private conversation. Your identity stays anonymous.
              </p>
              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-medium text-sm hover:bg-white/90 transition-all"
              >
                Explore Creators
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-white/50 mb-4">Select a creator to message:</p>
              {subscribedCreators.map(({ creator, tier }) => {
                const style = getTierStyle(tier)
                return (
                  <button
                    key={creator}
                    onClick={() => {
                      setActiveCreator(creator)
                      setActiveTier(tier)
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all text-left group focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none"
                  >
                    <AddressAvatar address={creator} size={40} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {getCreatorDisplayName(creator)}
                      </p>
                      <p className="text-xs text-white/50 font-mono truncate">{shortenAddress(creator)}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text} border ${style.border}`}>
                      {getTierLabel(tier)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-white/60 group-hover:text-white/50 transition-colors" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </PageTransition>
    )
  }

  // ---- Render: Two-panel messaging layout ----

  const selectedThreadTier = activeThread
    ? threads.find(t => t.thread_id === activeThread)?.tier || activeTier
    : activeTier

  return (
    <PageTransition className="min-h-screen">
      <div className="max-w-6xl mx-auto h-[calc(100vh-4rem-4rem)] md:h-[calc(100vh-4rem)]">
        <div className="flex h-full border-x border-white/[0.06]">

          {/* ---- Left Panel: Thread List ---- */}
          <div className={`w-full md:w-80 lg:w-96 border-r border-white/[0.06] flex flex-col shrink-0 ${mobileShowThread ? 'hidden md:flex' : 'flex'}`}>
            {/* Header */}
            <div className="px-4 py-4 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-serif italic text-white">Messages</h1>
                <div className="flex items-center gap-1.5 text-xs text-white/60">
                  <Lock className="w-3 h-3" />
                  <span>E2E Encrypted</span>
                </div>
              </div>
              {activeCreator && !isCreator && (
                <button
                  onClick={() => {
                    setActiveCreator(null)
                    setActiveThread(null)
                    setMessages([])
                    setDecryptedMessages(new Map())
                    setMobileShowThread(false)
                  }}
                  className="flex items-center gap-1.5 mt-2 p-2.5 -ml-2.5 text-xs text-white/50 hover:text-white/70 transition-colors focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to conversations
                </button>
              )}
            </div>

            {/* Thread List */}
            <div className="flex-1 overflow-y-auto">
              {loadingThreads ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-white/60 animate-spin" />
                </div>
              ) : isCreator && threads.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageCircle className="w-8 h-8 text-white/20 mx-auto mb-3" />
                  <p className="text-sm text-white/50">No messages yet</p>
                  <p className="text-xs text-white/60 mt-1">Subscriber messages will appear here</p>
                </div>
              ) : isCreator ? (
                threads.map(thread => {
                  const style = thread.tier ? getTierStyle(thread.tier) : getTierStyle(1)
                  const isActive = activeThread === thread.thread_id
                  return (
                    <button
                      key={thread.thread_id}
                      onClick={() => {
                        setActiveThread(thread.thread_id)
                        setMobileShowThread(true)
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b border-white/[0.03] focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none ${
                        isActive
                          ? 'bg-white/[0.05]'
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full ${style.bg} border ${style.border} flex items-center justify-center shrink-0`}>
                        <Shield className={`w-4 h-4 ${style.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${style.text}`}>
                            {thread.tier ? getTierLabel(thread.tier) : 'Subscriber'}
                          </span>
                          <span className="text-[11px] text-white/60 ml-auto shrink-0">
                            {timeAgo(thread.last_message_at)}
                          </span>
                        </div>
                        <p className="text-xs text-white/50 truncate mt-0.5">
                          {thread.last_sender_type === 'creator' ? 'You: ' : ''}
                          {isE2EEncrypted(thread.last_message) ? 'Encrypted message' : thread.last_message}
                        </p>
                      </div>
                      <span className="text-[10px] text-white/60 bg-white/[0.04] px-1.5 py-0.5 rounded-full">
                        {thread.message_count}
                      </span>
                    </button>
                  )
                })
              ) : (
                /* Subscriber: show their single thread with this creator */
                activeCreator && (
                  <button
                    onClick={() => setMobileShowThread(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left bg-white/[0.05] border-b border-white/[0.03] focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none"
                  >
                    <AddressAvatar address={activeCreator} size={36} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{getCreatorDisplayName(activeCreator)}</p>
                      <p className="text-xs text-white/50 truncate">
                        {messages.length > 0 ? `${messages.length} messages` : 'Start a conversation'}
                      </p>
                    </div>
                  </button>
                )
              )}
            </div>
          </div>

          {/* ---- Right Panel: Conversation ---- */}
          <div className={`flex-1 flex flex-col ${!mobileShowThread ? 'hidden md:flex' : 'flex'}`}>
            {/* Conversation Header */}
            {activeThread ? (
              <>
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
                  {/* Mobile back button */}
                  <button
                    onClick={() => setMobileShowThread(false)}
                    className="md:hidden p-2.5 rounded-lg hover:bg-white/[0.04] transition-colors focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none"
                    aria-label="Back to threads"
                  >
                    <ArrowLeft className="w-4 h-4 text-white/60" />
                  </button>

                  {isPeerThread ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.12] flex items-center justify-center">
                        <Shield className="w-4 h-4 text-white/50" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white/80">Private conversation</p>
                        <p className="text-[11px] text-white/60">Anonymous subscriber-to-subscriber</p>
                      </div>
                    </>
                  ) : isCreator ? (
                    <>
                      {(() => {
                        const threadData = threads.find(t => t.thread_id === activeThread)
                        const tier = threadData?.tier || 1
                        const style = getTierStyle(tier)
                        return (
                          <>
                            <div className={`w-8 h-8 rounded-full ${style.bg} border ${style.border} flex items-center justify-center`}>
                              <Shield className={`w-4 h-4 ${style.text}`} />
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${style.text}`}>
                                {getTierLabel(tier)}
                              </p>
                              <p className="text-[11px] text-white/60">Anonymous subscriber</p>
                            </div>
                          </>
                        )
                      })()}
                    </>
                  ) : (
                    <>
                      <AddressAvatar address={activeCreator!} size={32} />
                      <div>
                        <p className="text-sm font-medium text-white">
                          {getCreatorDisplayName(activeCreator!)}
                        </p>
                        <p className="text-[11px] text-white/60">Creator</p>
                      </div>
                    </>
                  )}

                  <div className="ml-auto flex items-center gap-1.5 text-[11px] text-white/60">
                    <Lock className="w-3 h-3" />
                    Encrypted
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-5 h-5 text-white/60 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12">
                      <Lock className="w-8 h-8 text-white/20 mx-auto mb-3" />
                      <p className="text-sm text-white/50">No messages yet</p>
                      <p className="text-xs text-white/60 mt-1">
                        {isCreator ? 'This subscriber hasn\'t sent any messages yet' : 'Send your first encrypted message'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Encryption notice */}
                      <div className="flex justify-center mb-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
                          <Lock className="w-3 h-3 text-violet-400/60" />
                          <span className="text-[11px] text-white/60">Messages are end-to-end encrypted</span>
                        </div>
                      </div>

                      {messages.map(msg => {
                        const isMine = isPeerThread
                          ? sentMessageIdsRef.current.has(msg.id)
                          : isCreator
                            ? msg.sender_type === 'creator'
                            : msg.sender_type === 'subscriber'
                        const decrypted = decryptedMessages.get(msg.id)

                        return (
                          <m.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[75%] sm:max-w-[65%] rounded-2xl px-4 py-2.5 ${
                                isMine
                                  ? 'bg-violet-500/20 border border-violet-500/20'
                                  : 'bg-white/[0.06] border border-white/[0.08]'
                              }`}
                            >
                              {!isMine && msg.sender_type === 'subscriber' && msg.tier && (
                                <p className={`text-[11px] font-medium mb-1 ${getTierStyle(msg.tier).text}`}>
                                  {isPeerThread ? `${getTierLabel(msg.tier)}` : getTierLabel(msg.tier)}
                                </p>
                              )}
                              {!isMine && msg.sender_type === 'creator' && !isPeerThread && (
                                <p className="text-[11px] font-medium text-white/60 mb-1">Creator</p>
                              )}
                              <p className="text-sm text-white/90 leading-relaxed break-words whitespace-pre-wrap">
                                {decrypted || (
                                  <span className="text-white/60 italic flex items-center gap-1.5">
                                    <Lock className="w-3 h-3" />
                                    Decrypting...
                                  </span>
                                )}
                              </p>
                              <p className={`text-[10px] mt-1 ${isMine ? 'text-violet-300/40' : 'text-white/60'}`}>
                                {timeAgo(msg.created_at)}
                              </p>
                            </div>
                          </m.div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Message Input */}
                <div className="px-4 py-3 border-t border-white/[0.06]">
                  {(!isCreator && !activeTier) ? (
                    <p className="text-xs text-white/50 text-center py-2">
                      You need an active subscription to message this creator
                    </p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={messageText}
                        onChange={e => setMessageText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            sendMessage()
                          }
                        }}
                        placeholder={isCreator ? 'Reply to subscriber...' : 'Send an encrypted message...'}
                        maxLength={2000}
                        className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-violet-500"
                        disabled={sending}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!messageText.trim() || sending}
                        className="p-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none"
                        aria-label="Send message"
                      >
                        {sending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                  {!isCreator && activeTier && (
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-white/60">
                      <Shield className="w-3 h-3" />
                      <span>You appear as: <span className={getTierStyle(activeTier).text}>{getTierLabel(activeTier)}</span></span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* No thread selected */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 text-white/10 mx-auto mb-4" />
                  <p className="text-sm text-white/50">
                    {isCreator ? 'Select a conversation' : 'Select a creator to message'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
