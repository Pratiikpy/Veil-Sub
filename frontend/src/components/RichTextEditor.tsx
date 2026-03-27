'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Youtube from '@tiptap/extension-youtube'
import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Upload,
  Youtube as YoutubeIcon,
  Undo,
  Redo,
  Minus,
} from 'lucide-react'
import { authenticatedFetch } from '@/lib/authenticatedFetch'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  /** Wallet address for authenticated uploads. If not provided, uploads will fail with auth error. */
  walletAddress?: string | null
}

interface UrlInputState {
  type: 'link' | 'image' | 'youtube' | null
  url: string
  mode?: 'url' | 'upload' // for image: choose between URL paste or file upload
}

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`p-1.5 rounded-md transition-all duration-150 focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0 ${
        active
          ? 'bg-white/[0.08] text-white/70'
          : disabled
            ? 'text-white/20 cursor-not-allowed'
            : 'text-white/60 hover:text-white hover:bg-white/[0.08]'
      }`}
    >
      {children}
    </button>
  )
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-white/[0.08] mx-0.5" />
}

export default function RichTextEditor({ content, onChange, placeholder, walletAddress }: RichTextEditorProps) {
  const [urlInput, setUrlInput] = useState<UrlInputState>({ type: null, url: '' })
  const [imageUploading, setImageUploading] = useState(false)
  const inlineFileRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: { HTMLAttributes: { class: 'rich-code-block' } },
        blockquote: { HTMLAttributes: { class: 'rich-blockquote' } },
      }),
      Image.configure({
        HTMLAttributes: { class: 'rich-image' },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'rich-link',
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Write your exclusive content...',
      }),
      Youtube.configure({
        HTMLAttributes: { class: 'rich-youtube' },
        nocookie: false, // nocookie domain gets "refused to connect" on some networks
        width: 640,
        height: 360,
      }),
    ],
    content,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'rich-editor-content',
      },
    },
  })

  // Sync external content changes (e.g., form reset)
  useEffect(() => {
    if (editor && content === '' && editor.getHTML() !== '<p></p>') {
      editor.commands.clearContent()
    }
  }, [editor, content])

  const openUrlInput = useCallback((type: 'link' | 'image' | 'youtube') => {
    setUrlInput({ type, url: '' })
  }, [])

  const closeUrlInput = useCallback(() => {
    setUrlInput({ type: null, url: '' })
  }, [])

  const handleUrlSubmit = useCallback(() => {
    if (!editor || !urlInput.url.trim()) return

    const url = urlInput.url.trim()

    if (urlInput.type === 'link') {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    } else if (urlInput.type === 'image') {
      editor.chain().focus().setImage({ src: url }).run()
    } else if (urlInput.type === 'youtube') {
      editor.chain().focus().setYoutubeVideo({ src: url }).run()
    }

    closeUrlInput()
  }, [editor, urlInput, closeUrlInput])

  const handleInlineImageUpload = useCallback(async (file: File) => {
    if (!editor) return
    const maxSize = 5 * 1024 * 1024
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

    if (!validTypes.includes(file.type)) return
    if (file.size > maxSize) return

    if (!walletAddress) {
      // Cannot upload without wallet authentication
      return
    }

    setImageUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await authenticatedFetch('/api/upload', {
        walletAddress,
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (res.ok && data.url) {
        editor.chain().focus().setImage({ src: data.url }).run()
      }
    } catch {
      // Silently fail — user can try again
    } finally {
      setImageUploading(false)
      closeUrlInput()
    }
  }, [editor, closeUrlInput, walletAddress])

  const handleInlineFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleInlineImageUpload(file)
    if (e.target) e.target.value = ''
  }, [handleInlineImageUpload])

  if (!editor) return null

  return (
    <div className="rounded-xl border border-border bg-white/[0.03] overflow-hidden focus-within:border-white/30 focus-within:ring-2 focus-within:ring-white/30 transition-all">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-white/[0.02]">
        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet list"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered list"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Block elements */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Code block"
        >
          <Code className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Divider"
        >
          <Minus className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Media */}
        <ToolbarButton
          onClick={() => openUrlInput('link')}
          active={editor.isActive('link')}
          title="Insert link"
        >
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => inlineFileRef.current?.click()}
          disabled={imageUploading}
          title="Upload image"
        >
          <Upload className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => openUrlInput('image')}
          title="Insert image from URL"
        >
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => openUrlInput('youtube')}
          title="Embed YouTube video"
        >
          <YoutubeIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* History */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* URL Input Bar */}
      {urlInput.type && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-white/[0.04]">
          <span className="text-xs text-white/60 shrink-0">
            {urlInput.type === 'link' ? 'Link URL:' : urlInput.type === 'image' ? 'Image URL:' : 'YouTube URL:'}
          </span>
          <input
            type="url"
            value={urlInput.url}
            onChange={(e) => setUrlInput((prev) => ({ ...prev, url: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleUrlSubmit() }
              if (e.key === 'Escape') closeUrlInput()
            }}
            placeholder={
              urlInput.type === 'link'
                ? 'https://example.com'
                : urlInput.type === 'image'
                  ? 'https://example.com/image.jpg'
                  : 'https://www.youtube.com/watch?v=...'
            }
            maxLength={2048}
            autoFocus
            className="flex-1 px-2 py-1 rounded-md bg-white/[0.05] border border-border text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            disabled={!urlInput.url.trim()}
            title={!urlInput.url.trim() ? 'Enter a URL to insert' : 'Insert URL'}
            className="px-3 py-1 rounded-md text-xs font-medium bg-white/[0.08] text-white/70 border border-white/15 hover:bg-white/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
          >
            Insert
          </button>
          <button
            type="button"
            onClick={closeUrlInput}
            className="px-2 py-1 rounded-md text-xs text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Hidden file input for inline image upload */}
      <input
        ref={inlineFileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleInlineFileSelect}
        className="hidden"
        aria-label="Upload inline image"
      />

      {/* Upload indicator */}
      {imageUploading && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-white/[0.02] text-xs text-white/70" role="status" aria-live="polite">
          <div className="w-3 h-3 border-2 border-white/30 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          Uploading image...
        </div>
      )}

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  )
}
