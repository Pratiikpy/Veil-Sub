'use client'

import { useState, useEffect } from 'react'
import { m } from 'framer-motion'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { Settings, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useSupabase } from '@/hooks/useSupabase'

interface ProfileEditorProps {
  address: string
}

export default function ProfileEditor({ address }: ProfileEditorProps) {
  const { signMessage } = useWallet()
  const { getCreatorProfile, upsertCreatorProfile, error: supabaseError, clearError } = useSupabase()
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [saved, setSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
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
    if (isSaving) return // Prevent double-submit
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
        toast.success('Profile saved!')
        setTimeout(() => setSaved(false), 2000)
      } else {
        toast.error('Failed to save profile. Please try again.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (!profileLoaded) return null

  // Show load error with retry option
  if (loadError || supabaseError) {
    return (
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-xl bg-surface-1 border border-amber-500/20"
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-amber-400" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-white">Profile</h2>
        </div>
        <p className="text-sm text-white/70 mb-4">
          {supabaseError?.message || 'Failed to load profile. Your network connection may be unstable.'}
        </p>
        <button
          onClick={loadProfile}
          className="px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300 hover:bg-amber-500/20 transition-all inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Retry
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
        <Settings className="w-5 h-5 text-violet-400" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-white">Profile</h2>
      </div>
      <div className="space-y-3">
        <div>
          <label htmlFor="profile-name" className="block text-sm text-white/70 mb-1.5">Display name</label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your creator name"
            maxLength={50}
            className="w-full px-4 py-2.5 rounded-lg bg-surface-1 border border-border text-white placeholder-subtle focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-400/50 transition-all duration-300 text-base"
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
            className="w-full px-4 py-2.5 rounded-lg bg-surface-1 border border-border text-white placeholder-subtle focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-400/50 transition-all duration-300 text-base resize-none"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          title={isSaving ? 'Saving profile to server...' : 'Save your display name and bio'}
          className="px-5 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300 hover:bg-violet-500/20 transition-all duration-300 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {saved ? 'Saved!' : isSaving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </m.div>
  )
}
