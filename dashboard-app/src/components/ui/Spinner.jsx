import clsx from 'clsx';

export default function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-9 h-9' };
  return (
    <span
      className={clsx(
        'inline-block rounded-full border-2 border-teal/20 border-t-teal animate-spin',
        sizes[size],
        className
      )}
      aria-label="Loading"
    />
  );
}
