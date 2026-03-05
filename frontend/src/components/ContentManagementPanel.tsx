'use client'

import { useState, useCallback } from 'react'
import { FileEdit, Trash2, AlertCircle, CheckCircle, Loader2, Lock } from 'lucide-react'
import { useVeilSub } from '@/hooks/useVeilSub'

interface ContentItem {
  contentId: string
  title: string
  minTier: number
  contentHash: string
}

interface ContentManagementPanelProps {
  contents: ContentItem[]
  onRefresh?: () => void
}

export default function ContentManagementPanel({ contents, onRefresh }: ContentManagementPanelProps) {
  const { updateContent, deleteContent, connected } = useVeilSub()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newMinTier, setNewMinTier] = useState(1)
  const [actionStatus, setActionStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleUpdate = useCallback(async (contentId: string, contentHash: string) => {
    if (!connected) return
    setActionStatus(prev => ({ ...prev, [contentId]: 'loading' }))
    try {
      await updateContent(contentId, newMinTier, contentHash)
      setActionStatus(prev => ({ ...prev, [contentId]: 'success' }))
      setEditingId(null)
      onRefresh?.()
      setTimeout(() => setActionStatus(prev => ({ ...prev, [contentId]: 'idle' })), 3000)
    } catch (err: any) {
      setErrors(prev => ({ ...prev, [contentId]: err?.message || 'Update failed' }))
      setActionStatus(prev => ({ ...prev, [contentId]: 'error' }))
    }
  }, [connected, newMinTier, updateContent, onRefresh])

  const handleDelete = useCallback(async (contentId: string) => {
    if (!connected) return
    if (!confirm('Delete this content? This action is recorded on-chain.')) return
    setActionStatus(prev => ({ ...prev, [contentId]: 'loading' }))
    try {
      const reasonHash = `${Date.now()}`
      await deleteContent(contentId, reasonHash)
      setActionStatus(prev => ({ ...prev, [contentId]: 'success' }))
      onRefresh?.()
    } catch (err: any) {
      setErrors(prev => ({ ...prev, [contentId]: err?.message || 'Delete failed' }))
      setActionStatus(prev => ({ ...prev, [contentId]: 'error' }))
    }
  }, [connected, deleteContent, onRefresh])

  if (contents.length === 0) {
    return (
      <div className="rounded-[12px] bg-[#0a0a0a] border border-white/[0.08] p-6 text-center">
        <Lock className="mx-auto mb-3 h-8 w-8 text-[#71717a]" />
        <p className="text-sm text-[#a1a1aa]">No published content yet</p>
        <p className="mt-1 text-xs text-[#71717a]">Use the publish button to add your first gated content</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-[#a1a1aa]">Content Management</h3>
      {contents.map((content) => {
        const status = actionStatus[content.contentId] || 'idle'
        const isEditing = editingId === content.contentId

        return (
          <div
            key={content.contentId}
            className="rounded-[8px] bg-[#0a0a0a] border border-white/[0.08] p-4 transition-all hover:border-white/[0.12]"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{content.title}</p>
                <p className="mt-0.5 text-xs text-[#71717a]">
                  Tier {content.minTier} &middot; ID: {content.contentId.slice(0, 10)}...
                </p>
              </div>
              <div className="flex items-center gap-1.5 ml-3">
                {status === 'loading' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                ) : status === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(isEditing ? null : content.contentId)
                        setNewMinTier(content.minTier)
                      }}
                      className="rounded-lg p-1.5 text-[#a1a1aa] hover:bg-violet-500/10 hover:text-violet-400"
                      title="Edit tier requirement"
                    >
                      <FileEdit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(content.contentId)}
                      className="rounded-lg p-1.5 text-[#a1a1aa] hover:bg-red-500/10 hover:text-red-400"
                      title="Delete content"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Edit tier inline */}
            {isEditing && (
              <div className="mt-3 flex items-center gap-2 pt-3 border-t border-white/[0.08]">
                <span className="text-xs text-[#71717a]">Min tier:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((t) => (
                    <button
                      key={t}
                      onClick={() => setNewMinTier(t)}
                      className={`rounded-md px-2 py-1 text-xs font-medium ${
                        newMinTier === t
                          ? 'bg-violet-500/20 border border-violet-500/40 text-[#a1a1aa]'
                          : 'bg-white/[0.05] border border-white/[0.08] text-[#a1a1aa]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleUpdate(content.contentId, content.contentHash)}
                  className="ml-auto rounded-lg bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-500"
                >
                  Save
                </button>
              </div>
            )}

            {/* Error */}
            {errors[content.contentId] && status === 'error' && (
              <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-500/10 p-2">
                <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-400" />
                <p className="text-[10px] text-red-400">{errors[content.contentId]}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
