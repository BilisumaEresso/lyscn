export function formatBirr(value) {
  return `Br ${Number(value || 0).toFixed(2)}`;
}

export default function Currency({ value, className = '' }) {
  return (
    <span className={`inline-flex items-baseline gap-1 whitespace-nowrap ${className}`} aria-label={formatBirr(value)}>
      <span className="font-display font-bold tracking-tight text-[0.82em] opacity-90">Br</span>
      <span>{Number(value || 0).toFixed(2)}</span>
    </span>
  );
}
