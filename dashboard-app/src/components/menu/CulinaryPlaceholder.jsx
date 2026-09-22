import React from 'react';
import {
  Coffee, Utensils, Salad, Wine, CakeSlice, Pizza,
  Flame, CupSoda, Cookie, Croissant, Sparkles, ChefHat
} from 'lucide-react';

/**
 * Curated category/keyword rules for food styling
 */
const CULINARY_PRESETS = [
  {
    keywords: ['coffee', 'espresso', 'cappuccino', 'latte', 'macchiato', 'americano', 'mocha', 'brew', 'caffeine', 'tea', 'chai', 'matcha'],
    icon: Coffee,
    bgGradient: 'from-[#3D2619] via-[#5C3B24] to-[#784E2E]',
    patternColor: 'rgba(255, 235, 215, 0.08)',
    accentBg: 'bg-[#FAF3EB]/15',
    accentText: 'text-[#FDEBD2]',
    tag: 'Hot Beverage',
  },
  {
    keywords: ['pastry', 'croissant', 'bakery', 'bread', 'bagel', 'toast', 'muffin', 'waffle', 'pancake', 'breakfast'],
    icon: Croissant,
    bgGradient: 'from-[#8C531B] via-[#B87326] to-[#D99036]',
    patternColor: 'rgba(255, 245, 230, 0.09)',
    accentBg: 'bg-[#FFF8EE]/15',
    accentText: 'text-[#FFF2DC]',
    tag: 'Bakery & Breakfast',
  },
  {
    keywords: ['dessert', 'cake', 'cheesecake', 'pie', 'chocolate', 'tiramisu', 'brownie', 'sweet', 'ice cream', 'gelato', 'parfait'],
    icon: CakeSlice,
    bgGradient: 'from-[#6E2A3B] via-[#8C3A4D] to-[#B35368]',
    patternColor: 'rgba(255, 230, 235, 0.08)',
    accentBg: 'bg-[#FFF0F3]/15',
    accentText: 'text-[#FFE3E8]',
    tag: 'Dessert',
  },
  {
    keywords: ['cookie', 'snack', 'biscuit', 'bites'],
    icon: Cookie,
    bgGradient: 'from-[#7A4B2A] via-[#9E6438] to-[#BF814D]',
    patternColor: 'rgba(255, 240, 220, 0.08)',
    accentBg: 'bg-[#FFF5EB]/15',
    accentText: 'text-[#FFE8D1]',
    tag: 'Snack',
  },
  {
    keywords: ['burger', 'sandwich', 'wrap', 'sub', 'panini', 'club'],
    icon: Utensils,
    bgGradient: 'from-[#85341D] via-[#A84928] to-[#C96338]',
    patternColor: 'rgba(255, 235, 225, 0.08)',
    accentBg: 'bg-[#FFF2EC]/15',
    accentText: 'text-[#FFE4D8]',
    tag: 'Sandwich & Burger',
  },
  {
    keywords: ['pizza', 'pasta', 'lasagna', 'spaghetti', 'risotto', 'italian'],
    icon: Pizza,
    bgGradient: 'from-[#82241F] via-[#A6352E] to-[#C7483F]',
    patternColor: 'rgba(255, 230, 230, 0.08)',
    accentBg: 'bg-[#FFF0F0]/15',
    accentText: 'text-[#FFE0E0]',
    tag: 'Pizza & Pasta',
  },
  {
    keywords: ['salad', 'bowl', 'vegan', 'veggie', 'green', 'healthy', 'wrap', 'soup'],
    icon: Salad,
    bgGradient: 'from-[#1E3B27] via-[#2F593B] to-[#437A53]',
    patternColor: 'rgba(230, 255, 235, 0.08)',
    accentBg: 'bg-[#F0FFF3]/15',
    accentText: 'text-[#DCFCE7]',
    tag: 'Fresh & Green',
  },
  {
    keywords: ['steak', 'grill', 'bbq', 'meat', 'beef', 'chicken', 'ribs', 'roast', 'lamb', 'skewer'],
    icon: Flame,
    bgGradient: 'from-[#2A1D1A] via-[#4A2E26] to-[#6E4236]',
    patternColor: 'rgba(255, 225, 215, 0.08)',
    accentBg: 'bg-[#FFEBE5]/15',
    accentText: 'text-[#FFDDD4]',
    tag: 'Grill & Mains',
  },
  {
    keywords: ['cocktail', 'wine', 'beer', 'cider', 'spirit', 'alcohol', 'martini', 'gin', 'rum'],
    icon: Wine,
    bgGradient: 'from-[#2B1B3D] via-[#462B61] to-[#643E8C]',
    patternColor: 'rgba(245, 230, 255, 0.08)',
    accentBg: 'bg-[#F8F0FF]/15',
    accentText: 'text-[#F3E5FF]',
    tag: 'Bar & Spirits',
  },
  {
    keywords: ['juice', 'smoothie', 'soda', 'beverage', 'drink', 'lemonade', 'cooler', 'mojito', 'iced', 'water'],
    icon: CupSoda,
    bgGradient: 'from-[#123A47] via-[#1E5769] to-[#2B7A94]',
    patternColor: 'rgba(225, 250, 255, 0.08)',
    accentBg: 'bg-[#EBFBFF]/15',
    accentText: 'text-[#D0F5FF]',
    tag: 'Cold Beverage',
  },
];

const DEFAULT_PRESET = {
  icon: ChefHat,
  bgGradient: 'from-[#1E293B] via-[#334155] to-[#475569]',
  patternColor: 'rgba(255, 255, 255, 0.07)',
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
 * Premium Culinary Motif Artwork Canvas
 */
export default function CulinaryPlaceholder({
  name = '',
  categoryName = '',
  className = '',
  size = 'md', // 'sm' (bistro compact thumbnail), 'md' (standard card), 'lg' (hero modal)
}) {
  const preset = getPreset(name, categoryName);
  const Icon = preset.icon;
  const initials = getInitials(name);

  if (size === 'sm') {
    return (
      <div
        className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${preset.bgGradient} flex items-center justify-center shrink-0 shadow-xs ${className}`}
        style={{ width: '48px', height: '48px' }}
      >
        {/* Subtle radial sheen */}
        <div className="absolute inset-0 bg-radial from-white/20 to-transparent pointer-events-none" />
        <Icon size={20} className={`${preset.accentText} relative z-10`} strokeWidth={1.8} />
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-gradient-to-br ${preset.bgGradient} flex flex-col items-center justify-center select-none ${className}`}
    >
      {/* Background Decorative Concentric Rings / Geometry */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-25 mix-blend-overlay"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id={`pattern-${initials}`} width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="16" cy="16" r="1.5" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#pattern-${initials})`} />
      </svg>

      {/* Ambient Radial Vignette / Glow */}
      <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/12 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-black/25 blur-2xl pointer-events-none" />

      {/* Floating Category Stamp Tag */}
      <div className="absolute top-3 left-3 z-10">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase backdrop-blur-md bg-black/25 text-white/85 border border-white/10 shadow-xs">
          <Sparkles size={9} className="opacity-75" />
          {categoryName || preset.tag}
        </span>
      </div>

      {/* Watermark Monogram in background */}
      <span
        aria-hidden="true"
        className="absolute bottom-1 right-2 text-6xl md:text-7xl font-display font-black text-white/8 select-none pointer-events-none leading-none tracking-tighter"
      >
        {initials}
      </span>

      {/* Central Motif Icon Badge */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <div
          className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl ${preset.accentBg} backdrop-blur-md border border-white/20 shadow-lg flex items-center justify-center transform transition-transform duration-300 group-hover:scale-105`}
        >
          <Icon size={size === 'lg' ? 32 : 26} className={preset.accentText} strokeWidth={1.75} />
        </div>
        <span className={`text-[11px] font-medium tracking-wide ${preset.accentText} opacity-85 text-center px-4 line-clamp-1`}>
          {name || 'Artisan Offering'}
        </span>
      </div>
    </div>
  );
}
