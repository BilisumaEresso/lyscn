import { Html5Qrcode } from "html5-qrcode";
import { AlertCircle, ArrowRight, Camera, QrCode, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import { applyBrandColor } from "../lib/theme";
import { useSessionStore } from "../store/sessionStore";
import { getRestaurantLogo } from "../lib/branding";

/**
 * NOTE ON SECURITY & CAMERA PERMISSIONS:
 * Browser `navigator.mediaDevices.getUserMedia` requires a Secure Context (HTTPS)
 * in production environments. Localhost and 127.0.0.1 are exempted by browsers
 * for local testing. In production, ensure the customer app is served over HTTPS.
 */

export default function Landing() {
  const navigate = useNavigate();
  const session = useSessionStore();

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [cameraError, setCameraError] = useState(null);
  const [invalidCodeError, setInvalidCodeError] = useState(null);
  const [installBannerDismissed, setInstallBannerDismissed] = useState(false);

  const scannerInstanceRef = useRef(null);
  const { canInstall, promptInstall } = useInstallPrompt();

  // Apply default LayoScan theme (teal/ink/mint) for landing screen
  useEffect(() => {
    applyBrandColor("#14B8A6");
    document.title = "LayoScan · Order at your table";
  }, []);

  // Remembered session info if customer previously resolved a table
  const hasRememberedSession = !!(
    session?.restaurant?.name &&
    session?.table?.label &&
    session?.qrToken
  );

  useEffect(() => {
    const storedDismissal = localStorage.getItem(
      "layoscan-install-banner-dismissed",
    );
    if (storedDismissal === "true") {
      setInstallBannerDismissed(true);
    }
  }, []);

  const showInstallBanner =
    hasRememberedSession && canInstall && !installBannerDismissed;

  const handleDismissInstallBanner = () => {
    setInstallBannerDismissed(true);
    localStorage.setItem("layoscan-install-banner-dismissed", "true");
  };

  // --- Camera Scanner Lifecycle ---
  useEffect(() => {
    if (!isScannerOpen) return;

    let isMounted = true;
    setCameraError(null);
    setInvalidCodeError(null);

    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode("qr-reader-viewport");
        scannerInstanceRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 230, height: 230 },
          },
          (decodedText) => {
            if (!isMounted) return;
            handleDecodeSuccess(decodedText);
          },
          () => {
            // Transient frame decode failure — ignore
          },
        );
      } catch (err) {
        if (!isMounted) return;
        setCameraError(
          "We couldn't access your camera. You can allow camera access in your browser settings, or ask a staff member to help you order.",
        );
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      const instance = scannerInstanceRef.current;
      if (instance) {
        if (instance.isScanning) {
          instance
            .stop()
            .then(() => instance.clear())
            .catch(() => {});
        } else {
          try {
            instance.clear();
          } catch (_) {}
        }
        scannerInstanceRef.current = null;
      }
    };
  }, [isScannerOpen]);

  const closeScanner = async () => {
    const instance = scannerInstanceRef.current;
    if (instance && instance.isScanning) {
      try {
        await instance.stop();
        instance.clear();
      } catch (_) {}
    }
    scannerInstanceRef.current = null;
    setIsScannerOpen(false);
  };

  const handleDecodeSuccess = async (decodedText) => {
    // Extract qrToken from decoded string
    let token = null;

    // Matches http(s)://domain/t/qrToken or /t/qrToken
    const match = decodedText.match(/\/t\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      token = match[1];
    } else if (/^[a-zA-Z0-9_-]{6,64}$/.test(decodedText.trim())) {
      // Raw qrToken string
      token = decodedText.trim();
    }

    if (token) {
      // Valid LayoScan code — stop camera and navigate
      await closeScanner();
      navigate(`/t/${token}`);
    } else {
      // Unrecognized QR code content
      setInvalidCodeError("That doesn't look like a LayoScan code — try again");
      setTimeout(() => setInvalidCodeError(null), 3500);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const trimmed = manualCode.trim();
    if (!trimmed) return;

    const match = trimmed.match(/\/t\/([a-zA-Z0-9_-]+)/);
    const token = match ? match[1] : trimmed.replace(/[\s-]/g, '');

    navigate(`/t/${token}`);
  };

  const triggerButtonRef = useRef(null);
  const overlayRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Focus trap & focus restoration for scanner overlay
  useEffect(() => {
    if (isScannerOpen) {
      // Focus close button on open
      setTimeout(() => closeButtonRef.current?.focus(), 50);

      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          closeScanner();
          return;
        }

        if (e.key === "Tab" && overlayRef.current) {
          const focusables = overlayRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
          if (focusables.length === 0) return;

          const firstEl = focusables[0];
          const lastEl = focusables[focusables.length - 1];

          if (e.shiftKey && document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          } else if (!e.shiftKey && document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    } else {
      // Return focus to trigger button when closed
      triggerButtonRef.current?.focus();
    }
  }, [isScannerOpen]);

  return (
    <div className="min-h-screen bg-paper max-w-[480px] mx-auto flex flex-col justify-between items-center text-center px-6 py-10 relative">
      {/* ── Top Header / Logo ────────────────────────────────────────── */}
      <div className="flex flex-col items-center mt-4">
        <div className="w-20 h-20 rounded-3xl gradient-brand flex items-center justify-center mb-4 shadow-xl overflow-hidden p-0.5">
          <img
            src={logo}
            alt="LayoScan"
            className="w-full h-full rounded-[22px] object-cover"
          />
        </div>
        <span className="font-display font-bold text-lg text-ink tracking-tight">
          LayoScan
        </span>
      </div>

      {/* ── Main Hero Content ────────────────────────────────────────── */}
      <div className="w-full my-auto py-8 flex flex-col items-center">
        <h1 className="font-display font-bold text-3xl text-ink leading-tight mb-3">
          Ready to order?
        </h1>
        <p className="text-ink-muted text-base max-w-xs leading-relaxed mb-8">
          Scan the QR code at your table to see the menu
        </p>

        {/* Primary CTA: Scan Now */}
        <button
          ref={triggerButtonRef}
          onClick={() => setIsScannerOpen(true)}
          className="w-full py-4 px-6 rounded-2xl font-display font-bold text-lg text-white shadow-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] hover:opacity-95 focus-visible:outline focus-visible:outline-2"
          style={{ backgroundColor: "var(--color-primary, #14B8A6)" }}
        >
          <Camera size={22} strokeWidth={2.25} />
          Scan Now
        </button>

        {/* Remembered Session Shortcut */}
        {hasRememberedSession && (
          <button
            onClick={() => navigate("/menu")}
            className="mt-4 w-full py-3 px-4 rounded-2xl font-display font-semibold text-sm border border-ink/12 text-ink hover:bg-ink/5 flex items-center justify-between gap-3 transition-all min-w-0 bg-white/70 shadow-xs active:scale-[0.99]"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={getRestaurantLogo(session.restaurant)}
                alt=""
                className="w-7 h-7 rounded-lg object-cover border border-ink/10 shrink-0 bg-white"
              />
              <span className="truncate text-left text-xs font-semibold">
                Continue to {session.restaurant.name} ({session.table.label})
              </span>
            </div>
            <ArrowRight size={16} className="text-teal shrink-0" />
          </button>
        )}

        {showInstallBanner && (
          <div className="mt-4 w-full rounded-2xl border border-ink/10 bg-white/80 p-3 shadow-sm backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="flex-1 text-left">
                <p className="text-xs font-semibold text-ink">
                  Add LayoScan to your home screen for faster ordering next
                  time.
                </p>
              </div>
              <button
                type="button"
                aria-label="Dismiss install prompt"
                onClick={handleDismissInstallBanner}
                className="text-ink-muted hover:text-ink"
              >
                <X size={16} />
              </button>
            </div>
            <button
              type="button"
              onClick={async () => {
                const installed = await promptInstall();
                if (installed) handleDismissInstallBanner();
              }}
              className="mt-2 w-full rounded-xl bg-ink text-white px-3 py-2 text-xs font-semibold"
            >
              Install app
            </button>
          </div>
        )}

        {/* Manual Code Fallback Toggle */}
        <div className="mt-6">
          {!showManual ? (
            <button
              onClick={() => setShowManual(true)}
              className="text-xs font-semibold text-ink-muted hover:text-teal transition-colors flex items-center gap-1.5"
            >
              <QrCode size={14} /> Enter table code manually
            </button>
          ) : (
            <form
              onSubmit={handleManualSubmit}
              className="w-full flex items-center gap-2 mt-2"
            >
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Paste code or token…"
                autoFocus
                className="flex-1 px-3 py-2.5 text-xs border border-ink/15 rounded-xl bg-white focus:outline-none focus:border-teal"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2.5 bg-teal text-white rounded-xl text-xs font-semibold hover:bg-teal/90 disabled:opacity-40"
              >
                Go
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 opacity-35">
        <img src={logo} alt="" className="w-4 h-4 rounded object-cover" />
        <span className="text-[11px] text-ink-muted font-medium tracking-wide">
          Powered by LayoScan
        </span>
      </div>

      {/* ── FULL-SCREEN CAMERA SCANNER OVERLAY ───────────────────────── */}
      {isScannerOpen && (
        <div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label="Camera QR Scanner"
          tabIndex={-1}
          className="fixed inset-0 z-50 bg-ink flex flex-col justify-between items-center text-white overflow-hidden animate-fade-in"
          style={{
            paddingTop: "max(20px, env(safe-area-inset-top))",
            paddingBottom: "max(24px, env(safe-area-inset-bottom))",
          }}
        >
          {/* Top Bar */}
          <div className="w-full px-6 py-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <img src={logo} alt="" className="w-6 h-6 rounded" />
              <span className="font-display font-semibold text-sm">
                LayoScan Scanner
              </span>
            </div>
            <button
              ref={closeButtonRef}
              onClick={closeScanner}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Close scanner"
            >
              <X size={22} />
            </button>
          </div>

          {/* Viewport Area */}
          <div className="relative w-full max-w-sm aspect-square flex items-center justify-center my-auto px-6">
            {!cameraError ? (
              <>
                {/* HTML5 QR Code Mount Element */}
                <div
                  id="qr-reader-viewport"
                  className="w-full h-full rounded-3xl overflow-hidden bg-black/40 border border-white/10 shadow-2xl"
                />

                {/* Branded Scan-Frame Viewfinder Overlay (Four Corner Brackets) */}
                <div className="absolute inset-8 pointer-events-none flex items-center justify-center">
                  <div className="w-[230px] h-[230px] relative max-w-full max-h-full">
                    {/* Top-Left Bracket */}
                    <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-leaf rounded-tl-2xl shadow-sm" />
                    {/* Top-Right Bracket */}
                    <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-leaf rounded-tr-2xl shadow-sm" />
                    {/* Bottom-Left Bracket */}
                    <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-leaf rounded-bl-2xl shadow-sm" />
                    {/* Bottom-Right Bracket */}
                    <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-leaf rounded-br-2xl shadow-sm" />
                  </div>
                </div>

                {/* Instruction Line */}
                <p className="absolute -bottom-10 inset-x-0 text-center text-xs font-medium text-white/80">
                  Point your camera at the QR code on your table
                </p>
              </>
            ) : (
              /* Camera Error / Permission Denied Fallback Card */
              <div className="bg-white/10 backdrop-blur-md border border-white/15 p-6 rounded-3xl text-center max-w-xs space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber/20 text-amber flex items-center justify-center mx-auto">
                  <AlertCircle size={24} />
                </div>
                <p className="text-sm leading-relaxed text-white/90">
                  {cameraError}
                </p>

                {/* Inline Manual Fallback */}
                <form onSubmit={handleManualSubmit} className="pt-2 flex gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Enter code manually…"
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-white/15 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:border-leaf"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-leaf text-ink rounded-xl text-xs font-bold hover:bg-leaf/90"
                  >
                    Go
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Invalid QR Code Warning Banner */}
          {invalidCodeError && (
            <div className="absolute bottom-16 bg-danger/90 backdrop-blur text-white text-xs px-5 py-3 rounded-full shadow-lg flex items-center gap-2 animate-pulse">
              <AlertCircle size={16} />
              <span>{invalidCodeError}</span>
            </div>
          )}

          {/* Footer Manual Link inside Overlay */}
          <div className="pb-4">
            <button
              onClick={() => {
                closeScanner();
                setShowManual(true);
              }}
              className="text-xs text-white/60 hover:text-white underline underline-offset-4"
            >
              Having trouble? Enter code manually
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
