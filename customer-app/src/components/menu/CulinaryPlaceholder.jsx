import React from 'react';
import {
  Coffee, Utensils, Salad, Wine, CakeSlice, Pizza,
  Flame, CupSoda, Cookie, Croissant, Sparkles, ChefHat
} from 'lucide-react';

const CULINARY_PRESETS = [
  {
    keywords: ['coffee', 'espresso', 'cappuccino', 'latte', 'macchiato', 'americano', 'mocha', 'brew', 'caffeine', 'tea', 'chai', 'matcha'],
    icon: Coffee,
    bgGradient: 'from-[#3D2619] via-[#5C3B24] to-[#784E2E]',
    accentBg: 'bg-[#FAF3EB]/15',
    accentText: 'text-[#FDEBD2]',
    tag: 'Hot Beverage',
  },
  {
    keywords: ['pastry', 'croissant', 'bakery', 'bread', 'bagel', 'toast', 'muffin', 'waffle', 'pancake', 'breakfast'],
    icon: Croissant,
    bgGradient: 'from-[#8C531B] via-[#B87326] to-[#D99036]',
    accentBg: 'bg-[#FFF8EE]/15',
    accentText: 'text-[#FFF2DC]',
    tag: 'Bakery & Breakfast',
  },
  {
    keywords: ['dessert', 'cake', 'cheesecake', 'pie', 'chocolate', 'tiramisu', 'brownie', 'sweet', 'ice cream', 'gelato', 'parfait'],
    icon: CakeSlice,
    bgGradient: 'from-[#6E2A3B] via-[#8C3A4D] to-[#B35368]',
    accentBg: 'bg-[#FFF0F3]/15',
    accentText: 'text-[#FFE3E8]',
    tag: 'Dessert',
  },
  {
    keywords: ['cookie', 'snack', 'biscuit', 'bites'],
    icon: Cookie,
    bgGradient: 'from-[#7A4B2A] via-[#9E6438] to-[#BF814D]',
    accentBg: 'bg-[#FFF5EB]/15',
    accentText: 'text-[#FFE8D1]',
    tag: 'Snack',
  },
  {
    keywords: ['burger', 'sandwich', 'wrap', 'sub', 'panini', 'club'],
    icon: Utensils,
    bgGradient: 'from-[#85341D] via-[#A84928] to-[#C96338]',
    accentBg: 'bg-[#FFF2EC]/15',
    accentText: 'text-[#FFE4D8]',
    tag: 'Sandwich & Burger',
  },
  {
    keywords: ['pizza', 'pasta', 'lasagna', 'spaghetti', 'risotto', 'italian'],
    icon: Pizza,
    bgGradient: 'from-[#82241F] via-[#A6352E] to-[#C7483F]',
    accentBg: 'bg-[#FFF0F0]/15',
    accentText: 'text-[#FFE0E0]',
    tag: 'Pizza & Pasta',
  },
  {
    keywords: ['salad', 'bowl', 'vegan', 'veggie', 'green', 'healthy', 'wrap', 'soup'],
    icon: Salad,
    bgGradient: 'from-[#1E3B27] via-[#2F593B] to-[#437A53]',
    accentBg: 'bg-[#F0FFF3]/15',
    accentText: 'text-[#DCFCE7]',
    tag: 'Fresh & Green',
  },
  {
    keywords: ['steak', 'grill', 'bbq', 'meat', 'beef', 'chicken', 'ribs', 'roast', 'lamb', 'skewer'],
    icon: Flame,
    bgGradient: 'from-[#2A1D1A] via-[#4A2E26] to-[#6E4236]',
    accentBg: 'bg-[#FFEBE5]/15',
    accentText: 'text-[#FFDDD4]',
    tag: 'Grill & Mains',
  },
  {
    keywords: ['cocktail', 'wine', 'beer', 'cider', 'spirit', 'alcohol', 'martini', 'gin', 'rum'],
    icon: Wine,
    bgGradient: 'from-[#2B1B3D] via-[#462B61] to-[#643E8C]',
    accentBg: 'bg-[#F8F0FF]/15',
    accentText: 'text-[#F3E5FF]',
    tag: 'Bar & Spirits',
  },
  {
    keywords: ['juice', 'smoothie', 'soda', 'beverage', 'drink', 'lemonade', 'cooler', 'mojito', 'iced', 'water'],
    icon: CupSoda,
    bgGradient: 'from-[#123A47] via-[#1E5769] to-[#2B7A94]',
    accentBg: 'bg-[#EBFBFF]/15',
    accentText: 'text-[#D0F5FF]',
    tag: 'Cold Beverage',
  },
];

const DEFAULT_PRESET = {
  icon: ChefHat,
  bgGradient: 'from-[#1E293B] via-[#334155] to-[#475569]',
  accentBg: 'bg-white/15',
  accentText: 'text-white/90',
  tag: 'Specialty',
};

function getPreset(name = '', categoryName = '') {
  const combined = `${name} ${categoryName}`.toLowerCase();
  for (const preset of CULINARY_PRESETS) {
    if (preset.keywords.some((kw) => combined.includes(kw))) {
      return preset;
    }
  }
  return DEFAULT_PRESET;
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Premium Culinary Motif Artwork Canvas for Customer App
 */
export default function CulinaryPlaceholder({
  name = '',
  categoryName = '',
  className = '',
  size = 'md',
}) {
  const preset = getPreset(name, categoryName);
  const Icon = preset.icon;
  const initials = getInitials(name);

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-gradient-to-br ${preset.bgGradient} flex flex-col items-center justify-center select-none ${className}`}
    >
      {/* Background Decorative Rings */}
      <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-black/20 blur-xl pointer-events-none" />

      {/* Subtle Category Badge */}
      <div className="absolute top-2.5 left-2.5 z-10">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase backdrop-blur-md bg-black/30 text-white/90 border border-white/10 shadow-xs">
          <Sparkles size={8} className="opacity-80" />
          {categoryName || preset.tag}
        </span>
      </div>

      {/* Watermark Monogram in background */}
      <span
        aria-hidden="true"
        className="absolute bottom-1 right-2 text-5xl md:text-6xl font-display font-black text-white/8 select-none pointer-events-none leading-none tracking-tighter"
      >
        {initials}
      </span>

      {/* Central Motif Icon Badge */}
      <div className="relative z-10 flex flex-col items-center gap-1.5">
        <div
          className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl ${preset.accentBg} backdrop-blur-md border border-white/20 shadow-md flex items-center justify-center`}
        >
          <Icon size={size === 'lg' ? 30 : 24} className={preset.accentText} strokeWidth={1.8} />
        </div>
        {size === 'lg' && (
          <span className={`text-xs font-semibold tracking-wide ${preset.accentText} opacity-90 text-center px-4 line-clamp-1`}>
            {name || 'Artisan Offering'}
          </span>
        )}
      </div>
    </div>
  );
}
