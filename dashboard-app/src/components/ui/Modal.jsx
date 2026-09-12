import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, size = 'md', mobileSheet = false }) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`relative w-full ${widths[size]} bg-white shadow-xl flex flex-col max-h-[90vh] ${
          mobileSheet
            ? 'rounded-t-3xl sm:rounded-2xl fixed bottom-0 sm:static max-h-[92dvh] sm:max-h-[90vh]'
            : 'rounded-2xl'
        }`}
        style={{ animation: 'modal-in 150ms ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/8">
          <h2 className="font-display font-semibold text-lg text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="min-h-11 min-w-11 p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-ink/6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            <X size={18} />
          </button>
        </div>
        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>

      <style>{`
        @keyframes modal-in {
          from { opacity: 0; transform: scale(0.96) translateY(4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
}
