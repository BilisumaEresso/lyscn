import clsx from 'clsx';

const variants = {
  primary:   'hover:opacity-90',
  secondary: 'bg-ink/8 text-ink hover:bg-ink/14 focus-visible:ring-ink/30',
  ghost:     'text-ink-muted hover:text-ink hover:bg-ink/6 focus-visible:ring-ink/20',
  danger:    'bg-danger text-white hover:bg-danger/90 focus-visible:ring-danger',
  outline:   'border border-ink/15 text-ink hover:bg-ink/5 focus-visible:ring-ink/20',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  style = {},
  children,
  ...props
}) {
  const primaryStyle = variant === 'primary' ? {
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-on-primary)',
    ...style,
  } : style;

  return (
    <button
      disabled={disabled}
      style={primaryStyle}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        'disabled:opacity-40 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
