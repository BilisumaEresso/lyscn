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

  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-4xl',
    '4xl': 'max-w-5xl',
    '5xl': 'max-w-6xl',
    full: 'max-w-[96vw]',
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex justify-center ${
        mobileSheet
          ? 'items-end sm:items-center p-0 sm:p-4'
          : 'items-center p-4'
      }`}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/50 backdrop-blur-xs transition-opacity z-0"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel: strictly relative z-10 so it is always above the backdrop on all screen sizes */}
      <div
        className={`relative z-10 w-full ${widths[size]} bg-white shadow-2xl flex flex-col ${
          mobileSheet
            ? 'rounded-t-3xl sm:rounded-2xl max-h-[90dvh] sm:max-h-[90vh]'
            : 'rounded-2xl max-h-[90vh]'
        }`}
        style={{ animation: 'modal-in 150ms ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink/8 shrink-0">
          <h2 className="font-display font-semibold text-lg text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="min-h-11 min-w-11 p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-ink/6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal flex items-center justify-center"
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
