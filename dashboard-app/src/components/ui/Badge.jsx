import clsx from 'clsx';

const colorMap = {
  // Order statuses
  placed:    'bg-teal/10 text-teal',
  accepted:  'bg-blue-100 text-blue-600',
  preparing: 'bg-amber/10 text-amber',
  ready:     'bg-leaf/15 text-emerald-700',
  served:    'bg-slate/15 text-slate',
  cancelled: 'bg-danger/10 text-danger',
  // Payment statuses
  unpaid:    'bg-amber/10 text-amber',
  paid:      'bg-leaf/15 text-emerald-700',
  // Generic
  active:    'bg-leaf/15 text-emerald-700',
  inactive:  'bg-ink/8 text-ink-muted',
  default:   'bg-ink/8 text-ink-muted',
};

export default function Badge({ status, label, className = '' }) {
  const color = colorMap[status] || colorMap.default;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
        color,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
      {label || status}
    </span>
  );
}
