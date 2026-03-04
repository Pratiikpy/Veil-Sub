'use client'

import { motion } from 'framer-motion'
import { ShieldCheck, X, ExternalLink } from 'lucide-react'

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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-5 rounded-xl border ${
        success
          ? 'bg-green-500/5 border-green-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
          : 'bg-red-500/5 border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.15)]'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            success ? 'bg-green-500/15' : 'bg-red-500/15'
          }`}
        >
          {success ? (
            <ShieldCheck className="w-5 h-5 text-green-400" />
          ) : (
            <X className="w-5 h-5 text-red-400" />
          )}
        </div>
        <div>
          <p
            className={`font-semibold ${
              success ? 'text-green-300' : 'text-red-300'
            }`}
          >
            {success ? 'Access Verified' : 'Verification Failed'}
          </p>
          <p className="text-xs text-[#71717a]">
            {success
              ? 'ZK proof confirms valid AccessPass ownership'
              : 'Could not verify this AccessPass'}
          </p>
        </div>
      </div>

      {success && passTier && passCreator && (
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-xs">
            <span className="text-[#71717a]">Tier</span>
            <span className="text-white">{passTier}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-[#71717a]">Creator</span>
            <span className="text-[#a1a1aa] font-mono text-[10px]">
              {passCreator}
            </span>
          </div>
        </div>
      )}

      {txId && (
        txId.startsWith('at1') ? (
          <a
            href={`https://testnet.explorer.provable.com/transaction/${txId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#a1a1aa] hover:text-white"
          >
            View on Explorer
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <a
            href="https://testnet.explorer.provable.com/program/veilsub_v15.aleo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#a1a1aa] hover:text-white"
          >
            View program on Explorer
            <ExternalLink className="w-3 h-3" />
          </a>
        )
      )}
    </motion.div>
  )
}
