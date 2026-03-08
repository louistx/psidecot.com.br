import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open:     boolean
  onClose:  () => void
  title:    string
  children: React.ReactNode
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-[fadeIn_.2s_ease-out]"
      style={{ background: 'color-mix(in srgb, var(--color-bg) 78%, transparent)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full sm:max-w-[580px] max-h-[90dvh] overflow-y-auto animate-[slideUp_.28s_cubic-bezier(.4,0,.2,1)] shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="sticky top-0 bg-card flex items-center justify-between px-6 py-5 border-b border-border z-10">
          <h2 className="font-serif text-xl font-light italic text-fg">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-fg hover:bg-fg/5 rounded-lg p-1.5 transition-all"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  )
}
