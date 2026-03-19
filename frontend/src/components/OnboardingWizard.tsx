'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowRight,
  ArrowLeft,
  Shield,
  User,
  Layers,
  FileText,
  Check,
  Sparkles,
  Wallet,
  Loader2,
  ChevronRight,
  Info,
} from 'lucide-react'
import { useVeilSub } from '@/hooks/useVeilSub'
import { useSupabase } from '@/hooks/useSupabase'
import { useTransactionPoller } from '@/hooks/useTransactionPoller'
import { creditsToMicrocredits, formatCredits } from '@/lib/utils'
import { saveCreatorHash, PLATFORM_FEE_PCT, FEES } from '@/lib/config'
import Button from '@/components/ui/Button'
import GlassCard from '@/components/GlassCard'
import type { TxStatus } from '@/types'

// ─── Step definitions ───────────────────────────────────────────────────────

const STEPS = [
  { id: 'welcome', label: 'Welcome', icon: Shield },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'tier', label: 'Tier', icon: Layers },
  { id: 'publish', label: 'Publish', icon: FileText },
] as const

type StepId = (typeof STEPS)[number]['id']

const CATEGORIES = [
  'Content Creator',
  'Writer',
  'Artist',
  'Developer',
  'Educator',
  'Other',
] as const

// ─── Types ──────────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  onComplete: () => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const router = useRouter()
  const { address: publicKey, connected, signMessage } = useWallet()
  const { registerCreator, createCustomTier, publishContent } = useVeilSub()
  const { upsertCreatorProfile } = useSupabase()
  const { startPolling, stopPolling } = useTransactionPoller()

  // Step state
  const [currentStep, setCurrentStep] = useState(0)

  // Profile state (Step 2)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [category, setCategory] = useState<string>('')
  const [imageUrl, setImageUrl] = useState('')

  // Tier state (Step 3)
  const [tierName, setTierName] = useState('Supporter')
  const [tierPrice, setTierPrice] = useState('')
  const [tierFeatures, setTierFeatures] = useState<string[]>(['Access to exclusive content'])
  const [newFeature, setNewFeature] = useState('')

  // Publish state (Step 4)
  const [postTitle, setPostTitle] = useState('')
  const [postBody, setPostBody] = useState('')

  // Transaction state
  const [regTxStatus, setRegTxStatus] = useState<TxStatus>('idle')
  const [tierTxStatus, setTierTxStatus] = useState<TxStatus>('idle')
  const [publishTxStatus, setPublishTxStatus] = useState<TxStatus>('idle')
  const [regComplete, setRegComplete] = useState(false)
  const [tierComplete, setTierComplete] = useState(false)
  const [publishComplete, setPublishComplete] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)

  // Refs for cleanup
  const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      stopPolling()
      if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current)
    }
  }, [stopPolling])

  const step = STEPS[currentStep]

  const goNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))
  }, [])

  const goBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }, [])

  // ── Step 2 → 3: Register as creator + save profile ──────────────────────

  const handleRegisterAndContinue = useCallback(async () => {
    if (!publicKey || !tierPrice) return
    const priceNum = parseFloat(tierPrice)
    if (!Number.isFinite(priceNum) || priceNum <= 0) return

    setRegTxStatus('signing')
    try {
      const id = await registerCreator(creditsToMicrocredits(priceNum))
      if (!id) {
        setRegTxStatus('failed')
        return
      }
      setRegTxStatus('broadcasting')
      startPolling(id, async (result) => {
        if (result.status === 'confirmed') {
          setRegTxStatus('confirmed')
          const resolvedId = result.resolvedTxId ?? id

          // Extract creator hash
          try {
            const r = await fetch(`/api/aleo/transaction/${encodeURIComponent(resolvedId)}`)
            const tx = await r.json()
            const outputValue = tx?.execution?.transitions?.[0]?.outputs?.[0]?.value
            const hash =
              typeof outputValue === 'string'
                ? (outputValue.match(/arguments:\s*\[\s*(\d+field)/) ?? [])[1]
                : undefined
            if (hash && hash.endsWith('field')) {
              saveCreatorHash(publicKey, hash)
            }
          } catch {
            // Non-critical
          }

          // Save profile to Supabase
          const wrappedSign = signMessage
            ? async (msg: Uint8Array) => {
                const r = await signMessage(msg)
                if (!r) throw new Error('Signing cancelled')
                return r
              }
            : null
          try {
            await upsertCreatorProfile(
              publicKey,
              displayName || undefined,
              bio || undefined,
              wrappedSign
            )
          } catch {
            // Non-critical
          }

          toast.success("You're registered as a creator!")
          setRegComplete(true)
          goNext()
        } else if (result.status === 'failed') {
          setRegTxStatus('failed')
          toast.error('Registration couldn\u2019t be completed. Check your wallet and try again.')
        }
      })
    } catch (err) {
      setRegTxStatus('failed')
      toast.error(err instanceof Error ? err.message : 'Registration couldn\u2019t be completed')
    }
  }, [
    publicKey,
    tierPrice,
    registerCreator,
    startPolling,
    signMessage,
    upsertCreatorProfile,
    displayName,
    bio,
    goNext,
  ])

  // ── Step 3: Create custom tier ───────────────────────────────────────────

  const handleCreateTier = useCallback(async () => {
    if (!tierPrice) return
    const priceNum = parseFloat(tierPrice)
    if (!Number.isFinite(priceNum) || priceNum <= 0) return

    setTierTxStatus('signing')
    try {
      const tierId = 1 // First custom tier
      // nameHash: use a simple numeric representation of the tier name for on-chain storage
      const nameHash = String(
        Array.from(tierName || 'Supporter').reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0) >>> 0
      )
      const id = await createCustomTier(tierId, creditsToMicrocredits(priceNum), nameHash)
      if (!id) {
        setTierTxStatus('failed')
        return
      }
      setTierTxStatus('broadcasting')
      startPolling(id, (result) => {
        if (result.status === 'confirmed') {
          setTierTxStatus('confirmed')
          toast.success('Subscription tier created!')
          setTierComplete(true)
          goNext()
        } else if (result.status === 'failed') {
          setTierTxStatus('failed')
          toast.error('Tier couldn\u2019t be created. Check your wallet and try again.')
        }
      })
    } catch (err) {
      setTierTxStatus('failed')
      toast.error(err instanceof Error ? err.message : 'Tier couldn\u2019t be created')
    }
  }, [tierPrice, createCustomTier, startPolling, goNext])

  // ── Step 4: Publish first post ───────────────────────────────────────────

  const handlePublish = useCallback(async () => {
    if (!postTitle.trim()) return

    setPublishTxStatus('signing')
    try {
      // Generate cryptographically secure content ID using crypto.randomUUID()
      const contentId = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      const id = await publishContent(contentId, 1) // tier 1 minimum
      if (!id) {
        setPublishTxStatus('failed')
        return
      }
      setPublishTxStatus('broadcasting')
      startPolling(id, (result) => {
        if (result.status === 'confirmed') {
          setPublishTxStatus('confirmed')
          toast.success('Your first post is live!')
          setPublishComplete(true)
          setShowConfetti(true)
          confettiTimerRef.current = setTimeout(() => {
            onComplete()
          }, 2000)
        } else if (result.status === 'failed') {
          setPublishTxStatus('failed')
          toast.error('Post couldn\u2019t be published. Check your wallet and try again.')
        }
      })
    } catch (err) {
      setPublishTxStatus('failed')
      toast.error(err instanceof Error ? err.message : 'Post couldn\u2019t be published')
    }
  }, [postTitle, publishContent, startPolling, onComplete])

  // ── Skip publish and finish ──────────────────────────────────────────────

  const handleSkipPublish = useCallback(() => {
    onComplete()
  }, [onComplete])

  // ── Feature list management ──────────────────────────────────────────────

  const addFeature = useCallback(() => {
    const trimmed = newFeature.trim()
    if (trimmed && tierFeatures.length < 6) {
      setTierFeatures((prev) => [...prev, trimmed])
      setNewFeature('')
    }
  }, [newFeature, tierFeatures.length])

  const removeFeature = useCallback((index: number) => {
    setTierFeatures((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // ── Validation ───────────────────────────────────────────────────────────

  const canProceedProfile =
    displayName.trim().length > 0 && tierPrice && parseFloat(tierPrice) > 0

  const isTxBusy = (status: TxStatus) =>
    status === 'signing' || status === 'broadcasting'

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      {/* Progress indicator */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = i === currentStep
            const isDone = i < currentStep || (i === 1 && regComplete) || (i === 2 && tierComplete) || (i === 3 && publishComplete)
            return (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      isDone
                        ? 'bg-violet-500 border-violet-500 text-white'
                        : isActive
                          ? 'border-violet-500 text-violet-400 bg-violet-500/10'
                          : 'border-border text-white/30 bg-surface-1/40'
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] mt-1.5 font-medium ${
                      isActive ? 'text-violet-400' : isDone ? 'text-white/60' : 'text-white/30'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 mt-[-14px] rounded-full transition-colors duration-300 ${
                      i < currentStep ? 'bg-violet-500' : 'bg-border/50'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
        {/* Progress bar */}
        <div className="h-1 rounded-full bg-border/30 overflow-hidden">
          <m.div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400"
            initial={{ width: '0%' }}
            animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <m.div
          key={step.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* ── Step 1: Welcome ──────────────────────────────────────────── */}
          {currentStep === 0 && (
            <GlassCard variant="heavy" className="!p-8">
              <div className="text-center">
                <m.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-violet-500/10 border border-violet-500/20 mb-6"
                >
                  <Shield className="w-10 h-10 text-violet-400" aria-hidden="true" />
                </m.div>

                <h2 className="text-2xl sm:text-3xl font-serif italic text-white mb-3">
                  Welcome to VeilSub
                </h2>
                <p className="text-white/60 mb-6 max-w-md mx-auto leading-relaxed">
                  You are about to create a privacy-first creator page. Your subscribers will
                  be mathematically hidden — even from you. Only aggregate counts and revenue
                  are visible.
                </p>

                {/* Wallet status */}
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 ${
                    connected
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                  }`}
                >
                  <Wallet className="w-4 h-4" aria-hidden="true" />
                  <span className="text-sm font-medium">
                    {connected
                      ? `Wallet Connected: ${publicKey?.slice(0, 8)}...${publicKey?.slice(-6)}`
                      : 'Connect your wallet to continue'}
                  </span>
                </div>

                {/* Privacy promise cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-left">
                  {[
                    {
                      icon: Shield,
                      title: 'Zero Identity Leaks',
                      desc: 'Your wallet address is never stored publicly',
                    },
                    {
                      icon: Layers,
                      title: '3 Privacy Layers',
                      desc: 'Anonymous identity, hashed data, selective sharing',
                    },
                    {
                      icon: Sparkles,
                      title: 'Full Creator Toolkit',
                      desc: 'Subscriptions, tiers, tips, content & more',
                    },
                  ].map((card) => {
                    const Icon = card.icon
                    return (
                      <div
                        key={card.title}
                        className="p-3 rounded-xl bg-white/[0.02] border border-border/50"
                      >
                        <Icon
                          className="w-4 h-4 text-violet-400 mb-2"
                          aria-hidden="true"
                        />
                        <p className="text-xs font-semibold text-white mb-0.5">
                          {card.title}
                        </p>
                        <p className="text-[10px] text-white/40">{card.desc}</p>
                      </div>
                    )
                  })}
                </div>

                <Button
                  onClick={goNext}
                  disabled={!connected}
                  variant="accent"
                  size="lg"
                  className="rounded-full px-10"
                >
                  {connected ? 'Get Started' : 'Connect Wallet First'}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Button>
              </div>
            </GlassCard>
          )}

          {/* ── Step 2: Profile ──────────────────────────────────────────── */}
          {currentStep === 1 && (
            <GlassCard variant="heavy" className="!p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-500/10 border border-violet-500/20">
                  <User className="w-5 h-5 text-violet-400" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Set Up Your Profile</h2>
                  <p className="text-xs text-white/40">Step 2 of 4 — your public creator identity</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Display name */}
                <div>
                  <label htmlFor="onb-name" className="block text-sm text-white/70 mb-2">
                    Display Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="onb-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your creator name"
                    maxLength={50}
                    className="w-full px-4 py-3 rounded-lg bg-surface-1 border border-border text-white placeholder-subtle focus:outline-none focus:border-violet-500/30 focus:shadow-accent-md transition-all duration-300"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label htmlFor="onb-bio" className="block text-sm text-white/70 mb-2">
                    Bio
                    <span className="text-white/40 ml-2 text-xs">({bio.length}/200)</span>
                  </label>
                  <textarea
                    id="onb-bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 200))}
                    placeholder="What do you create? (your subscriber list stays private on-chain)"
                    rows={2}
                    maxLength={200}
                    className="w-full px-4 py-3 rounded-lg bg-surface-1 border border-border text-white placeholder-subtle focus:outline-none focus:border-violet-500/30 focus:shadow-accent-md transition-all duration-300 resize-none"
                  />
                </div>

                {/* Category */}
                <div>
                  <label id="category-label" className="block text-sm text-white/70 mb-2">Category</label>
                  <div
                    role="group"
                    aria-labelledby="category-label"
                    className="flex flex-wrap gap-2"
                  >
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        role="radio"
                        aria-checked={category === cat}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none ${
                          category === cat
                            ? 'bg-violet-500/20 border border-violet-500/30 text-violet-300'
                            : 'bg-white/[0.03] border border-border text-white/50 hover:text-white/70 hover:bg-white/[0.05]'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Profile image URL */}
                <div>
                  <label htmlFor="onb-image" className="block text-sm text-white/70 mb-2">
                    Profile Image URL <span className="text-white/40 text-xs">(optional)</span>
                  </label>
                  <input
                    id="onb-image"
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/avatar.png"
                    className="w-full px-4 py-3 rounded-lg bg-surface-1 border border-border text-white placeholder-subtle focus:outline-none focus:border-violet-500/30 focus:shadow-accent-md transition-all duration-300"
                  />
                </div>

                {/* Base price — required for registration */}
                <div>
                  <label htmlFor="onb-price" className="block text-sm text-white/70 mb-2">
                    Base Subscription Price (ALEO) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="onb-price"
                      type="number"
                      inputMode="decimal"
                      value={tierPrice}
                      onChange={(e) => setTierPrice(e.target.value)}
                      placeholder="5"
                      min="0.000001"
                      max="1000000"
                      step="0.1"
                      className="w-full px-4 py-3 rounded-lg bg-surface-1 border border-border text-white placeholder-subtle focus:outline-none focus:border-violet-500/30 focus:shadow-accent-md transition-all duration-300"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/40">
                      ALEO
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-1.5">
                    {PLATFORM_FEE_PCT}% platform fee. This price registers your creator profile
                    on-chain.
                  </p>
                </div>

                {/* Privacy notice */}
                <div className="p-4 rounded-lg bg-violet-500/[0.04] border border-violet-500/10">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" aria-hidden="true" />
                    <p className="text-xs text-white/60 leading-relaxed">
                      Profile info (name, bio) is stored off-chain. On the blockchain, only
                      an anonymous identifier and your tier price exist — no personal info ever
                      touches the blockchain.
                    </p>
                  </div>
                </div>
              </div>

              {/* Nav buttons */}
              <div className="flex items-center justify-between mt-8">
                <Button onClick={goBack} variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  Back
                </Button>
                <Button
                  onClick={handleRegisterAndContinue}
                  disabled={!canProceedProfile || isTxBusy(regTxStatus)}
                  variant="accent"
                  size="md"
                  className="rounded-full px-8"
                >
                  {isTxBusy(regTxStatus) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      {regTxStatus === 'signing' ? 'Signing...' : 'Confirming...'}
                    </>
                  ) : regTxStatus === 'failed' ? (
                    'Retry Registration'
                  ) : (
                    <>
                      Register & Continue
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </Button>
              </div>
            </GlassCard>
          )}

          {/* ── Step 3: Create Tier ──────────────────────────────────────── */}
          {currentStep === 2 && (
            <GlassCard variant="heavy" className="!p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-500/10 border border-violet-500/20">
                  <Layers className="w-5 h-5 text-violet-400" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Create Your First Tier</h2>
                  <p className="text-xs text-white/40">Step 3 of 4 — define subscriber access level</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Form */}
                <div className="space-y-4">
                  <div>
                    <label htmlFor="onb-tier-name" className="block text-sm text-white/70 mb-2">
                      Tier Name
                    </label>
                    <input
                      id="onb-tier-name"
                      type="text"
                      value={tierName}
                      onChange={(e) => setTierName(e.target.value)}
                      placeholder="Supporter"
                      maxLength={30}
                      className="w-full px-4 py-3 rounded-lg bg-surface-1 border border-border text-white placeholder-subtle focus:outline-none focus:border-violet-500/30 focus:shadow-accent-md transition-all duration-300"
                    />
                  </div>

                  <div>
                    <label htmlFor="onb-tier-price" className="block text-sm text-white/70 mb-2">
                      Price (ALEO)
                    </label>
                    <div className="relative">
                      <input
                        id="onb-tier-price"
                        type="number"
                        inputMode="decimal"
                        value={tierPrice}
                        onChange={(e) => setTierPrice(e.target.value)}
                        placeholder="5"
                        min="0.000001"
                        max="1000000"
                        step="0.1"
                        className="w-full px-4 py-3 rounded-lg bg-surface-1 border border-border text-white placeholder-subtle focus:outline-none focus:border-violet-500/30 focus:shadow-accent-md transition-all duration-300"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/40">
                        ALEO
                      </span>
                    </div>
                  </div>

                  {/* Features list */}
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      Benefits / Features
                    </label>
                    <div className="space-y-2 mb-2">
                      {tierFeatures.map((feat, i) => (
                        <div
                          key={`${feat}-${i}`}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] border border-border/50 text-sm text-white/70"
                        >
                          <Check className="w-3.5 h-3.5 text-violet-400 shrink-0" aria-hidden="true" />
                          <span className="flex-1 truncate">{feat}</span>
                          <button
                            onClick={() => removeFeature(i)}
                            className="text-white/30 hover:text-red-400 transition-colors text-xs"
                            aria-label={`Remove feature: ${feat}`}
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                    {tierFeatures.length < 6 && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newFeature}
                          onChange={(e) => setNewFeature(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addFeature()}
                          placeholder="Add a benefit..."
                          maxLength={60}
                          className="flex-1 px-3 py-2 rounded-lg bg-surface-1 border border-border text-sm text-white placeholder-subtle focus:outline-none focus:border-violet-500/30 transition-all"
                        />
                        <button
                          onClick={addFeature}
                          disabled={!newFeature.trim()}
                          className="px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400 hover:bg-violet-500/20 transition-colors disabled:opacity-40"
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview card */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
                    Preview
                  </p>
                  <div className="p-5 rounded-2xl bg-gradient-to-b from-violet-500/[0.08] to-transparent border border-violet-500/15">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                        <Layers className="w-4 h-4 text-violet-400" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {tierName || 'Tier Name'}
                        </p>
                        <p className="text-xs text-white/40">by {displayName || 'Creator'}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <span className="text-2xl font-bold text-white">
                        {tierPrice ? parseFloat(tierPrice).toFixed(1) : '0.0'}
                      </span>
                      <span className="text-sm text-white/40 ml-1">ALEO / month</span>
                    </div>

                    {tierFeatures.length > 0 && (
                      <ul className="space-y-1.5 mb-4">
                        {tierFeatures.map((feat, i) => (
                          <li
                            key={`preview-${feat}-${i}`}
                            className="flex items-center gap-2 text-xs text-white/60"
                          >
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" aria-hidden="true" />
                            {feat}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="p-2.5 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/10 text-center">
                      <span className="text-[10px] text-emerald-400 font-medium">
                        Private Subscription
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nav buttons */}
              <div className="flex items-center justify-between mt-8">
                <Button onClick={goBack} variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  Back
                </Button>
                <div className="flex items-center gap-3">
                  <Button onClick={goNext} variant="ghost" size="sm">
                    Skip
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                  <Button
                    onClick={handleCreateTier}
                    disabled={!tierPrice || parseFloat(tierPrice) <= 0 || isTxBusy(tierTxStatus)}
                    variant="accent"
                    size="md"
                    className="rounded-full px-8"
                  >
                    {isTxBusy(tierTxStatus) ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        {tierTxStatus === 'signing' ? 'Signing...' : 'Confirming...'}
                      </>
                    ) : tierTxStatus === 'failed' ? (
                      'Retry'
                    ) : (
                      <>
                        Create Tier
                        <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </GlassCard>
          )}

          {/* ── Step 4: Publish First Post ───────────────────────────────── */}
          {currentStep === 3 && (
            <GlassCard variant="heavy" className="!p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-500/10 border border-violet-500/20">
                  <FileText className="w-5 h-5 text-violet-400" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Publish Your First Post</h2>
                  <p className="text-xs text-white/40">
                    Step 4 of 4 — your subscribers see this first
                  </p>
                </div>
              </div>

              {showConfetti ? (
                <m.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <m.div
                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  >
                    <Sparkles
                      className="w-16 h-16 text-violet-400 mx-auto mb-6"
                      aria-hidden="true"
                    />
                  </m.div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    Your Creator Page is Live!
                  </h3>
                  <p className="text-white/60 max-w-sm mx-auto mb-6">
                    Everything is set up. Your subscribers can now find you and subscribe
                    privately.
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
                    <Check className="w-4 h-4" aria-hidden="true" />
                    Redirecting to dashboard...
                  </div>
                </m.div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="onb-post-title" className="block text-sm text-white/70 mb-2">
                        Post Title <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="onb-post-title"
                        type="text"
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                        placeholder="Welcome to my page!"
                        maxLength={200}
                        className="w-full px-4 py-3 rounded-lg bg-surface-1 border border-border text-white placeholder-subtle focus:outline-none focus:border-violet-500/30 focus:shadow-accent-md transition-all duration-300"
                      />
                    </div>

                    <div>
                      <label htmlFor="onb-post-body" className="block text-sm text-white/70 mb-2">
                        Content
                        <span className="text-white/40 ml-2 text-xs">({postBody.length}/500)</span>
                      </label>
                      <textarea
                        id="onb-post-body"
                        value={postBody}
                        onChange={(e) => setPostBody(e.target.value.slice(0, 500))}
                        placeholder="Share your first update with your subscribers..."
                        rows={4}
                        maxLength={500}
                        className="w-full px-4 py-3 rounded-lg bg-surface-1 border border-border text-white placeholder-subtle focus:outline-none focus:border-violet-500/30 focus:shadow-accent-md transition-all duration-300 resize-none"
                      />
                    </div>

                    {/* Tier badge */}
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-border/50 flex items-center gap-3">
                      <Layers className="w-4 h-4 text-violet-400" aria-hidden="true" />
                      <div>
                        <p className="text-xs font-medium text-white">
                          Requires: {tierName || 'Tier 1'} ({tierPrice || '?'} ALEO)
                        </p>
                        <p className="text-[10px] text-white/40">
                          Only subscribers at this tier or above can view
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Nav buttons */}
                  <div className="flex items-center justify-between mt-8">
                    <Button onClick={goBack} variant="ghost" size="sm">
                      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                      Back
                    </Button>
                    <div className="flex items-center gap-3">
                      <Button onClick={handleSkipPublish} variant="ghost" size="sm">
                        Skip & Finish
                        <ChevronRight className="w-4 h-4" aria-hidden="true" />
                      </Button>
                      <Button
                        onClick={handlePublish}
                        disabled={!postTitle.trim() || isTxBusy(publishTxStatus)}
                        variant="accent"
                        size="md"
                        className="rounded-full px-8"
                      >
                        {isTxBusy(publishTxStatus) ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                            {publishTxStatus === 'signing' ? 'Signing...' : 'Publishing...'}
                          </>
                        ) : publishTxStatus === 'failed' ? (
                          'Retry Publish'
                        ) : (
                          <>
                            Publish & Finish
                            <Sparkles className="w-4 h-4" aria-hidden="true" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </GlassCard>
          )}
        </m.div>
      </AnimatePresence>
    </div>
  )
}
