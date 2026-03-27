import type { AccessPass } from './types'

export function parseAccessPass(plaintext: string): AccessPass | null {
  try {
    const fields: Record<string, string> = {}
    const matches = plaintext.matchAll(/(\w+)\s*:\s*([^,}]+)/g)
    for (const m of matches) {
      let val = m[2].trim()
      val = val.replace(/\.private$/, '').replace(/\.public$/, '')
      val = val.replace(/^(-?\d+)(u8|u16|u32|u64|u128|i8|i16|i32|i64|i128)$/, '$1')
      fields[m[1]] = val
    }

    const tier = parseInt(fields.tier ?? '', 10)
    const expiresAt = parseInt(fields.expires_at ?? '', 10)
    const privacyLevel = parseInt(fields.privacy_level ?? '0', 10)

    if (!fields.owner || !fields.creator || isNaN(tier) || tier < 1 || tier > 20 || isNaN(expiresAt)) {
      return null
    }

    return {
      owner: fields.owner,
      creator: fields.creator,
      tier,
      passId: fields.pass_id || '',
      expiresAt,
      privacyLevel: isNaN(privacyLevel) ? 0 : privacyLevel,
    }
  } catch {
    return null
  }
}

export function parseCreatorReceipt(plaintext: string): {
  owner: string
  subscriberHash: string
  tier: number
  amount: number
  passId: string
} | null {
  try {
    const fields: Record<string, string> = {}
    const matches = plaintext.matchAll(/(\w+)\s*:\s*([^,}]+)/g)
    for (const m of matches) {
      let val = m[2].trim()
      val = val.replace(/\.private$/, '').replace(/\.public$/, '')
      val = val.replace(/^(-?\d+)(u8|u16|u32|u64|u128)$/, '$1')
      fields[m[1]] = val
    }

    const tier = parseInt(fields.tier ?? '', 10)
    const amount = parseInt(fields.amount ?? '', 10)

    if (!fields.owner || !fields.subscriber_hash || isNaN(tier) || isNaN(amount)) return null

    return {
      owner: fields.owner,
      subscriberHash: fields.subscriber_hash,
      tier,
      amount,
      passId: fields.pass_id || '',
    }
  } catch {
    return null
  }
}
