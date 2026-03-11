'use client'

import { m } from 'framer-motion'
import { ShieldCheck, X, ExternalLink, CheckCircle2, EyeOff, Lock } from 'lucide-react'
import { PROGRAM_ID } from '@/lib/config'

interface Props {
  success: boolean
  txId?: string | null
  passCreator?: string
  passTier?: string
}

export default function VerificationResult({
  success,
  txId,
  passCreator,
  passTier,
}: Props) {
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative overflow-hidden p-6 rounded-xl border ${
        success
          ? 'bg-green-500/5 border-green-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
          : 'bg-red-500/5 border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.15)]'
      }`}
    >
      {/* Success glow effect */}
      {success && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl pointer-events-none"
        />
      )}

      <div className="relative flex items-center gap-4 mb-4">
        <m.div
          initial={success ? { scale: 0 } : {}}
          animate={success ? { scale: 1 } : {}}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className={`w-12 h-12 rounded-full flex items-center justify-center ${
            success ? 'bg-green-500/15' : 'bg-red-500/15'
          }`}
        >
          {success ? (
            <ShieldCheck className="w-6 h-6 text-green-400" aria-hidden="true" />
          ) : (
            <X className="w-6 h-6 text-red-400" aria-hidden="true" />
          )}
        </m.div>
        <div>
          <p
            className={`font-semibold text-lg ${
              success ? 'text-green-300' : 'text-red-300'
            }`}
          >
            {success ? 'Access Verified' : 'Verification Failed'}
          </p>
          <p className="text-xs text-white/60">
            {success
              ? 'Zero-knowledge proof successful'
              : 'Could not verify this AccessPass'}
          </p>
        </div>
      </div>

      {success && passTier && passCreator && (
        <>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-xs">
              <span className="text-white/60">Tier</span>
              <span className="text-white">{passTier}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-white/60">Creator</span>
              <span className="text-white/70 font-mono text-[10px]">
                {passCreator}
              </span>
            </div>
          </div>

          {/* Privacy proof summary */}
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-4 p-3 rounded-lg bg-green-500/5 border border-green-500/10"
          >
            <p className="text-xs text-green-300/90 font-medium mb-2">What was proven:</p>
            <div className="space-y-1.5">
              {[
                { icon: CheckCircle2, text: 'Valid AccessPass ownership' },
                { icon: Lock, text: 'Pass not revoked (pass_id check)' },
                { icon: EyeOff, text: 'Your address never reached finalize' },
              ].map((item, i) => {
                const Icon = item.icon
                return (
                  <m.div
                    key={item.text}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex items-center gap-2 text-xs text-white/70"
                  >
                    <Icon className="w-3 h-3 text-green-400" aria-hidden="true" />
                    <span>{item.text}</span>
                  </m.div>
                )
              })}
            </div>
          </m.div>
        </>
      )}

      {txId && (
        txId.startsWith('at1') ? (
          <a
            href={`https://testnet.explorer.provable.com/transaction/${txId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-white/70 hover:text-white"
          >
            View on Explorer
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        ) : (
          <a
            href={`https://testnet.aleoscan.io/program?id=${PROGRAM_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-white/70 hover:text-white"
          >
            View program on Explorer
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        )
      )}
    </m.div>
  )
}
