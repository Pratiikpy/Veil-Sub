'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { m } from 'framer-motion'
import {
  User,
  Shield,
  Monitor,
  Wallet,
  Bell,
  Info,
  Copy,
  Check,
  ChevronDown,
  ExternalLink,
  CreditCard,
  Eye,
  EyeOff,
  Mail,
  Loader2,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import GlassCard from '@/components/GlassCard'
import PageTransition from '@/components/PageTransition'
import { useSupabase } from '@/hooks/useSupabase'
import { useWalletRecords } from '@/hooks/useWalletRecords'
import { useBlockHeight } from '@/hooks/useBlockHeight'
import { shortenAddress, formatCredits, parseAccessPass } from '@/lib/utils'
import { setSoundsEnabled, isSoundsEnabled } from '@/lib/sounds'
import { sounds } from '@/lib/sounds'
import { PROGRAM_ID, DEPLOYED_PROGRAM_ID, APP_NAME } from '@/lib/config'
import { clearCreatorCache } from '@/lib/creatorCache'

// ─── Types ───────────────────────────────────────────────────────────────────

type ThemePreference = 'dark' | 'light' | 'system'
type PrivacyMode = 'standard' | 'blind'

interface NotificationPrefs {
  email: boolean
  inApp: boolean
  newSubscriber: boolean
  contentPublished: boolean
  subscriptionExpiring: boolean
  tipsReceived: boolean
}

// ─── Constants ───────────────────────────────────────────────────────────────

import { HERO_GLOW_STYLE_SUBTLE as HERO_GLOW_STYLE, TITLE_STYLE as LETTER_SPACING_STYLE } from '@/lib/styles'

const CATEGORY_OPTIONS = [
  'Content Creator',
  'Writer',
  'Artist',
  'Developer',
  'Educator',
  'Journalist',
  'Other',
] as const

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  email: false,
  inApp: true,
  newSubscriber: true,
  contentPublished: true,
  subscriptionExpiring: true,
  tipsReceived: true,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadNotificationPrefs(): NotificationPrefs {
  if (typeof localStorage === 'undefined') return DEFAULT_NOTIFICATION_PREFS
  try {
    const raw = localStorage.getItem('veilsub_notification_prefs')
    if (!raw) return DEFAULT_NOTIFICATION_PREFS
    return { ...DEFAULT_NOTIFICATION_PREFS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_NOTIFICATION_PREFS
  }
}

function saveNotificationPrefs(prefs: NotificationPrefs) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem('veilsub_notification_prefs', JSON.stringify(prefs))
  } catch { /* localStorage full or unavailable */ }
}

function loadPrivacyMode(): PrivacyMode {
  if (typeof localStorage === 'undefined') return 'standard'
  const v = localStorage.getItem('veilsub_default_privacy_mode')
  return v === 'blind' ? 'blind' : 'standard'
}

function savePrivacyMode(mode: PrivacyMode) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem('veilsub_default_privacy_mode', mode)
  } catch { /* localStorage full or unavailable */ }
}

function loadReducedMotion(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem('veilsub_reduced_motion') === 'on'
}

function saveReducedMotion(on: boolean) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem('veilsub_reduced_motion', on ? 'on' : 'off')
  } catch { /* localStorage full or unavailable */ }
  if (on) {
    document.documentElement.classList.add('reduce-motion')
  } else {
    document.documentElement.classList.remove('reduce-motion')
  }
}

function loadThemePreference(): ThemePreference {
  if (typeof localStorage === 'undefined') return 'dark'
  const v = localStorage.getItem('veilsub_theme')
  if (v === 'light') return 'light'
  if (v === 'dark') return 'dark'
  return 'system'
}

function applyTheme(pref: ThemePreference) {
  if (typeof document === 'undefined') return
  let resolved: 'dark' | 'light' = 'dark'
  if (pref === 'light') {
    resolved = 'light'
  } else if (pref === 'system') {
    resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }
  if (resolved === 'light') {
    document.documentElement.classList.add('light')
  } else {
    document.documentElement.classList.remove('light')
  }
  // Only store explicit user choice, not 'system'
  try {
    if (pref === 'system') {
      localStorage.removeItem('veilsub_theme')
    } else {
      localStorage.setItem('veilsub_theme', pref)
    }
  } catch { /* localStorage full or unavailable */ }
}

// ─── Section Components ──────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
        <Icon className="w-5 h-5 text-violet-400" />
      </div>
      <h2 className="text-lg font-medium text-white">{title}</h2>
    </div>
  )
}

function SaveButton({ onClick, saving, saved, label = 'Save Changes' }: { onClick: () => void; saving: boolean; saved?: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        saved
          ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
          : 'bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30'
      }`}
    >
      {saving ? 'Saving...' : saved ? 'Saved!' : label}
    </button>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm text-white/80 group-hover:text-white transition-colors">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => {
          onChange(!checked)
          sounds.toggle()
        }}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none ${
          checked ? 'bg-violet-500 border-violet-500' : 'bg-white/10 border-white/20'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  )
}

function RadioGroup({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string; description?: string }[] }) {
  return (
    <div className="space-y-3">
      {options.map((opt) => (
        <label
          key={opt.value}
          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
            value === opt.value
              ? 'bg-violet-500/10 border-violet-500/30'
              : 'bg-white/[0.02] border-border hover:bg-white/[0.04]'
          }`}
        >
          <input
            type="radio"
            name={`radio-${options[0].value}`}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="mt-0.5 accent-violet-500"
          />
          <div>
            <span className="text-sm font-medium text-white">{opt.label}</span>
            {opt.description && (
              <p className="text-xs text-white/50 mt-0.5">{opt.description}</p>
            )}
          </div>
        </label>
      ))}
    </div>
  )
}

// ─── Subscriber Profile Card ─────────────────────────────────────────────────

function SubscriberProfileCard({ address }: { address: string }) {
  const { getAccessPasses } = useWalletRecords()
  const { blockHeight } = useBlockHeight()
  const [activeCount, setActiveCount] = useState(0)
  const [totalPasses, setTotalPasses] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!address || !blockHeight) return
    let cancelled = false
    setLoading(true)
    getAccessPasses().then((rawPasses) => {
      if (cancelled) return
      let active = 0
      let total = 0
      for (const raw of rawPasses) {
        const pass = parseAccessPass(raw)
        if (!pass) continue
        total++
        if (pass.expiresAt > blockHeight) active++
      }
      setActiveCount(active)
      setTotalPasses(total)
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [address, blockHeight, getAccessPasses])

  return (
    <GlassCard variant="accent" hover={false}>
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 rounded-xl bg-violet-500/15 border border-violet-500/25">
          <Shield className="w-6 h-6 text-violet-400" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-white">Subscriber Profile</h2>
          <p className="text-xs text-white/50">Your private subscription activity</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-xl bg-white/[0.03] border border-border">
          <p className="text-xs text-white/50 mb-1">Active Subscriptions</p>
          <p className="text-xl font-semibold text-white">
            {loading ? (
              <span className="inline-block w-6 h-5 bg-white/10 rounded animate-pulse" />
            ) : activeCount}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-white/[0.03] border border-border">
          <p className="text-xs text-white/50 mb-1">Total Passes</p>
          <p className="text-xl font-semibold text-white">
            {loading ? (
              <span className="inline-block w-6 h-5 bg-white/10 rounded animate-pulse" />
            ) : totalPasses}
          </p>
        </div>
        <div className="col-span-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
          <p className="text-xs text-emerald-400/70 mb-1">Privacy Score</p>
          <p className="text-sm font-medium text-emerald-400">
            100% — Your identity has never been exposed on-chain
          </p>
        </div>
      </div>
    </GlassCard>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { address: publicKey, connected, disconnect, signMessage } = useWallet()
  const { getCreatorProfile, upsertCreatorProfile } = useSupabase()

  // Profile state
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [category, setCategory] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  // Privacy state
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>('standard')
  const [privacySaved, setPrivacySaved] = useState(false)

  // Display state
  const [themePref, setThemePref] = useState<ThemePreference>('dark')
  const [soundsOn, setSoundsOn] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  // Wallet state
  const [copied, setCopied] = useState(false)
  const [showAddress, setShowAddress] = useState(false)

  // Notification state
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS)
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifSaved, setNotifSaved] = useState(false)

  // Email notification state
  const [notifEmail, setNotifEmail] = useState('')
  const [notifEmailLoading, setNotifEmailLoading] = useState(false)
  const [notifEmailSaving, setNotifEmailSaving] = useState(false)
  const [notifEmailSaved, setNotifEmailSaved] = useState(false)
  const [notifEmailExists, setNotifEmailExists] = useState(false)
  const [notifEmailRemoving, setNotifEmailRemoving] = useState(false)

  // Mounted flag for hydration safety
  const [mounted, setMounted] = useState(false)

  // ─── Init from localStorage ────────────────────────────────────────────────

  useEffect(() => {
    setMounted(true)
    setPrivacyMode(loadPrivacyMode())
    setThemePref(loadThemePreference())
    setSoundsOn(isSoundsEnabled())
    setReducedMotion(loadReducedMotion())
    setNotifPrefs(loadNotificationPrefs())
  }, [])

  // ─── Load Supabase profile ─────────────────────────────────────────────────

  useEffect(() => {
    if (!publicKey) return
    let cancelled = false
    setProfileLoading(true)
    // Load from localStorage first as fallback
    const storedCategory = localStorage.getItem('veilsub_profile_category') ?? ''
    const storedImage = localStorage.getItem('veilsub_profile_image') ?? ''
    setCategory(storedCategory)
    setImageUrl(storedImage)
    // Then fetch from Supabase and override if available
    getCreatorProfile(publicKey).then((profile) => {
      if (cancelled) return
      if (profile) {
        setDisplayName(profile.display_name ?? '')
        setBio(profile.bio ?? '')
        // Use Supabase values if available, fallback to localStorage
        if (profile.category) setCategory(profile.category)
        if (profile.image_url) setImageUrl(profile.image_url)
      }
      setProfileLoading(false)
    }).catch(() => {
      if (!cancelled) setProfileLoading(false)
    })
    return () => { cancelled = true }
  }, [publicKey, getCreatorProfile])

  // ─── Load email notification preferences ───────────────────────────────────

  const computeSubscriberHash = useCallback(async (address: string): Promise<string> => {
    const encoder = new TextEncoder()
    const hashBuf = await crypto.subtle.digest('SHA-256', encoder.encode(address))
    return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
  }, [])

  useEffect(() => {
    if (!publicKey) return
    let cancelled = false
    setNotifEmailLoading(true)
    computeSubscriberHash(publicKey).then(async (hash) => {
      if (cancelled) return
      try {
        const res = await fetch(`/api/notification-emails?subscriber_hash=${hash}`)
        if (res.ok) {
          const { subscription } = await res.json()
          if (!cancelled && subscription) {
            setNotifEmail(subscription.email || '')
            setNotifEmailExists(true)
          }
        }
      } catch {
        // Ignore — email notifications are optional
      } finally {
        if (!cancelled) setNotifEmailLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [publicKey, computeSubscriberHash])

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSaveProfile = useCallback(async () => {
    if (!publicKey) return
    setProfileSaving(true)
    setProfileSaved(false)
    try {
      // Pass all profile fields including category and imageUrl to Supabase
      const result = await upsertCreatorProfile(
        publicKey,
        displayName || undefined,
        bio || undefined,
        signMessage,
        undefined, // creatorHash - not needed for settings
        category || undefined,
        imageUrl || undefined
      )
      // Also save locally as backup (ignore storage quota errors)
      try {
        localStorage.setItem('veilsub_profile_category', category)
        localStorage.setItem('veilsub_profile_image', imageUrl)
      } catch { /* localStorage full or unavailable */ }
      if (result) {
        toast.success('Profile saved')
        sounds.success()
        clearCreatorCache() // Invalidate cache so other pages see fresh profile
        setProfileSaved(true)
        setTimeout(() => setProfileSaved(false), 3000)
      } else {
        toast.error('Profile couldn\u2019t be saved. Check your wallet and try again.')
      }
    } catch {
      toast.error('Profile couldn\u2019t be saved. Check your wallet and try again.')
    } finally {
      setProfileSaving(false)
    }
  }, [publicKey, displayName, bio, category, imageUrl, signMessage, upsertCreatorProfile])

  const handleSavePrivacy = useCallback(() => {
    savePrivacyMode(privacyMode)
    toast.success('Privacy preference saved')
    sounds.success()
    setPrivacySaved(true)
    setTimeout(() => setPrivacySaved(false), 3000)
  }, [privacyMode])

  const handleThemeChange = useCallback((pref: string) => {
    const val = pref as ThemePreference
    setThemePref(val)
    applyTheme(val)
    sounds.toggle()
  }, [])

  const handleSoundsToggle = useCallback((on: boolean) => {
    setSoundsOn(on)
    setSoundsEnabled(on)
  }, [])

  const handleReducedMotionToggle = useCallback((on: boolean) => {
    setReducedMotion(on)
    saveReducedMotion(on)
  }, [])

  const handleCopyAddress = useCallback(async () => {
    if (!publicKey) return
    try {
      await navigator.clipboard.writeText(publicKey)
      setCopied(true)
      toast.success('Address copied')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Clipboard not available')
    }
  }, [publicKey])

  const handleSaveNotifications = useCallback(() => {
    saveNotificationPrefs(notifPrefs)
    toast.success('Notification preferences saved')
    sounds.success()
    setNotifSaved(true)
    setTimeout(() => setNotifSaved(false), 3000)
  }, [notifPrefs])

  const updateNotifPref = useCallback((key: keyof NotificationPrefs, value: boolean) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSaveNotifEmail = useCallback(async () => {
    if (!publicKey || !notifEmail.trim() || !notifEmail.includes('@')) {
      toast.error('Please enter a valid email address.')
      return
    }
    setNotifEmailSaving(true)
    setNotifEmailSaved(false)
    try {
      const subscriberHash = await computeSubscriberHash(publicKey)
      // For now, subscribe to all creators (empty array means "all").
      // Future: let user pick specific creators.
      const res = await fetch('/api/notification-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriberHash,
          email: notifEmail.trim(),
          creatorHashes: [], // empty = all creators
        }),
      })
      if (res.ok) {
        toast.success('Email notification preferences saved')
        sounds.success()
        setNotifEmailSaved(true)
        setNotifEmailExists(true)
        setTimeout(() => setNotifEmailSaved(false), 3000)
      } else {
        toast.error('Could not save email preferences. Try again.')
      }
    } catch {
      toast.error('Could not save email preferences. Check your connection.')
    } finally {
      setNotifEmailSaving(false)
    }
  }, [publicKey, notifEmail, computeSubscriberHash])

  const handleRemoveNotifEmail = useCallback(async () => {
    if (!publicKey) return
    setNotifEmailRemoving(true)
    try {
      const subscriberHash = await computeSubscriberHash(publicKey)
      const res = await fetch('/api/notification-emails', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriberHash }),
      })
      if (res.ok) {
        toast.success('Email notifications disabled')
        setNotifEmail('')
        setNotifEmailExists(false)
      } else {
        toast.error('Could not remove email preferences.')
      }
    } catch {
      toast.error('Could not remove email preferences.')
    } finally {
      setNotifEmailRemoving(false)
    }
  }, [publicKey, computeSubscriberHash])

  // ─── Privacy explainer toggle ──────────────────────────────────────────────

  const [privacyExplainerOpen, setPrivacyExplainerOpen] = useState(false)

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!mounted) {
    return (
      <PageTransition>
        <main className="min-h-screen bg-background py-12 sm:py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="h-10 w-48 bg-white/5 rounded animate-pulse mb-8" />
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-white/[0.03] border border-border rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
        </main>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <main className="min-h-screen bg-background py-12 sm:py-16 relative">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none"
          style={HERO_GLOW_STYLE}
        />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6">
          {/* Hero */}
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 sm:mb-10"
          >
            <h1
              className="text-3xl sm:text-4xl font-bold text-white mb-3"
              style={LETTER_SPACING_STYLE}
            >
              Settings
            </h1>
            <p className="text-white/70 text-base leading-relaxed">
              Manage your profile, privacy preferences, and display options.
            </p>
          </m.div>

          {/* Subscriber Profile Card — only when connected */}
          {connected && publicKey && (
            <div className="mb-6">
              <SubscriberProfileCard address={publicKey} />
            </div>
          )}

          <div className="space-y-6">
            {/* ─── 1. Profile ───────────────────────────────────────────── */}
            <GlassCard hover={false}>
              <SectionHeader icon={User} title="Profile" />
              {!connected ? (
                <p className="text-sm text-white/50">Connect your wallet to edit your profile.</p>
              ) : profileLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="settings-name" className="block text-xs text-white/50 mb-1.5">Display Name</label>
                    <input
                      id="settings-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your display name"
                      maxLength={50}
                      className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-border text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-500/30 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="settings-bio" className="block text-xs text-white/50 mb-1.5">
                      Bio <span className="text-white/30">({bio.length}/280)</span>
                    </label>
                    <textarea
                      id="settings-bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value.slice(0, 280))}
                      placeholder="Tell subscribers about yourself"
                      rows={3}
                      maxLength={280}
                      className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-border text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-500/30 transition-all resize-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="settings-category" className="block text-xs text-white/50 mb-1.5">Category</label>
                    <div className="relative">
                      <select
                        id="settings-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full appearance-none px-4 py-2.5 rounded-lg bg-white/[0.04] border border-border text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-500/30 transition-all"
                      >
                        <option value="" className="bg-black text-white/50">Select a category</option>
                        {CATEGORY_OPTIONS.map((cat) => (
                          <option key={cat} value={cat} className="bg-black text-white">{cat}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="settings-image" className="block text-xs text-white/50 mb-1.5">Profile Image URL</label>
                    <input
                      id="settings-image"
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/avatar.png"
                      maxLength={2048}
                      className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-border text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-500/30 transition-all"
                    />
                  </div>
                  <div className="pt-2">
                    <SaveButton onClick={handleSaveProfile} saving={profileSaving} saved={profileSaved} />
                  </div>
                </div>
              )}
            </GlassCard>

            {/* ─── 2. Privacy Preferences ──────────────────────────────── */}
            <GlassCard hover={false}>
              <SectionHeader icon={Shield} title="Privacy Preferences" />
              <div className="space-y-4">
                <RadioGroup
                  value={privacyMode}
                  onChange={(v) => setPrivacyMode(v as PrivacyMode)}
                  options={[
                    {
                      value: 'standard',
                      label: 'Standard',
                      description: 'Subscriber identity is hashed with Poseidon2 before finalize. Creator can see hashed subscriber ID in mapping.',
                    },
                    {
                      value: 'blind',
                      label: 'Maximum (Blind)',
                      description: 'Nonce-rotated identity via Blind Subscription Protocol. Every renewal generates a new mapping key. Unlinkable across periods.',
                    },
                  ]}
                />
                <div>
                  <button
                    onClick={() => setPrivacyExplainerOpen(!privacyExplainerOpen)}
                    className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    <Info className="w-3.5 h-3.5" />
                    What&apos;s the difference?
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        privacyExplainerOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {privacyExplainerOpen && (
                    <div className="mt-3 p-4 rounded-xl bg-white/[0.02] border border-border text-xs text-white/60 leading-relaxed space-y-2">
                      <p>
                        <strong className="text-white/80">Standard mode</strong> uses Poseidon2 hashing to protect your address,
                        but the same hash is used across renewals. A motivated observer could correlate your subscription periods.
                      </p>
                      <p>
                        <strong className="text-white/80">Blind mode</strong> (BSP Layer 1) adds a random nonce to each subscription,
                        producing a different mapping key every time. This makes it impossible to link your subscription across periods,
                        even for the creator.
                      </p>
                    </div>
                  )}
                </div>
                <div className="pt-2">
                  <SaveButton onClick={handleSavePrivacy} saving={false} saved={privacySaved} label="Save Preference" />
                </div>
              </div>
            </GlassCard>

            {/* ─── 3. Display ─────────────────────────────────────────── */}
            <GlassCard hover={false}>
              <SectionHeader icon={Monitor} title="Display" />
              <div className="space-y-5">
                <div>
                  <p className="text-xs text-white/50 mb-3">Theme</p>
                  <RadioGroup
                    value={themePref}
                    onChange={handleThemeChange}
                    options={[
                      { value: 'dark', label: 'Dark' },
                      { value: 'light', label: 'Light' },
                      { value: 'system', label: 'System', description: 'Follows your OS preference' },
                    ]}
                  />
                </div>
                <div className="border-t border-border/50 pt-5 space-y-4">
                  <Toggle
                    checked={soundsOn}
                    onChange={handleSoundsToggle}
                    label="Sound effects"
                  />
                  <Toggle
                    checked={reducedMotion}
                    onChange={handleReducedMotionToggle}
                    label="Reduced motion"
                  />
                </div>
              </div>
            </GlassCard>

            {/* ─── 4. Wallet ──────────────────────────────────────────── */}
            <GlassCard hover={false}>
              <SectionHeader icon={Wallet} title="Wallet" />
              {!connected ? (
                <p className="text-sm text-white/50">No wallet connected. Connect your Aleo wallet to see details.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-border">
                    <div>
                      <p className="text-xs text-white/50 mb-1">Connected Address</p>
                      <p className="text-sm font-mono text-white/90">
                        {showAddress ? publicKey : shortenAddress(publicKey ?? '', 8)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowAddress(!showAddress)}
                        title={showAddress ? 'Hide full address' : 'Show full address'}
                        aria-label={showAddress ? 'Hide full address' : 'Show full address'}
                        className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-all"
                      >
                        {showAddress ? <EyeOff className="w-4 h-4" aria-hidden="true" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
                      </button>
                      <button
                        onClick={handleCopyAddress}
                        title="Copy address"
                        aria-label="Copy address"
                        className="p-2 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-all"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                        ) : (
                          <Copy className="w-4 h-4" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>
                  {disconnect && (
                    <button
                      onClick={() => {
                        disconnect()
                        toast.success('Wallet disconnected')
                      }}
                      className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/15 transition-all"
                    >
                      Disconnect Wallet
                    </button>
                  )}
                </div>
              )}
            </GlassCard>

            {/* ─── 5. Notifications ───────────────────────────────────── */}
            <GlassCard hover={false}>
              <SectionHeader icon={Bell} title="Notifications" />
              <div className="space-y-4">
                <Toggle
                  checked={notifPrefs.email}
                  onChange={(v) => updateNotifPref('email', v)}
                  label="Email notifications"
                />
                <Toggle
                  checked={notifPrefs.inApp}
                  onChange={(v) => updateNotifPref('inApp', v)}
                  label="In-app notifications"
                />
                <div className="border-t border-border/50 pt-4">
                  <p className="text-xs text-white/50 mb-3">Notify me about</p>
                  <div className="space-y-3">
                    <Toggle
                      checked={notifPrefs.newSubscriber}
                      onChange={(v) => updateNotifPref('newSubscriber', v)}
                      label="New subscriber"
                    />
                    <Toggle
                      checked={notifPrefs.contentPublished}
                      onChange={(v) => updateNotifPref('contentPublished', v)}
                      label="Content published"
                    />
                    <Toggle
                      checked={notifPrefs.subscriptionExpiring}
                      onChange={(v) => updateNotifPref('subscriptionExpiring', v)}
                      label="Subscription expiring"
                    />
                    <Toggle
                      checked={notifPrefs.tipsReceived}
                      onChange={(v) => updateNotifPref('tipsReceived', v)}
                      label="Tips received"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <SaveButton onClick={handleSaveNotifications} saving={notifSaving} saved={notifSaved} label="Save Preferences" />
                </div>

                {/* ── Email Notifications (opt-in) ─────────────────── */}
                {connected && publicKey && (
                  <div className="border-t border-border/50 pt-5 mt-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Mail className="w-4 h-4 text-violet-400" />
                      <p className="text-sm font-medium text-white">Email notifications</p>
                    </div>
                    <p className="text-xs text-white/50 mb-3">
                      Get notified by email when creators you subscribe to publish new content. Your email is stored privately, keyed by a hash of your wallet — not your address.
                    </p>
                    {notifEmailLoading ? (
                      <div className="flex items-center gap-2 py-2">
                        <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                        <span className="text-xs text-white/40">Loading preferences...</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <label htmlFor="notif-email" className="block text-xs text-white/50 mb-1.5">
                            Email address {notifEmailExists && <span className="text-emerald-400">(active)</span>}
                          </label>
                          <input
                            id="notif-email"
                            type="email"
                            value={notifEmail}
                            onChange={(e) => setNotifEmail(e.target.value)}
                            placeholder="you@example.com"
                            maxLength={320}
                            className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-border text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-500/30 transition-all"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <SaveButton
                            onClick={handleSaveNotifEmail}
                            saving={notifEmailSaving}
                            saved={notifEmailSaved}
                            label={notifEmailExists ? 'Update Email' : 'Enable Notifications'}
                          />
                          {notifEmailExists && (
                            <button
                              onClick={handleRemoveNotifEmail}
                              disabled={notifEmailRemoving}
                              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                            >
                              {notifEmailRemoving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              Disable
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-white/30">
                          Your email is never shared. Notifications are sent via Resend. You can disable them at any time.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </GlassCard>

            {/* ─── 6. About ───────────────────────────────────────────── */}
            <GlassCard hover={false}>
              <SectionHeader icon={Info} title="About" />
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-border">
                    <p className="text-xs text-white/50 mb-1">Version</p>
                    <p className="text-sm font-medium text-white">{APP_NAME} v28</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-border">
                    <p className="text-xs text-white/50 mb-1">Program ID</p>
                    <p className="text-sm font-mono text-white/80 break-all">{DEPLOYED_PROGRAM_ID}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Link
                    href="/developers"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/[0.04] border border-border text-sm text-white/70 hover:bg-white/[0.06] hover:text-white transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Docs
                  </Link>
                  <a
                    href="https://github.com/prate3/VeilSub"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/[0.04] border border-border text-sm text-white/70 hover:bg-white/[0.06] hover:text-white transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    GitHub
                  </a>
                </div>
                <p className="text-xs text-white/40 pt-2">
                  Built with zero-knowledge proofs on Aleo. Your subscriptions, payments, and identity remain private by default.
                </p>
              </div>
            </GlassCard>
          </div>
        </div>
      </main>
    </PageTransition>
  )
}
