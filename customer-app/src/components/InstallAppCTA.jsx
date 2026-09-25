import { useState } from 'react';
import { Download, Smartphone, X, Sparkles, Check, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import logo from '../assets/logo.png';

/**
 * InstallAppCTA — High-conversion Customer App Installation CTA.
 * Encourages diners to install LayoScan to their home screen for instant food alerts,
 * faster reordering, and offline menu browsing.
 */
export default function InstallAppCTA({ variant = 'banner', className = '' }) {
  const { canInstall, isInstalled, promptInstall, isIOS } = useInstallPrompt();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // If already installed or dismissed in this view, do not display
  if (isInstalled || dismissed) return null;

  const handleInstallClick = async () => {
    if (canInstall) {
      const accepted = await promptInstall();
      if (accepted) setDismissed(true);
    } else {
      setShowIOSModal(true);
    }
  };

  return (
    <>
      {/* ── Card Variant (For Menu and OrderTracking pages) ─────────────── */}
      {variant === 'card' && (
        <div
          className={clsx(
            'relative overflow-hidden rounded-3xl p-4 border border-ink/10 shadow-xs bg-white text-ink animate-in fade-in slide-in-from-bottom-2 duration-300',
            className
          )}
        >
          {/* Subtle brand tint gradient */}
          <div
            className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl opacity-10 pointer-events-none"
            style={{ background: 'var(--color-primary, #0D9488)' }}
          />

          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-paper flex items-center justify-center border border-ink/8 p-1 shrink-0 shadow-2xs">
                <img src={logo} alt="LayoScan" className="w-full h-full object-cover rounded-xl" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal/10 text-teal">
                    Instant App
                  </span>
                  <span className="text-xs font-semibold text-ink">LayoScan</span>
                </div>
                <h4 className="font-display font-bold text-sm text-ink leading-tight mt-0.5">
                  Install for Instant Order Alerts
                </h4>
                <p className="text-xs text-ink-muted leading-relaxed mt-0.5">
                  Get phone notifications on your lock screen when your food is ready.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss install suggestion"
              className="text-ink-muted hover:text-ink p-1 rounded-lg shrink-0"
            >
              <X size={15} />
            </button>
          </div>

          <div className="mt-3.5 flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex-1 py-2.5 px-4 rounded-xl text-white font-bold text-xs shadow-sm active:scale-98 transition-all flex items-center justify-center gap-1.5"
              style={{ background: 'var(--color-primary, #0D9488)' }}
            >
              <Download size={14} />
              <span>Install App Now</span>
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="py-2.5 px-3 rounded-xl text-xs font-semibold text-ink-muted hover:bg-ink/5 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* ── Banner Variant (Slim header / landing bar) ─────────────────── */}
      {variant === 'banner' && (
        <div
          className={clsx(
            'rounded-2xl p-3 bg-paper border border-ink/8 flex items-center justify-between gap-3 shadow-2xs animate-in fade-in duration-200',
            className
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-ink/5 flex items-center justify-center shrink-0">
              <Smartphone size={16} className="text-teal" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink truncate leading-tight">
                Install LayoScan App
              </p>
              <p className="text-[11px] text-ink-muted truncate">
                Get lock-screen food alerts & 1-tap reordering
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl font-bold text-xs text-white shadow-2xs active:scale-95 transition-all flex items-center gap-1"
              style={{ background: 'var(--color-primary, #0D9488)' }}
            >
              <Download size={12} />
              <span>Install</span>
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="p-1 text-ink-muted hover:text-ink rounded-lg"
              aria-label="Dismiss banner"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── iOS & Fallback Installation Guide Modal ───────────────────────── */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-ink/10 relative text-left">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-ink-muted hover:text-ink hover:bg-ink/5"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-teal/15 text-teal flex items-center justify-center mb-4">
              <Smartphone size={26} />
            </div>

            <h3 className="font-display font-bold text-base text-ink mb-1">
              Install LayoScan App
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed mb-4">
              Add LayoScan directly to your home screen for the fastest dining experience and live lock screen notifications.
            </p>

            <div className="space-y-3 bg-paper p-3.5 rounded-2xl border border-ink/6 text-xs text-ink mb-5">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-teal text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      1
                    </span>
                    <p>
                      Tap the <strong>Share</strong> button <span className="font-mono text-sm">⎋</span> at the bottom of Safari.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-teal text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      2
                    </span>
                    <p>
                      Scroll down and tap <strong>Add to Home Screen</strong> <span className="font-mono text-sm">➕</span>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-teal text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      3
                    </span>
                    <p>
                      Tap <strong>Add</strong> in the top-right corner.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-teal text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      1
                    </span>
                    <p>
                      Tap your browser's menu (<strong>three dots ⋮</strong> or install icon).
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-teal text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      2
                    </span>
                    <p>
                      Select <strong>Install app</strong> or <strong>Add to Home Screen</strong>.
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3 rounded-xl text-white font-semibold text-xs active:scale-98 transition-all"
              style={{ background: 'var(--color-primary, #0D9488)' }}
            >
              Done, thanks!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
