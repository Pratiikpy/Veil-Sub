'use client'

import { m } from 'framer-motion'
import { Settings, Info } from 'lucide-react'
import TransactionStatus from '@/components/TransactionStatus'
import { PLATFORM_FEE_PCT } from '@/lib/config'
import type { TxStatus } from '@/types'
import Button from '@/components/ui/Button'

interface RegistrationFormProps {
  price: string
  setPrice: (value: string) => void
  displayName: string
  setDisplayName: (value: string) => void
  bioText: string
  setBioText: (value: string) => void
  txStatus: TxStatus
  txId: string | null
  onRegister: () => void
}

export default function RegistrationForm({
  price,
  setPrice,
  displayName,
  setDisplayName,
  bioText,
  setBioText,
  txStatus,
  txId,
  onRegister,
}: RegistrationFormProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg"
    >
      <div className="p-8 rounded-xl bg-surface-1 border border-border">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-violet-400" />
          <h2 className="text-lg font-semibold text-white">
            Register as Creator
          </h2>
        </div>

        {txStatus === 'idle' || txStatus === 'failed' ? (
          <>
            <div className="mb-6">
              <label htmlFor="reg-price" className="block text-sm text-white/70 mb-2">
                Base subscription price (ALEO credits) <span className="text-red-400" aria-hidden="true">*</span>
              </label>
              <div className="relative">
                <input
                  id="reg-price"
                  type="number"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="5"
                  min="0.000001"
                  max="1000000"
                  step="0.1"
                  required
                  onKeyDown={(e) => e.key === 'Enter' && onRegister()}
                  aria-required="true"
                  aria-invalid={price ? (!Number.isFinite(parseFloat(price)) || parseFloat(price) <= 0) : undefined}
                  aria-describedby={price && (!Number.isFinite(parseFloat(price)) || parseFloat(price) <= 0) ? 'price-error' : undefined}
                  className="w-full px-4 py-4 rounded-lg bg-surface-1 border border-border text-white text-base placeholder-subtle focus:outline-none focus:border-violet-500/[0.3] focus:shadow-accent-md transition-all duration-300"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/60">
                  ALEO
                </span>
              </div>
              {price && (() => {
                const parsedPrice = parseFloat(price)
                return !Number.isFinite(parsedPrice) || parsedPrice <= 0
              })() && (
                <p id="price-error" className="text-xs text-red-400 mt-2" role="alert">
                  Price must be greater than zero.
                </p>
              )}
              <p className="text-xs text-white/60 mt-2">
                Premium tier = 2x, VIP tier = 5x this price.
              </p>
            </div>

            <div className="mb-4">
              <label htmlFor="reg-name" className="block text-sm text-white/70 mb-2">
                Display name (optional)
              </label>
              <input
                id="reg-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your creator name"
                maxLength={50}
                className="w-full px-4 py-4 rounded-lg bg-surface-1 border border-border text-white text-base placeholder-subtle focus:outline-none focus:border-violet-500/[0.3] focus:shadow-accent-md transition-all duration-300"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="reg-bio" className="block text-sm text-white/70 mb-2">
                Bio (optional)
              </label>
              <textarea
                id="reg-bio"
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                placeholder="What you publish (your subscriber list stays private on-chain)..."
                maxLength={200}
                rows={2}
                className="w-full px-4 py-3 rounded-lg bg-surface-1 border border-border text-white text-base placeholder-subtle focus:outline-none focus:border-violet-500/[0.3] focus:shadow-accent-md transition-all duration-300 resize-none"
              />
            </div>

            <div className="p-4 rounded-lg bg-violet-500/5 border border-violet-500/10 mb-6">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" aria-hidden="true" />
                <p className="text-xs text-white/70">
                  You&apos;ll never see who subscribes—only aggregate
                  subscriber count and total revenue. Privacy is the core
                  feature. VeilSub takes a {PLATFORM_FEE_PCT}% platform fee on all subscriptions and tips.
                </p>
              </div>
            </div>

            {txStatus === 'failed' && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                <p className="text-xs text-red-400">Creator registration failed. Check your wallet connection and network status.</p>
              </div>
            )}

            <Button
              onClick={onRegister}
              disabled={(() => {
                const parsedPrice = parseFloat(price)
                return !price || !Number.isFinite(parsedPrice) || parsedPrice <= 0
              })()}
              title={!price ? 'Enter subscription price' : 'Price must be greater than zero'}
              className="w-full"
            >
              {txStatus === 'failed' ? 'Retry' : 'Register as Creator'}
            </Button>
          </>
        ) : (
          <TransactionStatus status={txStatus} txId={txId} />
        )}
      </div>
    </m.div>
  )
}
