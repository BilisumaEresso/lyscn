import clsx from 'clsx';

export default function Toggle({ checked, onChange, id, label, disabled }) {
  return (
    <label
      htmlFor={id}
      className={clsx(
        'flex items-center gap-2 cursor-pointer select-none',
        disabled && 'opacity-40 pointer-events-none'
      )}
    >
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={clsx(
          'relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-1',
          checked ? 'bg-teal' : 'bg-ink/15'
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-150',
            checked ? 'translate-x-4' : 'translate-x-0'
          )}
        />
      </button>
      {label && <span className="text-sm text-ink">{label}</span>}
    </label>
  );
}
