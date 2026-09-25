import { Check, Sparkles } from 'lucide-react';
import clsx from 'clsx';

/**
 * Miniature CSS preview depicting the archetype's stationery & card layout
 */
function ArchetypeMiniature({ template }) {
  const isDark = template.backgroundColor === '#1A1A1E' || template.id === 'fast_casual';

  return (
    <div
      className="w-16 h-22 rounded-xl shadow-sm border overflow-hidden relative flex flex-col justify-between p-1.5 shrink-0 transition-transform group-hover:scale-105"
      style={{
        backgroundColor: template.backgroundColor || '#FFFFFF',
        borderColor: isDark ? '#333338' : 'rgba(18, 26, 44, 0.12)',
        boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Top Banner / Hero preview */}
      {template.id === 'cafe_artisan' && (
        <div className="w-full h-5 rounded-t-lg bg-[#1B382B] flex items-center justify-center">
          <div className="w-4 h-0.5 rounded-full bg-[#55E6A5]" />
        </div>
      )}
      {template.id === 'fast_casual' && (
        <div className="w-full h-5 rounded-t-lg bg-[#FFA800] flex items-center justify-center">
          <div className="w-5 h-1 rounded-sm bg-[#1A1A1E]" />
        </div>
      )}
      {template.id === 'fresh_mart' && (
        <div className="w-full h-5 rounded-t-lg bg-[#0B3B24] flex items-center justify-center">
          <div className="w-4 h-0.5 rounded-full bg-[#86EFAC]" />
        </div>
      )}
      {template.id === 'luxury_hotel' && (
        <div className="w-full h-5 rounded-t-lg bg-[#0C192E] border-b border-[#E5C583] flex items-center justify-center">
          <div className="w-2.5 h-1 border-t border-[#E5C583]" />
        </div>
      )}
      {template.id === 'cultural_heritage' && (
        <div
          className="w-full h-4 rounded-t-lg flex items-center justify-center border-b border-[#781812]/20"
          style={{
            background: 'repeating-linear-gradient(45deg, #781812, #781812 3px, #D97706 3px, #D97706 6px)',
          }}
        />
      )}
      {template.id === 'liquor_bar' && (
        <div className="w-full h-5 rounded-t-lg bg-[#0D0B08] border-b border-[#E5C583]/40 flex items-center justify-center">
          <div className="w-3 h-1 rounded-full bg-[#E5C583]" />
        </div>
      )}

      {/* Middle QR Code Miniature Mockup */}
      <div className="flex-1 flex items-center justify-center py-1">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center border p-0.5 shadow-2xs"
          style={{
            backgroundColor: isDark ? '#26262B' : '#FFFFFF',
            borderColor: isDark ? '#404048' : 'rgba(0,0,0,0.08)',
          }}
        >
          {/* Simulated 2D QR Code Matrix */}
          <div className="w-full h-full grid grid-cols-3 gap-0.5 p-0.5">
            <div className="rounded-[1px]" style={{ backgroundColor: template.dotColor }} />
            <div className="rounded-[1px] opacity-20" style={{ backgroundColor: template.dotColor }} />
            <div className="rounded-[1px]" style={{ backgroundColor: template.dotColor }} />
            <div className="rounded-[1px] opacity-30" style={{ backgroundColor: template.dotColor }} />
            <div className="rounded-[1px]" style={{ backgroundColor: template.accentColor }} />
            <div className="rounded-[1px] opacity-20" style={{ backgroundColor: template.dotColor }} />
            <div className="rounded-[1px]" style={{ backgroundColor: template.dotColor }} />
            <div className="rounded-[1px] opacity-40" style={{ backgroundColor: template.dotColor }} />
            <div className="rounded-[1px]" style={{ backgroundColor: template.dotColor }} />
          </div>
        </div>
      </div>

      {/* Bottom Table Number Badge miniature */}
      <div className="flex justify-center">
        <div
          className="px-1.5 py-0.5 rounded text-[8px] font-bold tracking-tight shadow-2xs scale-90"
          style={{
            backgroundColor: template.badgeBg,
            color: template.badgeText,
          }}
        >
          TABLE 1
        </div>
      </div>
    </div>
  );
}

/**
 * QRTemplateCard — Tactile, high-visibility card archetype selector item.
 */
export default function QRTemplateCard({
  template,
  isSelected,
  onClick,
  isDefault = false,
  className = '',
}) {
  return (
    <div
      onClick={onClick}
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onClick();
        }
      }}
      className={clsx(
        'group cursor-pointer rounded-2xl p-3.5 border-2 transition-all flex items-start gap-3.5 relative text-left outline-none select-none active:scale-[0.99]',
        isSelected
          ? 'bg-teal/5 border-teal shadow-sm ring-2 ring-teal/20'
          : 'bg-white border-ink/8 hover:border-ink/20 hover:shadow-xs hover:bg-ink/[0.01]',
        className
      )}
    >
      {/* Miniature Visual Mockup */}
      <ArchetypeMiniature template={template} />

      {/* Archetype Metadata */}
      <div className="flex-1 min-w-0 pr-6">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-base leading-none">{template.icon}</span>
          <h4 className="font-display font-bold text-sm text-ink truncate leading-tight">
            {template.name}
          </h4>
          {isDefault && (
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-ink text-white">
              Default
            </span>
          )}
        </div>

        <p className="text-[11px] font-semibold text-teal mb-1 truncate">
          {template.category}
        </p>

        <p className="text-xs text-ink-muted leading-relaxed line-clamp-2 mb-2">
          {template.description}
        </p>

        {/* Color Palette Swatches */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="text-[10px] text-ink-muted/70 font-medium">Palette:</span>
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full border border-black/10 shadow-2xs"
              style={{ backgroundColor: template.dotColor }}
              title="QR & Accent Color"
            />
            <span
              className="w-3 h-3 rounded-full border border-black/10 shadow-2xs"
              style={{ backgroundColor: template.accentColor }}
              title="Highlight Color"
            />
            <span
              className="w-3 h-3 rounded-full border border-black/10 shadow-2xs"
              style={{ backgroundColor: template.backgroundColor || '#FFFFFF' }}
              title="Stationery Tone"
            />
          </div>
        </div>
      </div>

      {/* Active Selection Checkmark / Radio Pill */}
      <div className="absolute top-3.5 right-3.5">
        <div
          className={clsx(
            'w-5 h-5 rounded-full flex items-center justify-center transition-all',
            isSelected
              ? 'bg-teal text-white shadow-sm scale-100'
              : 'border-2 border-ink/20 group-hover:border-ink/40 scale-95'
          )}
        >
          {isSelected && <Check size={12} strokeWidth={3} />}
        </div>
      </div>
    </div>
  );
}
