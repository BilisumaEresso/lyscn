import React, { useId } from 'react';
import clsx from 'clsx';

/**
 * Sizes mapped to pixel dimensions.
 */
const SIZE_MAP = {
  xs: 12,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
};

/**
 * Resolved pixel size helper.
 */
const getPixelSize = (size) => {
  if (typeof size === 'number') return size;
  return SIZE_MAP[size] || SIZE_MAP.md;
};

/**
 * LayoScan Brand Mark (SVG Vector)
 * Renders the 4 rounded QR scan brackets surrounding the central stylized "L" geometric mark.
 */
export function LayoScanMark({
  size = 24,
  color = 'primary',
  showLogo = true,
  className = '',
  style = {},
}) {
  const uniqueId = useId().replace(/:/g, '_');
  const pixelSize = getPixelSize(size);

  const bracketStrokeWidth = 7;
  const logoStrokeWidth = 14;

  const isWhite = color === 'white';
  const isDark = color === 'dark';
  const isLight = color === 'light';
  const isCurrent = color === 'current' || color === 'inherit';

  const bracketGradId = `layo_cust_bg_${uniqueId}`;
  const logoGradId = `layo_cust_lg_${uniqueId}`;

  let bracketStroke = `url(#${bracketGradId})`;
  let logoStroke = `url(#${logoGradId})`;

  if (isWhite) {
    bracketStroke = '#FFFFFF';
    logoStroke = '#FFFFFF';
  } else if (isDark) {
    bracketStroke = '#1E293B';
    logoStroke = '#0F172A';
  } else if (isLight) {
    bracketStroke = '#5EEAD4';
    logoStroke = '#38BDF8';
  } else if (isCurrent) {
    bracketStroke = 'currentColor';
    logoStroke = 'currentColor';
  }

  return (
    <svg
      viewBox="0 0 100 100"
      width={pixelSize}
      height={pixelSize}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx('shrink-0 select-none', className)}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={bracketGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4EECD5" />
          <stop offset="100%" stopColor="#00A3FF" />
        </linearGradient>

        <linearGradient id={logoGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="50%" stopColor="#14B8A6" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>

      {/* 4 Scan Frame Corner Brackets */}
      <path
        d="M 16,36 L 16,24 A 8,8 0 0,1 24,16 L 36,16"
        stroke={bracketStroke}
        strokeWidth={bracketStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 64,16 L 76,16 A 8,8 0 0,1 84,24 L 84,36"
        stroke={bracketStroke}
        strokeWidth={bracketStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 84,64 L 84,76 A 8,8 0 0,1 76,84 L 64,84"
        stroke={bracketStroke}
        strokeWidth={bracketStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 36,84 L 24,84 A 8,8 0 0,1 16,76 L 16,64"
        stroke={bracketStroke}
        strokeWidth={bracketStrokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Central "L" Mark */}
      {showLogo && (
        <path
          d="M 35,30 L 35,58 A 8,8 0 0,0 43,66 L 65,66"
          stroke={logoStroke}
          strokeWidth={logoStrokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/**
 * LayoScan Circular Orbit Spinner
 */
export function LayoScanSpinner({
  size = 'md',
  color = 'primary',
  showLogo = true,
  showRing = true,
  className = '',
}) {
  const uniqueId = useId().replace(/:/g, '_');
  const pixelSize = getPixelSize(size);

  const ringSize = Math.max(pixelSize, 20);
  const markSize = Math.round(ringSize * 0.6);

  const ringGradId = `layo_cust_ring_${uniqueId}`;
  const isWhite = color === 'white';
  const isDark = color === 'dark';
  const isLight = color === 'light';
  const isCurrent = color === 'current' || color === 'inherit';

  let ringStroke = `url(#${ringGradId})`;
  let glowColor = 'rgba(78, 236, 213, 0.4)';

  if (isWhite) {
    ringStroke = '#FFFFFF';
    glowColor = 'rgba(255, 255, 255, 0.4)';
  } else if (isDark) {
    ringStroke = '#1E293B';
    glowColor = 'rgba(15, 23, 42, 0.15)';
  } else if (isLight) {
    ringStroke = '#5EEAD4';
    glowColor = 'rgba(94, 234, 212, 0.4)';
  } else if (isCurrent) {
    ringStroke = 'currentColor';
    glowColor = 'transparent';
  }

  return (
    <div
      className={clsx('relative inline-flex items-center justify-center shrink-0', className)}
      style={{ width: ringSize, height: ringSize }}
    >
      {showRing && (
        <svg
          viewBox="0 0 120 120"
          className="absolute inset-0 w-full h-full animate-spin motion-reduce:animate-none"
          style={{
            animationDuration: '1.2s',
            animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
            filter: `drop-shadow(0 0 6px ${glowColor})`,
          }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={ringGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4EECD5" />
              <stop offset="50%" stopColor="#14B8A6" />
              <stop offset="100%" stopColor="#00A3FF" />
            </linearGradient>
          </defs>
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke={ringStroke}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray="235 314"
            strokeDashoffset="0"
          />
        </svg>
      )}

      <LayoScanMark size={markSize} color={color} showLogo={showLogo} />
    </div>
  );
}

/**
 * LAYOSCAN LOADING INDICATOR (Customer App)
 */
export default function LoadingIndicator({
  variant = 'spinner',
  size = 'md',
  color = 'primary',
  text,
  description,
  progress,
  showLogo = true,
  showRing = true,
  backdrop = 'glass',
  rows = 3,
  className = '',
  ...rest
}) {
  const accessibleLabel = text || 'Loading, please wait...';

  // Button loader
  if (variant === 'button') {
    const buttonSize = size === 'md' ? 'sm' : size;
    return (
      <span
        role="status"
        aria-live="polite"
        className={clsx('inline-flex items-center gap-2 font-medium shrink-0', className)}
        {...rest}
      >
        <LayoScanMark size={buttonSize} color={color === 'primary' ? 'current' : color} showLogo={showLogo} />
        {text && <span className="truncate">{text}</span>}
        <span className="sr-only">{accessibleLabel}</span>
      </span>
    );
  }

  // Inline loader
  if (variant === 'inline') {
    const inlineSize = size === 'md' ? 'sm' : size;
    return (
      <span
        role="status"
        aria-live="polite"
        className={clsx('inline-flex items-center gap-2 text-sm text-ink-muted shrink-0', className)}
        {...rest}
      >
        <LayoScanSpinner size={inlineSize} color={color} showLogo={showLogo} showRing={showRing} />
        {text && <span className="font-medium text-ink">{text}</span>}
        <span className="sr-only">{accessibleLabel}</span>
      </span>
    );
  }

  // Minimal loader
  if (variant === 'minimal') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={clsx('inline-flex items-center gap-2.5', className)}
        {...rest}
      >
        <LayoScanMark size={size} color={color} showLogo={showLogo} />
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse"
              style={{
                animationDelay: `${i * 180}ms`,
                animationDuration: '1.2s',
              }}
            />
          ))}
        </div>
        <span className="sr-only">{accessibleLabel}</span>
      </div>
    );
  }

  // Progress Bar
  if (variant === 'progress') {
    const isDeterminate = typeof progress === 'number';
    const percent = isDeterminate ? Math.min(Math.max(progress, 0), 100) : 0;

    return (
      <div
        role="progressbar"
        aria-valuenow={isDeterminate ? percent : undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        className={clsx(
          'w-full max-w-lg p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-3',
          className
        )}
        {...rest}
      >
        <div className="flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <LayoScanMark size="sm" color={color} />
            <span className="text-white/80">{text || 'Processing…'}</span>
          </div>
          {isDeterminate ? (
            <span className="font-mono text-teal-400">{Math.round(percent)}%</span>
          ) : (
            <span className="text-[10px] tracking-wider uppercase text-white/40 font-mono">
              POWERED BY LAYOSCAN
            </span>
          )}
        </div>

        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden relative">
          {isDeterminate ? (
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 via-teal to-cyan-400 transition-all duration-300 ease-out shadow-sm"
              style={{ width: `${percent}%` }}
            />
          ) : (
            <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-teal-400 via-teal to-cyan-400 animate-pulse" />
          )}
        </div>
        <span className="sr-only">{accessibleLabel}</span>
      </div>
    );
  }

  // Card / Section
  if (variant === 'section') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={clsx(
          'w-full py-12 px-6 rounded-2xl border border-ink/8 bg-white/70 backdrop-blur-sm',
          'flex flex-col items-center justify-center text-center space-y-4 shadow-xs',
          className
        )}
        {...rest}
      >
        <LayoScanSpinner size={size === 'md' ? 'lg' : size} color={color} showLogo={showLogo} showRing={showRing} />
        {text && <p className="font-display font-semibold text-base text-ink">{text}</p>}
        {description && (
          <p className="text-xs text-ink-muted max-w-xs leading-relaxed">{description}</p>
        )}
        <div className="w-32 h-1.5 rounded-full bg-ink/6 animate-pulse mt-2" />
        <span className="sr-only">{accessibleLabel}</span>
      </div>
    );
  }

  // Overlay
  if (variant === 'overlay') {
    const backdropClass =
      backdrop === 'dark'
        ? 'bg-black/75'
        : backdrop === 'light'
        ? 'bg-white/80'
        : 'bg-ink/50 backdrop-blur-md';

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={accessibleLabel}
        className={clsx(
          'fixed inset-0 z-50 flex items-center justify-center p-6 transition-all duration-200',
          backdropClass,
          className
        )}
        {...rest}
      >
        <div className="p-6 rounded-2xl bg-white border border-ink/10 shadow-2xl flex flex-col items-center text-center space-y-3.5 max-w-xs w-full animate-card-slide-in">
          <LayoScanSpinner size="lg" color={color} showLogo={showLogo} showRing={showRing} />
          {text && <p className="font-display font-bold text-base text-ink">{text}</p>}
          {description && (
            <p className="text-xs text-ink-muted leading-relaxed">{description}</p>
          )}
        </div>
      </div>
    );
  }

  // Full Page
  if (variant === 'full') {
    const fullBackdropClass =
      backdrop === 'dark'
        ? 'bg-[#0B132B] text-white'
        : backdrop === 'light'
        ? 'bg-paper text-ink'
        : 'bg-ink text-white';

    return (
      <div
        role="status"
        aria-live="polite"
        className={clsx(
          'min-h-screen w-full flex flex-col items-center justify-center p-6 text-center select-none',
          fullBackdropClass,
          className
        )}
        {...rest}
      >
        <div className="flex flex-col items-center space-y-5 max-w-sm">
          <LayoScanSpinner size={size === 'md' ? 'xl' : size} color={color} showLogo={showLogo} showRing={showRing} />
          <div className="space-y-1.5">
            <h2 className="font-display font-bold text-xl sm:text-2xl tracking-tight">
              {text || 'Loading…'}
            </h2>
            <p className="text-sm opacity-60 leading-relaxed">
              {description || "Just a moment, we're getting things ready."}
            </p>
          </div>
        </div>
        <span className="sr-only">{accessibleLabel}</span>
      </div>
    );
  }

  // Default circular spinner
  return (
    <div
      role="status"
      aria-live="polite"
      className={clsx('inline-flex flex-col items-center gap-2', className)}
      {...rest}
    >
      <LayoScanSpinner size={size} color={color} showLogo={showLogo} showRing={showRing} />
      {text && <span className="text-xs font-medium text-ink-muted">{text}</span>}
      <span className="sr-only">{accessibleLabel}</span>
    </div>
  );
}
