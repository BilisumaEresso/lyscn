import { useState, useEffect, useRef } from 'react';
import { QR_TEMPLATES, renderPrintCardCanvas } from '../lib/qrCardComposer';
import { CANVAS_FORMATS } from '../lib/cards/layoutSpec';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';

// ── Standard Sample Data (§10.10) ─────────────────────────────────────────────
const sampleRestaurant = {
  name: 'Elili Cafe',
  brandColor: '#1B382B',
  description: 'WE SERVE QUALITY, WE THRIVE FOR YOUR SATISFACTION',
  logoUrl: null,
  paymentAccounts: {
    telebirr: { accountNumber: '0902882087', isActive: true },
    cbeBirr: { accountNumber: '1000594630107', isActive: true },
  },
};

const sampleTable = {
  label: 'Table 1',
  qrToken: '8E47AF83AFAA9E5A',
};

// ── Stress Test Case (§10.10) ─────────────────────────────────────────────────
const stressRestaurant = {
  name: 'The Grand Royal Ethiopian Gourmet Bistro & Lounge', // 49 characters
  brandColor: '#18181B',
  description: 'AUTHENTIC HERITAGE CUISINE, ARTISAN SPECIALTY COFFEE, AND EXQUISITE HANDCRAFTED PASTRIES DAILY', // 94 characters
  logoUrl: null,
  paymentAccounts: {
    telebirr: { accountNumber: '0902882087', isActive: true },
    cbeBirr: { accountNumber: '1000594630107', isActive: true },
    awashBank: { accountNumber: '01320876543200', isActive: true },
  },
};

const stressTable = {
  label: 'VIP Booth 99',
  qrToken: 'F4C89A12B7E35D01',
};

function CardPreviewItem({ design, orientation, isStress = false }) {
  const [dataUrl, setDataUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  const restaurantToUse = isStress ? stressRestaurant : sampleRestaurant;
  const tableToUse = isStress ? stressTable : sampleTable;

  useEffect(() => {
    isMounted.current = true;
    setLoading(true);
    setError(null);

    renderPrintCardCanvas({
      table: tableToUse,
      restaurant: restaurantToUse,
      templateId: design.id,
      orientation,
    })
      .then((canvas) => {
        if (isMounted.current) {
          setDataUrl(canvas.toDataURL('image/png'));
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(`Render failed for ${design.id} (${orientation}):`, err);
        if (isMounted.current) {
          setError(err?.message || 'Render failed');
          setLoading(false);
        }
      });

    return () => {
      isMounted.current = false;
    };
  }, [design.id, orientation, isStress]);

  const format = CANVAS_FORMATS[orientation] || CANVAS_FORMATS.portrait;
  const aspectClass =
    orientation === 'landscape'
      ? 'aspect-[2480/1748]'
      : orientation === 'menu_board'
      ? 'aspect-[1654/2339]'
      : 'aspect-[1240/1748]';

  return (
    <div className="bg-white rounded-2xl border border-ink/10 p-4 shadow-sm flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ink/5 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{design.icon}</span>
          <div>
            <h3 className="font-bold text-sm text-ink leading-tight">{design.name}</h3>
            <p className="text-[11px] text-ink-muted">{design.category} · <code className="text-[10px] bg-ink/5 px-1 py-0.5 rounded">{design.id}</code></p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-ink/5 text-ink-muted">
          {format.physical}
        </span>
      </div>

      {/* Canvas Viewport */}
      <div className={`relative w-full ${aspectClass} bg-ink/5 rounded-xl overflow-hidden border border-ink/10 flex items-center justify-center`}>
        {loading && (
          <div className="flex flex-col items-center gap-2 text-ink-muted">
            <Spinner size="md" />
            <span className="text-xs font-medium">Compositing…</span>
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-red-600 text-xs">
            <p className="font-bold">Error rendering</p>
            <p className="font-mono text-[10px] mt-1">{error}</p>
          </div>
        )}

        {!loading && dataUrl && (
          <img
            src={dataUrl}
            alt={`${design.name} preview`}
            className="w-full h-full object-contain select-none"
          />
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] text-ink-muted pt-1">
        <span>{format.width} × {format.height} px</span>
        <span className="capitalize">{orientation.replace('_', ' ')}</span>
      </div>
    </div>
  );
}

export default function CardContactSheet() {
  const [orientation, setOrientation] = useState('portrait');
  const [isStress, setIsStress] = useState(false);

  return (
    <div className="min-h-screen bg-[#F4F4F6] text-ink p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Control Bar */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-ink/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md bg-teal/10 text-teal text-[11px] font-bold uppercase tracking-wider">
                Dev Engine Visual Suite
              </span>
              <span className="text-xs text-ink-muted">LayoScan Cards v2.0</span>
            </div>
            <h1 className="text-2xl font-bold font-display tracking-tight text-ink">
              Card Engine Contact Sheet (9 Archetypes)
            </h1>
            <p className="text-sm text-ink-muted mt-1">
              Background-image-first declarative card compositing pipeline.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Stress Toggle */}
            <button
              type="button"
              onClick={() => setIsStress(!isStress)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                isStress
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-white text-ink border-ink/15 hover:bg-ink/5'
              }`}
            >
              {isStress ? '🔥 Stress Test Active (40+ Char Name)' : '🧪 Standard Sample Data'}
            </button>

            {/* Orientation Switcher */}
            <div className="inline-flex rounded-xl bg-ink/5 p-1 border border-ink/10">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  orientation === 'portrait' ? 'bg-white shadow-xs text-ink' : 'text-ink-muted hover:text-ink'
                }`}
              >
                Portrait (A6)
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  orientation === 'landscape' ? 'bg-white shadow-xs text-ink' : 'text-ink-muted hover:text-ink'
                }`}
              >
                Landscape Tent (A5)
              </button>
              <button
                type="button"
                onClick={() => setOrientation('menu_board')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  orientation === 'menu_board' ? 'bg-white shadow-xs text-ink' : 'text-ink-muted hover:text-ink'
                }`}
              >
                Menu Board (A4)
              </button>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-teal/5 border border-teal/20 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between text-xs text-ink-muted gap-2">
          <div>
            <strong className="text-ink">Visual Verification Mode:</strong> Currently viewing{' '}
            <span className="font-semibold text-teal">{QR_TEMPLATES.length} designs</span> across{' '}
            <span className="font-semibold text-teal">{orientation}</span> orientation.
            Each card renders dynamic text, QR code (quiet zone ≥ 8%), table pill, and background cover.
          </div>
          <div className="text-[11px] font-mono text-ink-muted">
            Target: {CANVAS_FORMATS[orientation]?.width} × {CANVAS_FORMATS[orientation]?.height} px
          </div>
        </div>

        {/* 9 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {QR_TEMPLATES.map((design) => (
            <CardPreviewItem
              key={design.id}
              design={design}
              orientation={orientation}
              isStress={isStress}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
