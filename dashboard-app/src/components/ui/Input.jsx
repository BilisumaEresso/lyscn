import { forwardRef } from 'react';
import clsx from 'clsx';

const Input = forwardRef(function Input(
  { label, error, hint, className = '', wrapperClassName = '', id, name, ...props },
  ref
) {
  const generatedId = id || name || (typeof label === 'string' ? label.toLowerCase().replace(/[^a-z0-9_-]/g, '-') : undefined);
  const inputName = name || generatedId;

  return (
    <div className={clsx('flex flex-col gap-1', wrapperClassName)}>
      {label && (
        <label htmlFor={generatedId} className="text-xs font-medium text-ink-muted">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={generatedId}
        name={inputName}
        className={clsx(
          'w-full rounded-lg border px-3 py-2 text-sm text-ink placeholder:text-ink/30',
          'transition-colors bg-white',
          error
            ? 'border-danger focus:border-danger focus:ring-danger/20'
            : 'border-ink/12 focus:border-teal focus:ring-teal/15',
          'focus:outline-none focus:ring-2',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  );
});

export default Input;
