import { Settings2, Send, Users, Sparkles } from 'lucide-react'
import { DEFAULT_TIER_NAMES, SECONDS_PER_BLOCK } from '@/lib/config'

export const SOCIAL_PROGRAM_ID = 'veilsub_social_v2.aleo'

export const SOCIAL_FEES = {
  CONFIGURE_DM: 200_000,
  SEND_PAID_MESSAGE: 400_000,
  CREATE_CHAT_ROOM: 200_000,
  JOIN_CHAT_ROOM: 200_000,
  PUBLISH_STORY: 200_000,
  VIEW_STORY: 150_000,
} as const

export const MAX_STORY_DURATION = Math.round((24 * 60 * 60) / SECONDS_PER_BLOCK) // ~24 hours
export const SECONDS_PER_BLOCK_APPROX = SECONDS_PER_BLOCK

export const TABS = [
  { id: 'dm-config', label: 'DM Config', icon: Settings2 },
  { id: 'paid-messages', label: 'Paid Messages', icon: Send },
  { id: 'chat-rooms', label: 'Chat Rooms', icon: Users },
  { id: 'stories', label: 'Stories', icon: Sparkles },
] as const

export type TabId = (typeof TABS)[number]['id']

// Min tier options for DM/chat gating — shows tier numbers only.
// Creator sets the minimum tier required. Actual tier names come from on-chain data.
export const TIER_OPTIONS = Array.from({ length: 20 }, (_, i) => ({
  value: i + 1,
  label: `Tier ${i + 1}${DEFAULT_TIER_NAMES[i + 1] ? ` (${DEFAULT_TIER_NAMES[i + 1]})` : ''}`,
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatBlockCountdown(blocksRemaining: number): string {
  if (blocksRemaining <= 0) return 'Expired'
  const totalSeconds = blocksRemaining * SECONDS_PER_BLOCK_APPROX
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return '< 1m'
}

export function formatDurationBlocks(blocks: number): string {
  const totalSeconds = blocks * SECONDS_PER_BLOCK_APPROX
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours > 0) return `~${hours}h ${minutes > 0 ? `${minutes}m` : ''}`
  return `~${minutes}m`
}

/**
 * Hash arbitrary content to an Aleo-field-safe bigint string.
 * Uses SHA-256 with first 16 bytes, constrained to BLS12-377 field.
 */
export async function hashToField(content: string): Promise<string> {
  const bytes = new TextEncoder().encode(content)
  const hashBuf = await crypto.subtle.digest('SHA-256', bytes)
  const hashArray = new Uint8Array(hashBuf)
  let bigint = BigInt(0)
  for (let i = 0; i < 16; i++) {
    bigint = bigint * BigInt(256) + BigInt(hashArray[i])
  }
  const maxField = BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239041')
  return (bigint % maxField).toString()
}
