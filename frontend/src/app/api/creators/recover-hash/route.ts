import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase'
import { hashAddress } from '@/lib/encryption'
import { ALEO_ADDRESS_RE, DEPLOYED_PROGRAM_ID } from '@/lib/config'
import { rateLimit, getRateLimitResponse, getClientIp } from '@/lib/rateLimit'

const PROVABLE_BASE = 'https://api.explorer.provable.com/v1/testnet'

/**
 * Recovers the creator_hash for an address that registered before Supabase
 * persistence was in place.
 *
 * Flow:
 *  1. Fetch address transitions from Provable API
 *  2. Find the register_creator transition
 *  3. Fetch the full transaction to get finalize args
 *  4. Extract finalize[0] as the creator_hash (Poseidon2 field)
 *  5. Persist to Supabase so future loads don't need this recovery
 *  6. Return the hash to the client
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = rateLimit(`${ip}:creators:recover`, 60)
  if (!allowed) return getRateLimitResponse()

  const address = req.nextUrl.searchParams.get('address')
  if (!address || !ALEO_ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: 'Valid Aleo address required' }, { status: 400 })
  }

  try {
    // Fast path: check Supabase first — already persisted from a previous registration
    const supabase = getServerSupabase()
    if (supabase) {
      const addressHashValue = await hashAddress(address)
      const { data } = await supabase
        .from('creator_profiles')
        .select('creator_hash')
        .eq('address_hash', addressHashValue)
        .single()
      if (data?.creator_hash && typeof data.creator_hash === 'string' && data.creator_hash.endsWith('field')) {
        return NextResponse.json({ creator_hash: data.creator_hash }, {
          headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
        })
      }
    }

    // Slow path: Step 1: Fetch recent transitions for this address
    const transRes = await fetch(
      `${PROVABLE_BASE}/address/${encodeURIComponent(address)}/transitions?page=0&maxItems=50`,
      { next: { revalidate: 0 } }
    )
    if (!transRes.ok) {
      return NextResponse.json({ error: 'Could not fetch address transitions' }, { status: 502 })
    }
    const transitions: unknown[] = await transRes.json()
    if (!Array.isArray(transitions)) {
      return NextResponse.json({ error: 'Unexpected transitions format' }, { status: 502 })
    }

    // Step 2: Find register_creator transition
    const regTransition = transitions.find((t) => {
      if (typeof t !== 'object' || t === null) return false
      const obj = t as Record<string, unknown>
      const program = obj.program_id ?? obj.program
      const fn = obj.function_name ?? obj.function
      return program === DEPLOYED_PROGRAM_ID && fn === 'register_creator'
    }) as Record<string, unknown> | undefined

    if (!regTransition) {
      return NextResponse.json({ error: 'No register_creator transition found for this address' }, { status: 404 })
    }

    // Step 3: Fetch the full transaction
    const txId = regTransition.transaction_id ?? regTransition.tx_id
    if (typeof txId !== 'string') {
      return NextResponse.json({ error: 'Could not determine transaction ID' }, { status: 502 })
    }

    const txRes = await fetch(`${PROVABLE_BASE}/transaction/${encodeURIComponent(txId)}`)
    if (!txRes.ok) {
      return NextResponse.json({ error: 'Could not fetch transaction' }, { status: 502 })
    }
    const tx = await txRes.json()

    // Step 4: Extract creator_hash from outputs[0].value (Leo future string)
    // Provable API v1 has no finalize[] array — hash is in outputs[0].value:
    // "{ program_id: ..., arguments: [\n  12345field,\n  3000000u64\n] }"
    const outputValue = tx?.execution?.transitions?.[0]?.outputs?.[0]?.value
    const hashMatch = typeof outputValue === 'string'
      ? outputValue.match(/arguments:\s*\[\s*(\d+field)/)
      : null
    const hash = hashMatch?.[1]

    if (!hash || !hash.endsWith('field')) {
      return NextResponse.json({ error: 'Could not extract creator hash from transaction' }, { status: 404 })
    }

    // Step 5: Persist to Supabase so future loads don't need recovery
    try {
      const supabase = getServerSupabase()
      if (supabase) {
        const addressHashValue = await hashAddress(address)
        await supabase
          .from('creator_profiles')
          .upsert({ address_hash: addressHashValue, creator_hash: hash }, { onConflict: 'address_hash' })
      }
    } catch {
      // Non-critical — still return the hash even if Supabase write fails
    }

    return NextResponse.json({ creator_hash: hash }, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
    })
  } catch {
    return NextResponse.json({ error: 'Internal error during hash recovery' }, { status: 500 })
  }
}
