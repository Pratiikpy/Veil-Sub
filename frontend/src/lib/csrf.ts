/**
 * CSRF protection via Origin / Referer header validation.
 *
 * Added to all POST/PUT/DELETE API routes to prevent cross-site
 * request forgery from malicious third-party pages.
 */

import { NextRequest } from 'next/server'

export function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  const host = req.headers.get('host')

  // Allow same-origin requests
  if (origin) {
    const allowed: string[] = [
      'http://localhost:3000',
      'http://localhost:3001',
    ]
    // Also allow the actual host
    if (host) allowed.push(`https://${host}`)
    return allowed.some(a => origin.startsWith(a)) || origin.endsWith('.veil-sub.vercel.app') || origin === 'https://veil-sub.vercel.app'
  }

  // Fallback: check referer
  if (referer && host) {
    return referer.includes(host) || referer.includes('localhost')
  }

  // No origin or referer -- could be server-to-server or non-browser.
  // Block for safety on write operations.
  return false
}
