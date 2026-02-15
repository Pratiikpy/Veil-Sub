'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  isOpen: boolean
  onClose: () => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ScannerComponent = React.ComponentType<any>

export default function QRScanner({ isOpen, onClose }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [Scanner, setScanner] = useState<ScannerComponent | null>(null)

  // Dynamically import the QR scanner on open
  const loadScanner = useCallback(async () => {
    try {
      const mod = await import('@yudiel/react-qr-scanner')
      setScanner(() => mod.Scanner as ScannerComponent)
    } catch {
      setError('QR scanner not available. Enter the address manually.')
    }
  }, [])

  // Load when opened; cleanup error timer on unmount
  useEffect(() => {
    if (isOpen && !Scanner) loadScanner()
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    }
  }, [isOpen, Scanner, loadScanner])

  const handleDecode = (result: string) => {
    // Extract aleo1... address from scanned text
    const match = result.match(/aleo1[a-z0-9]{58}/)
    if (match) {
      onClose()
      router.push(`/creator/${match[0]}`)
    } else {
      setError('No valid Aleo address found in QR code')
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      errorTimerRef.current = setTimeout(() => setError(null), 3000)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-[#13111c] border border-white/10 p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-violet-400" />
                <h3 className="text-lg font-semibold text-white">Scan QR Code</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/5 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-black aspect-square mb-4">
              {Scanner ? (
                <Scanner
                  onDecode={handleDecode}
                  onError={() => setError('Camera access denied')}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <p className="text-xs text-slate-500 text-center">
              Point your camera at a creator&apos;s QR code to visit their page
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
