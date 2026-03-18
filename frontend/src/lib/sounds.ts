'use client'

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext()
    } catch {
      return null
    }
  }
  return audioCtx
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume: number = 0.08
) {
  const ctx = getCtx()
  if (!ctx) return
  // Check if sounds are enabled (off by default)
  if (
    typeof localStorage !== 'undefined' &&
    localStorage.getItem('veilsub_sounds') !== 'on'
  )
    return

  // Resume context if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') {
    ctx.resume()
  }

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.value = volume
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    ctx.currentTime + duration / 1000
  )
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + duration / 1000)
}

export const sounds = {
  /** 3 ascending notes: C5, E5, G5 */
  success: () => {
    playTone(523, 100)
    setTimeout(() => playTone(659, 100), 80)
    setTimeout(() => playTone(784, 150), 160)
  },
  /** E4, gentle single tone */
  error: () => playTone(330, 80, 'sine', 0.06),
  /** Quick tick */
  click: () => playTone(1000, 20, 'sine', 0.04),
  /** Toggle switch sound */
  toggle: () => playTone(800, 30, 'sine', 0.04),
  /** A5 then E6 — two-note alert */
  notification: () => {
    playTone(880, 60)
    setTimeout(() => playTone(1320, 80), 60)
  },
  /** Warm confirmation: G3 -> C4 */
  subscribe: () => {
    playTone(196, 100, 'triangle', 0.06)
    setTimeout(() => playTone(262, 150, 'triangle', 0.06), 100)
  },
}

/** Enable or disable UI sound effects */
export function setSoundsEnabled(enabled: boolean) {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('veilsub_sounds', enabled ? 'on' : 'off')
    } catch { /* localStorage full or unavailable */ }
  }
}

/** Check if UI sound effects are enabled (off by default) */
export function isSoundsEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem('veilsub_sounds') === 'on'
}
