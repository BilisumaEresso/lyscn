import React, { useEffect, useState, useId } from 'react';
import clsx from 'clsx';
import { Check, RefreshCw, AlertTriangle, Sparkles } from 'lucide-react';

/**
 * Detects the business theme category based on restaurant data or category string.
 */
function resolveThemeCategory(restaurant) {
  const type = (restaurant?.cuisineType || restaurant?.businessType || restaurant?.category || '').toLowerCase();
  const name = (restaurant?.name || '').toLowerCase();
  const brand = (restaurant?.brandColor || '').toLowerCase();

  if (type.includes('bar') || type.includes('lounge') || type.includes('pub') || name.includes('bar')) {
    return 'bar';
  }
  if (type.includes('hotel') || type.includes('resort') || name.includes('hotel')) {
    return 'hotel';
  }
  if (type.includes('burger') || type.includes('pizza') || type.includes('fast') || name.includes('burger') || name.includes('pizza')) {
    return 'burger';
  }
  if (type.includes('cultural') || type.includes('habesha') || type.includes('traditional') || type.includes('ethiopian') || name.includes('cultural')) {
    return 'cultural';
  }
  if (type.includes('cafe') || type.includes('coffee') || name.includes('cafe') || name.includes('coffee')) {
    return 'cafe';
  }

  // Color-based hints if type is unspecified
  if (brand.startsWith('#ef') || brand.startsWith('#f9') || brand.startsWith('#ea')) return 'burger';
  if (brand.startsWith('#d9') || brand.startsWith('#eab') || brand.startsWith('#f5')) return 'bar';
  if (brand.startsWith('#1e') || brand.startsWith('#25') || brand.startsWith('#3b')) return 'hotel';
  if (brand.startsWith('#84') || brand.startsWith('#15') || brand.startsWith('#16') || brand.startsWith('#10')) return 'cafe';

  return 'cafe'; // Default friendly dining ambiance
}

/**
 * THEME DEFINITIONS
 * Colors and ambient illumination corresponding to the 5 themes in the LayoScan specification.
 */
const THEME_CONFIGS = {
  cafe: {
    name: 'Cafe',
    glowColor: 'rgba(52, 211, 153, 0.22)',
    accentGradient: ['#34D399', '#10B981', '#059669'],
    ambientTint: 'rgba(16, 185, 129, 0.08)',
    badgeBg: 'rgba(52, 211, 153, 0.15)',
    badgeBorder: 'rgba(52, 211, 153, 0.35)',
    badgeText: '#A7F3D0',
    cornerPattern: 'leaves',
  },
  burger: {
    name: 'Burger / Pizza',
    glowColor: 'rgba(239, 68, 68, 0.24)',
    accentGradient: ['#F87171', '#EF4444', '#DC2626'],
    ambientTint: 'rgba(239, 68, 68, 0.09)',
    badgeBg: 'rgba(239, 68, 68, 0.15)',
    badgeBorder: 'rgba(239, 68, 68, 0.35)',
    badgeText: '#FECACA',
    cornerPattern: 'warm',
  },
  bar: {
    name: 'Bar / Lounge',
    glowColor: 'rgba(245, 158, 11, 0.24)',
    accentGradient: ['#FCD34D', '#F59E0B', '#D97706'],
    ambientTint: 'rgba(245, 158, 11, 0.08)',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    badgeBorder: 'rgba(245, 158, 11, 0.35)',
    badgeText: '#FDE68A',
    cornerPattern: 'gold',
  },
  hotel: {
    name: 'Hotel & Suites',
    glowColor: 'rgba(59, 130, 246, 0.24)',
    accentGradient: ['#60A5FA', '#3B82F6', '#2563EB'],
    ambientTint: 'rgba(59, 130, 246, 0.08)',
    badgeBg: 'rgba(59, 130, 246, 0.15)',
    badgeBorder: 'rgba(59, 130, 246, 0.35)',
    badgeText: '#BFDBFE',
    cornerPattern: 'hotel',
  },
  cultural: {
    name: 'Cultural Restaurant',
    glowColor: 'rgba(217, 119, 6, 0.25)',
    accentGradient: ['#FBBF24', '#D97706', '#B45309'],
    ambientTint: 'rgba(180, 83, 9, 0.09)',
    badgeBg: 'rgba(217, 119, 6, 0.15)',
    badgeBorder: 'rgba(217, 119, 6, 0.35)',
    badgeText: '#FDE68A',
    cornerPattern: 'cultural',
  },
};

/**
 * LAYOSCAN CUSTOMER MENU SPLASH ANIMATION
 * Implements the 5-step "Scan Recognized → Connection → Loading Menu → Transition → Menu Ready" story.
 */
export default function MenuSplashLoader({
  phase = 'scanning', // 'scanning' | 'connected' | 'loading-menu' | 'ready' | 'error'
  restaurant,
  table,
  errorMessage,
  onRetry,
  onTransitionEnd,
  className = '',
}) {
  const uniqueId = useId().replace(/:/g, '_');
  const themeCategory = resolveThemeCategory(restaurant);
  const theme = THEME_CONFIGS[themeCategory] || THEME_CONFIGS.cafe;

  const restaurantName = restaurant?.name || 'Restaurant';
  const tableLabel = table?.label || (table?.number ? `Table ${table.number}` : 'Table');

  // Animation states mapped to phases
  const isScanning = phase === 'scanning';
  const isConnected = phase === 'connected';
  const isLoadingMenu = phase === 'loading-menu';
  const isReady = phase === 'ready';
  const isError = phase === 'error';

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx(
        'fixed inset-0 z-50 flex flex-col items-center justify-between overflow-hidden select-none transition-opacity duration-500',
        isReady ? 'opacity-0 pointer-events-none scale-102' : 'opacity-100',
        className
      )}
      style={{
        backgroundColor: '#0B132B',
        background: `radial-gradient(circle at 50% 42%, ${theme.glowColor} 0%, rgba(11, 19, 43, 0.98) 72%, #070D1E 100%)`,
      }}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && isReady && onTransitionEnd) {
          onTransitionEnd();
        }
      }}
    >
      <style>{`
        @keyframes layo-corner-tl {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(3.5px, 3.5px); }
        }
        @keyframes layo-corner-tr {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-3.5px, 3.5px); }
        }
        @keyframes layo-corner-br {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-3.5px, -3.5px); }
        }
        @keyframes layo-corner-bl {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(3.5px, -3.5px); }
        }
        @keyframes layo-trace-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes layo-shimmer-flow {
          0% { stop-color: #34D399; }
          50% { stop-color: #14B8A6; }
          100% { stop-color: #38BDF8; }
        }
        @keyframes layo-pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(0.96); }
          50% { opacity: 0.85; transform: scale(1.04); }
        }
        @keyframes layo-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── THEMATIC AMBIENT CORNER MOTIFS ─────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none opacity-25 overflow-hidden">
        {/* Top-Left Ambient Motif */}
        <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full blur-2xl" style={{ background: theme.glowColor }} />
        {/* Bottom-Right Ambient Motif */}
        <div className="absolute -bottom-10 -right-10 w-56 h-56 rounded-full blur-3xl" style={{ background: theme.glowColor }} />

        {/* Botanical / Theme Watermark corners */}
        {theme.cornerPattern === 'leaves' && (
          <svg className="absolute bottom-4 left-4 w-28 h-28 opacity-15" viewBox="0 0 100 100" fill="none" stroke={theme.accentGradient[0]} strokeWidth="1.5">
            <path d="M10,90 Q40,80 50,50 Q60,20 90,10 Q60,40 50,50 Q40,60 10,90 Z" />
            <path d="M10,90 Q20,60 40,40" />
            <path d="M50,50 Q70,40 80,20" />
          </svg>
        )}
        {theme.cornerPattern === 'cultural' && (
          <svg className="absolute bottom-4 right-4 w-28 h-28 opacity-15" viewBox="0 0 100 100" fill="none" stroke={theme.accentGradient[0]} strokeWidth="1.5">
            <path d="M50,10 L90,50 L50,90 L10,50 Z" />
            <path d="M50,25 L75,50 L50,75 L25,50 Z" />
            <circle cx="50" cy="50" r="10" />
          </svg>
        )}
      </div>

      {/* ── TOP HEADER / BRAND BAR ────────────────────────────────────────── */}
      <header className="w-full pt-10 px-6 flex items-center justify-between z-20">
        <span className="text-[11px] font-mono tracking-widest uppercase text-white/50">
          LayoScan Dining
        </span>
        <span className="text-[11px] font-medium text-white/40">
          {tableLabel}
        </span>
      </header>

      {/* ── STEP 3 BACKGROUND: GHOST MENU SKELETON LAYER ──────────────────── */}
      <div
        className={clsx(
          'absolute inset-0 flex flex-col items-center justify-center p-6 pointer-events-none transition-all duration-700 ease-out z-0',
          isLoadingMenu || isReady
            ? 'opacity-25 blur-xs scale-100'
            : 'opacity-0 blur-md scale-95'
        )}
        aria-hidden="true"
      >
        <div className="w-full max-w-xs space-y-4 pt-16">
          {/* Restaurant Banner Ghost */}
          <div className="h-14 rounded-2xl bg-white/10 border border-white/5 flex items-center px-4 gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 rounded-full bg-white/20 w-3/4" />
              <div className="h-2 rounded-full bg-white/10 w-1/2" />
            </div>
          </div>

          {/* Category Tabs Ghost */}
          <div className="flex gap-2">
            <div className="h-7 rounded-xl bg-white/20 w-16" />
            <div className="h-7 rounded-xl bg-white/10 w-16" />
            <div className="h-7 rounded-xl bg-white/10 w-16" />
          </div>

          {/* Menu Items Ghost Cards */}
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-white/8 border border-white/5 flex items-center p-3 gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/12 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 rounded-full bg-white/20 w-4/5" />
                  <div className="h-2 rounded-full bg-white/10 w-2/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CENTER: THE CORE ANIMATED SCAN SYMBOL ─────────────────────────── */}
      <main className="relative flex flex-col items-center justify-center z-10 my-auto">
        {/* Ambient Radial Halo */}
        <div
          className="absolute w-52 h-52 rounded-full blur-2xl pointer-events-none transition-all duration-700"
          style={{
            background: theme.glowColor,
            animation: !isError ? 'layo-pulse-glow 3s infinite ease-in-out' : 'none',
          }}
        />

        {/* Brand SVG Frame */}
        <div className="relative w-36 h-36 flex items-center justify-center">
          {/* Circular Trace Glow Sweep Ring (Active during Connection & Loading) */}
          <svg
            className={clsx(
              'absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-500',
              isConnected || isLoadingMenu ? 'opacity-100' : 'opacity-0'
            )}
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke={theme.accentGradient[0]}
              strokeWidth="2"
              strokeDasharray="90 190"
              strokeLinecap="round"
              style={{
                filter: `drop-shadow(0 0 6px ${theme.accentGradient[0]})`,
                transformOrigin: 'center',
                animation: 'layo-trace-rotate 2.2s linear infinite',
              }}
            />
          </svg>

          {/* Core LayoScan Logo Mark with 4 Corner Scanning Brackets */}
          <svg
            viewBox="0 0 100 100"
            className="w-28 h-28 select-none transition-transform duration-500"
            style={{
              filter: `drop-shadow(0 4px 16px ${theme.glowColor})`,
              transform: isConnected ? 'scale(1.02)' : isReady ? 'scale(0.92)' : 'scale(1)',
            }}
          >
            <defs>
              <linearGradient id={`mark_grad_${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={theme.accentGradient[0]} />
                <stop offset="50%" stopColor={theme.accentGradient[1]} />
                <stop offset="100%" stopColor={theme.accentGradient[2]} />
              </linearGradient>

              <linearGradient id={`bracket_grad_${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4EECD5" />
                <stop offset="100%" stopColor={theme.accentGradient[0]} />
              </linearGradient>
            </defs>

            {/* ── 4 Scan Brackets with Breathing / Locking Mechanics ─────────── */}
            {/* Top-Left Bracket */}
            <path
              d="M 16,36 L 16,24 A 8,8 0 0,1 24,16 L 36,16"
              stroke={`url(#bracket_grad_${uniqueId})`}
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              style={{
                transformOrigin: '24px 24px',
                animation: isError
                  ? 'none'
                  : isConnected
                  ? 'layo-corner-tl 1.6s ease-in-out infinite'
                  : isScanning
                  ? 'pulse 1.2s ease-in-out infinite'
                  : 'none',
              }}
            />

            {/* Top-Right Bracket */}
            <path
              d="M 64,16 L 76,16 A 8,8 0 0,1 84,24 L 84,36"
              stroke={`url(#bracket_grad_${uniqueId})`}
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              style={{
                transformOrigin: '76px 24px',
                animation: isError
                  ? 'none'
                  : isConnected
                  ? 'layo-corner-tr 1.6s ease-in-out infinite'
                  : isScanning
                  ? 'pulse 1.2s ease-in-out 0.15s infinite'
                  : 'none',
              }}
            />

            {/* Bottom-Right Bracket */}
            <path
              d="M 84,64 L 84,76 A 8,8 0 0,1 76,84 L 64,84"
              stroke={`url(#bracket_grad_${uniqueId})`}
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              style={{
                transformOrigin: '76px 76px',
                animation: isError
                  ? 'none'
                  : isConnected
                  ? 'layo-corner-br 1.6s ease-in-out infinite'
                  : isScanning
                  ? 'pulse 1.2s ease-in-out 0.3s infinite'
                  : 'none',
              }}
            />

            {/* Bottom-Left Bracket */}
            <path
              d="M 36,84 L 24,84 A 8,8 0 0,1 16,76 L 16,64"
              stroke={`url(#bracket_grad_${uniqueId})`}
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              style={{
                transformOrigin: '24px 76px',
                animation: isError
                  ? 'none'
                  : isConnected
                  ? 'layo-corner-bl 1.6s ease-in-out infinite'
                  : isScanning
                  ? 'pulse 1.2s ease-in-out 0.45s infinite'
                  : 'none',
              }}
            />

            {/* ── Center Folded "L" Geometric Mark ─────────────────────────── */}
            <path
              d="M 38,32 L 38,60 A 8,8 0 0,0 46,68 L 62,68"
              stroke={`url(#mark_grad_${uniqueId})`}
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              style={{
                filter: isConnected || isLoadingMenu ? `drop-shadow(0 0 8px ${theme.accentGradient[0]})` : 'none',
                transition: 'filter 0.4s ease',
              }}
            />
          </svg>
        </div>

        {/* ── STATUS TEXT PROGRESSION ─────────────────────────────────────── */}
        <div className="mt-8 text-center px-6 max-w-sm">
          {isError ? (
            <div className="space-y-2 animate-fade-in">
              <h2 className="font-display font-bold text-xl text-white">
                We couldn't load the menu
              </h2>
              <p className="text-xs text-white/60 leading-relaxed">
                {errorMessage || "Please check your connection or ask a staff member for assistance."}
              </p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-4 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/20 active:scale-95 transition-all inline-flex items-center gap-2 border border-white/15 shadow-md"
                >
                  <RefreshCw size={13} /> Tap to Try Again
                </button>
              )}
            </div>
          ) : isScanning ? (
            <div className="space-y-1.5 animate-fade-in">
              <p className="font-display font-medium text-base text-white/90 tracking-wide">
                Connecting…
              </p>
              <p className="text-xs text-white/40">
                Scanning table QR code
              </p>
            </div>
          ) : isConnected ? (
            <div className="space-y-2 animate-fade-in">
              <p className="font-display font-bold text-lg text-white">
                Table Recognized
              </p>
              <p className="text-xs text-white/60">
                Connecting to {restaurantName}
              </p>
            </div>
          ) : isLoadingMenu ? (
            <div className="space-y-2 animate-fade-in">
              <p className="font-display font-bold text-lg text-white">
                Preparing your menu…
              </p>
              <p className="text-xs text-white/60">
                Fresh selections from <strong className="text-white/80">{restaurantName}</strong>
              </p>
            </div>
          ) : (
            <div className="space-y-1 animate-fade-in">
              <p className="font-display font-bold text-lg text-white">
                Menu Ready!
              </p>
              <p className="text-xs text-white/60">
                Opening your dining experience…
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ── BOTTOM PILL: TABLE CONFIRMATION BADGE ─────────────────────────── */}
      <footer className="w-full pb-10 px-6 flex flex-col items-center justify-center z-20">
        <div
          className={clsx(
            'px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2 text-xs font-semibold transition-all duration-500 ease-out border shadow-lg',
            isConnected || isLoadingMenu || isReady
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 pointer-events-none'
          )}
          style={{
            backgroundColor: theme.badgeBg,
            borderColor: theme.badgeBorder,
            color: theme.badgeText,
          }}
        >
          <div className="w-4 h-4 rounded-full flex items-center justify-center bg-white/20 text-white shrink-0">
            <Check size={11} strokeWidth={3} />
          </div>
          <span>{tableLabel} recognized</span>
        </div>

        <p className="text-[11px] text-white/30 mt-3 font-mono">
          Powered by LayoScan
        </p>
      </footer>
    </div>
  );
}
