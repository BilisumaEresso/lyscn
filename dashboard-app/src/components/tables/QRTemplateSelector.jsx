import { useState, useMemo } from 'react';
import { Sparkles, Layers } from 'lucide-react';
import { QR_TEMPLATES } from '../../lib/qrCardComposer';
import QRTemplateCard from './QRTemplateCard';

/**
 * QRTemplateSelector — Professional, responsive archetype picker with category filters.
 * Used across the QR Print Studio and Restaurant Settings.
 */
export default function QRTemplateSelector({
  selectedTemplateId,
  onSelectTemplate,
  defaultTemplateId = null,
  layout = 'list', // 'list' (stacked in studio sidebar) | 'grid' (2-col/3-col in settings)
  className = '',
}) {
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = useMemo(() => {
    return [
      { id: 'all', label: 'All Styles' },
      { id: 'cafe', label: '☕ Cafe' },
      { id: 'casual', label: '🍔 Casual' },
      { id: 'mart', label: '🥗 Market' },
      { id: 'hotel', label: '🏨 Hotel' },
      { id: 'heritage', label: '🍲 Cultural' },
      { id: 'bar', label: '🍸 Bar & Club' },
    ];
  }, []);

  const filteredTemplates = useMemo(() => {
    if (activeCategory === 'all') return QR_TEMPLATES;
    if (activeCategory === 'cafe') return QR_TEMPLATES.filter((t) => t.id === 'cafe_artisan');
    if (activeCategory === 'casual') return QR_TEMPLATES.filter((t) => t.id === 'fast_casual');
    if (activeCategory === 'mart') return QR_TEMPLATES.filter((t) => t.id === 'fresh_mart');
    if (activeCategory === 'hotel') return QR_TEMPLATES.filter((t) => t.id === 'luxury_hotel');
    if (activeCategory === 'heritage') return QR_TEMPLATES.filter((t) => t.id === 'cultural_heritage');
    if (activeCategory === 'bar') return QR_TEMPLATES.filter((t) => t.id === 'liquor_bar');
    return QR_TEMPLATES;
  }, [activeCategory]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Category Pills Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? 'bg-ink text-white shadow-2xs'
                : 'bg-paper text-ink-muted hover:text-ink hover:bg-ink/5 border border-ink/8'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template Card Showcase */}
      <div
        className={
          layout === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5'
            : 'space-y-2.5'
        }
      >
        {filteredTemplates.map((template) => (
          <QRTemplateCard
            key={template.id}
            template={template}
            isSelected={selectedTemplateId === template.id}
            onClick={() => onSelectTemplate(template.id)}
            isDefault={defaultTemplateId === template.id}
          />
        ))}
      </div>
    </div>
  );
}
