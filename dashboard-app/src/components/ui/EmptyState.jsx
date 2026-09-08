import Button from './Button';

export default function EmptyState({ icon: Icon, title, description, action, actionLabel }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-mint/50 flex items-center justify-center mb-4">
          <Icon size={24} className="text-teal" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="font-display font-semibold text-lg text-ink mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-ink-muted max-w-xs">{description}</p>
      )}
      {action && (
        <div className="mt-5">
          <Button onClick={action}>{actionLabel}</Button>
        </div>
      )}
    </div>
  );
}
