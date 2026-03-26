'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'

const CreatePostForm = dynamic(() => import('@/components/CreatePostForm'), { ssr: false })

export default function FloatingComposeButton() {
  const [open, setOpen] = useState(false)
  const { connected, address } = useWallet()
  const pathname = usePathname()

  // Don't show on dashboard (has its own compose), landing page, or when not connected
  if (!connected || !address || pathname === '/' || pathname.startsWith('/dashboard')) return null

  return (
    <>
      {/* Floating action button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-20 md:bottom-8 right-6 md:right-[270px] z-50 w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
        aria-label={open ? 'Close compose' : 'Create post'}
      >
        {open ? <X size={24} /> : <Plus size={24} />}
      </button>

      {/* Compose overlay */}
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-surface-1 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Create Post</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-white/50 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <CreatePostForm
              creatorAddress={address}
              onPostCreated={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
