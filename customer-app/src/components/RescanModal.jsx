import { QrCode, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RescanModal({ onDismiss }) {
  const navigate = useNavigate();

  const handleScan = () => {
    if (onDismiss) onDismiss();
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full text-center shadow-2xl border border-ink/10 relative overflow-hidden">
        {/* Top accent */}
        <div
          className="absolute top-0 left-0 right-0 h-2"
          style={{ background: 'var(--color-primary, #0D9488)' }}
        />

        <div className="w-16 h-16 rounded-2xl bg-teal/10 text-teal flex items-center justify-center mx-auto mb-4 mt-2">
          <QrCode size={32} />
        </div>

        <h3 className="font-display font-bold text-lg text-ink mb-1.5">
          Please Rescan Table QR Code
        </h3>
        <p className="text-xs text-ink-muted leading-relaxed mb-5">
          Your table session has ended or needs re-verification. To take a seat and ensure your orders are delivered to your table, please scan the QR code at your table.
        </p>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleScan}
            className="w-full py-3.5 px-4 rounded-2xl text-white font-semibold text-sm shadow-md active:scale-98 flex items-center justify-center gap-2"
            style={{ background: 'var(--color-primary, #0D9488)' }}
          >
            <QrCode size={16} />
            <span>Scan QR Code on Table</span>
          </button>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="w-full py-2.5 px-4 rounded-2xl bg-ink/5 hover:bg-ink/10 text-ink text-xs font-semibold"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
