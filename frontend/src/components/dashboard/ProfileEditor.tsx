'use client'

import { useState, useEffect, useRef } from 'react'
import { m } from 'framer-motion'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { Settings, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useSupabase } from '@/hooks/useSupabase'
import { clearCreatorCache } from '@/lib/creatorCache'

interface ProfileEditorProps {
  address: string
  onProfileUpdated?: () => void
}

export default function ProfileEditor({ address, onProfileUpdated }: ProfileEditorProps) {
  const { signMessage } = useWallet()
  const { getCreatorProfile, upsertCreatorProfile, error: supabaseError, clearError } = useSupabase()
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const savingRef = useRef(false)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const loadProfile = () => {
    setLoadError(false)
    clearError()
    getCreatorProfile(address).then((profile) => {
      if (profile) {
        setName(profile.display_name || '')
        setBio(profile.bio || '')
      }
      setProfileLoaded(true)
    }).catch(() => {
      setLoadError(true)
      setProfileLoaded(true)
    })
  }

  useEffect(() => {
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  const handleSave = async () => {
    if (savingRef.current) return // Prevent double-submit (ref-based guard)
    savingRef.current = true
    setIsSaving(true)
    try {
      const wrappedSign = signMessage
        ? async (msg: Uint8Array) => {
            const result = await signMessage(msg)
            if (!result) throw new Error('Signing cancelled')
            return result
          }
        : null
      const result = await upsertCreatorProfile(address, name || undefined, bio || undefined, wrappedSign)
      if (result) {
        setSaved(true)
        toast.success('Profile updated!')
        clearCreatorCache() // Invalidate cache so other pages see fresh profile
        onProfileUpdated?.()
        setTimeout(() => setSaved(false), 2000)
      } else {
        toast.error('Profile couldn\u2019t be saved. Approve the signature request in your wallet to continue.')
      }
    } finally {
      savingRef.current = false
      setIsSaving(false)
    }
  }

  if (!profileLoaded) {
    return (
      <div className="p-6 rounded-xl bg-surface-1 border border-border animate-pulse" role="status" aria-live="polite">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded bg-white/10" />
          <div className="h-5 w-20 bg-white/10 rounded" />
        </div>
        <div className="space-y-4">
          <div>
            <div className="h-4 w-24 bg-white/10 rounded mb-1.5" />
            <div className="h-10 bg-white/10 rounded-lg" />
          </div>
          <div>
            <div className="h-4 w-12 bg-white/10 rounded mb-1.5" />
            <div className="h-20 bg-white/10 rounded-lg" />
          </div>
          <div className="h-10 w-28 bg-white/10 rounded-lg" />
        </div>
        <span className="sr-only">Loading profile editor...</span>
      </div>
    )
  }

  // Show load error with retry option
  if (loadError || supabaseError) {
    return (
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-xl bg-surface-1 border border-amber-500/20"
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-400" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-white">Profile</h2>
        </div>
        <p className="text-sm text-white/70 mb-4">
          {supabaseError?.message || 'Failed to load profile. Your network connection may be unstable.'}
        </p>
        <button
          onClick={loadProfile}
          className="px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300 hover:bg-amber-500/20 transition-all inline-flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-0"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Reload profile
        </button>
      </m.div>
    )
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="p-6 rounded-xl bg-surface-1 border border-border"
    >
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-white/60" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-white">Profile</h2>
      </div>
      <div className="space-y-4">
        <div>
          <label htmlFor="profile-name" className="block text-sm text-white/70 mb-1.5">Display name</label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your creator name"
            maxLength={50}
            className="w-full px-4 py-2.5 rounded-lg bg-surface-1 border border-border text-white placeholder-subtle focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/30 transition-all duration-300 text-base"
          />
        </div>
        <div>
          <label htmlFor="profile-bio" className="block text-sm text-white/70 mb-1.5">Bio</label>
          <textarea
            id="profile-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell subscribers what you create..."
            maxLength={200}
            rows={2}
            className="w-full px-4 py-2.5 rounded-lg bg-surface-1 border border-border text-white placeholder-subtle focus:outline-none focus:border-white/30 focus:ring-2 focus:ring-white/30 transition-all duration-300 text-base resize-none"
          />
          <p className="text-[11px] text-white/50 mt-0.5">{bio.length}/200</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          title={isSaving ? 'Saving profile to server...' : 'Save your display name and bio'}
          className="px-5 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white/70 hover:bg-white/[0.08] transition-all duration-300 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {saved ? 'Saved!' : isSaving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </m.div>
  )
}
