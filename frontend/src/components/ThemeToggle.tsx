'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { sounds } from '@/lib/sounds'

type Theme = 'dark' | 'light'

function getStoredTheme(): Theme | null {
  if (typeof localStorage === 'undefined') return null
  const stored = localStorage.getItem('veilsub_theme')
  if (stored === 'light' || stored === 'dark') return stored
  return null
}

function getSystemPreference(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

function applyTheme(theme: Theme) {
  if (theme === 'light') {
    document.documentElement.classList.add('light')
  } else {
    document.documentElement.classList.remove('light')
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = getStoredTheme()
    const resolved = stored ?? getSystemPreference()
    setTheme(resolved)
    applyTheme(resolved)
    setMounted(true)
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem('veilsub_theme', next)
    } catch { /* localStorage full or unavailable */ }
    applyTheme(next)
    sounds.toggle()
  }

  // Avoid hydration mismatch — render neutral placeholder until mounted
  if (!mounted) {
    return (
      <div className="p-2 w-8 h-8 rounded-lg" aria-hidden="true" />
    )
  }

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-white/5 transition-colors focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun size={16} className="text-white/50" />
      ) : (
        <Moon size={16} className="text-black/50" />
      )}
    </button>
  )
}
