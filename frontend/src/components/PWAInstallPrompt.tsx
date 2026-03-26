'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const DISMISSED_KEY = 'veilsub_pwa_dismissed'

export default function PWAInstallPrompt() {
  const [show, setShow] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try { if (localStorage.getItem(DISMISSED_KEY)) return } catch { return }

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt.current) return
    deferredPrompt.current.prompt()
    await deferredPrompt.current.userChoice
    deferredPrompt.current = null
    setShow(false)
  }, [])

  const dismiss = useCallback(() => {
    setShow(false)
    try { localStorage.setItem(DISMISSED_KEY, '1') } catch { /* quota */ }
  }, [])

  if (!show) return null

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-xl border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-md p-4 shadow-xl shadow-white/[0.02]">
        <p className="text-sm text-white/80 mb-3">Add VeilSub to your home screen for quick access</p>
        <div className="flex items-center gap-2">
          <button onClick={install} className="px-3 py-1.5 rounded-lg bg-white text-black hover:bg-white/90 text-white text-xs font-medium transition-colors">
            Install
          </button>
          <button onClick={dismiss} className="px-3 py-1.5 rounded-lg text-white/50 hover:text-white/60 text-xs transition-colors">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
