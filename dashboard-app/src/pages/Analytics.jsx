import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart2, TrendingUp, Star, Users, CreditCard,
  ShoppingBag, Calendar, ChevronDown, AlertCircle, Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import Currency from '../components/ui/Currency';
import Spinner from '../components/ui/Spinner';
import { exportToCSV } from '../lib/csvExport';
import { useAuthStore } from '../store/authStore';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) { return Number(n || 0).toFixed(2); }

function toISO(d) { return d.toISOString().split('T')[0]; }

function getPreset(key) {
  const now  = new Date();
  const to   = toISO(now);
  switch (key) {
    case '7d': {
      const f = new Date(now); f.setDate(f.getDate() - 6);
      return { from: toISO(f), to };
    }
    case '30d': {
      const f = new Date(now); f.setDate(f.getDate() - 29);
      return { from: toISO(f), to };
    }
    case 'today':
      return { from: to, to };
    case 'yesterday': {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return { from: toISO(y), to: toISO(y) };
    }
    default:
      return { from: toISO(new Date(now.setDate(now.getDate() - 29))), to };
  }
}

// ── Mini bar chart (pure SVG, no deps) ───────────────────────────────────────
function BarChart({ data = [], valueKey = 'revenue', labelKey = 'date', color = '#14B8A6' }) {
  if (!data.length) return null;
  const max   = Math.max(...data.map((d) => d[valueKey]), 1);
  const H     = 120;
  const W_BAR = Math.max(8, Math.floor(480 / data.length) - 3);
  const GAP   = 3;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${(W_BAR + GAP) * data.length} ${H + 28}`}
        width="100%"
        style={{ minWidth: Math.min(data.length * (W_BAR + GAP), 800) }}
        className="block"
        aria-label="Bar chart"
      >
        {data.map((d, i) => {
          const barH  = Math.max(2, Math.round((d[valueKey] / max) * H));
          const x     = i * (W_BAR + GAP);
          const y     = H - barH;
          const label = String(d[labelKey]).slice(5); // strip year for space

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={W_BAR}
                height={barH}
                rx={3}
                fill={color}
                opacity={0.85}
              />
              {data.length <= 14 && (
                <text
                  x={x + W_BAR / 2}
                  y={H + 14}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#94a3b8"
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Horizontal bar for top items ──────────────────────────────────────────────
function HBar({ label, value, max, sub, color = '#14B8A6' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink font-medium truncate max-w-[60%]">{label}</span>
        <span className="text-ink-muted shrink-0">{sub}</span>
      </div>
      <div className="h-2 bg-ink/6 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-ink/8 p-5 shadow-xs ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={16} className="text-teal shrink-0" />
      <h2 className="font-display font-semibold text-sm text-ink">{children}</h2>
    </div>
  );
}

// ── Default Payment method labels (Ethiopia standards & cash/pos) ─────────────
const DEFAULT_PM_LABEL = {
  cash:     { label: 'Cash',       color: '#10B981' },
  pos:      { label: 'POS Card',   color: '#6366F1' },
  telebirr: { label: 'Telebirr',   color: '#3B82F6' },
  cbebirr:  { label: 'CBE Birr',   color: '#8B5CF6' },
  awash:    { label: 'Awash Bank', color: '#1E40AF' },
  other:    { label: 'Other Bank', color: '#D97706' },
  unknown:  { label: 'Unknown',    color: '#CBD5E1' },
};

const PRESETS = [
  { key: 'today',     label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d',        label: 'Last 7 days' },
  { key: '30d',       label: 'Last 30 days' },
];

// ── Main Analytics Page ───────────────────────────────────────────────────────
export default function Analytics() {
  const [preset, setPreset]     = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const { from, to } = useMemo(() => {
    if (showCustom && customFrom && customTo) return { from: customFrom, to: customTo };
    return getPreset(preset);
  }, [preset, showCustom, customFrom, customTo]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics', from, to],
    queryFn: () => api.get('/analytics', { params: { from, to } }).then((r) => r.data),
    staleTime: 60_000,
    keepPreviousData: true,
  });

  // Pull active bank & payment settings from restaurant profile or analytics payload
  const { restaurant: authRestaurant } = useAuthStore();
  const { data: restaurantData } = useQuery({
    queryKey: ['restaurant-me'],
    queryFn: () => api.get('/restaurants/me').then((r) => r.data),
    staleTime: 60_000,
  });
  const restaurant = restaurantData?.restaurant || authRestaurant;
  const paymentAccounts = data?.paymentAccounts || restaurant?.paymentAccounts || {};

  const s   = data?.summary    || {};
  const pm  = data?.paymentMethods || [];
  const top = data?.topProducts    || [];
  const daily    = data?.daily       || [];
  const ratings  = data?.ratings     || [];
  const staff    = data?.staffPerf   || [];
  const hourly   = data?.hourlyDist  || [];

  // ── Dynamic payment method resolver based on settings ───────────────────────
  const getMethodMeta = useCallback((method) => {
    const key = String(method || 'unknown').toLowerCase();
    if (key === 'cash') {
      return { label: 'Cash', color: '#10B981', isConfigured: true };
    }
    if (key === 'pos' || key === 'card') {
      return { label: 'POS Card', color: '#6366F1', isConfigured: true };
    }
    if (key === 'telebirr') {
      const isConfigured = Boolean(paymentAccounts.telebirr?.isActive && paymentAccounts.telebirr?.accountNumber);
      return {
        label: 'Telebirr',
        color: '#3B82F6',
        isConfigured,
        accountName: paymentAccounts.telebirr?.accountName || '',
      };
    }
    if (key === 'cbebirr' || key === 'cbe') {
      const isConfigured = Boolean(paymentAccounts.cbeBirr?.isActive && paymentAccounts.cbeBirr?.accountNumber);
      return {
        label: 'CBE Birr',
        color: '#8B5CF6',
        isConfigured,
        accountName: paymentAccounts.cbeBirr?.accountName || '',
      };
    }
    if (key === 'awash' || key === 'awashbank') {
      const isConfigured = Boolean(paymentAccounts.awashBank?.isActive && paymentAccounts.awashBank?.accountNumber);
      return {
        label: 'Awash Bank',
        color: '#1E40AF',
        isConfigured,
        accountName: paymentAccounts.awashBank?.accountName || '',
      };
    }
    if (key === 'other' || key === 'otherbank') {
      const customBankName = paymentAccounts.otherBank?.bankName?.trim();
      const isConfigured = Boolean(paymentAccounts.otherBank?.isActive && (paymentAccounts.otherBank?.accountNumber || customBankName));
      return {
        label: customBankName || 'Other Bank',
        color: '#D97706',
        isConfigured,
        accountName: paymentAccounts.otherBank?.accountName || '',
      };
    }
    return {
      label: String(method).charAt(0).toUpperCase() + String(method).slice(1),
      color: '#94A3B8',
      isConfigured: false,
    };
  }, [paymentAccounts]);

  // Build dynamic payment breakdown list including configured banks and default banks
  const breakdownList = useMemo(() => {
    const pmMap = new Map();
    pm.forEach((p) => {
      const rawKey = String(p.method || 'unknown').toLowerCase();
      const normKey = (rawKey === 'awashbank')
        ? 'awash'
        : (rawKey === 'cbe')
        ? 'cbebirr'
        : (rawKey === 'otherbank')
        ? 'other'
        : rawKey;
      const cur = pmMap.get(normKey);
      if (cur) {
        pmMap.set(normKey, { method: normKey, count: cur.count + (p.count || 0), revenue: cur.revenue + (p.revenue || 0) });
      } else {
        pmMap.set(normKey, { method: normKey, count: p.count || 0, revenue: p.revenue || 0 });
      }
    });

    // Default channels: Cash, POS Card, Telebirr, CBE Birr, Awash Bank
    const defaultKeys = ['cash', 'pos', 'telebirr', 'cbebirr', 'awash'];
    const keysToInclude = new Set(defaultKeys);

    // If user configured any additional bank in settings under otherBank, include it
    const hasOtherInSettings = Boolean(
      paymentAccounts.otherBank?.bankName?.trim() ||
      paymentAccounts.otherBank?.accountNumber?.trim() ||
      paymentAccounts.otherBank?.isActive
    );
    if (hasOtherInSettings || pmMap.has('other')) {
      keysToInclude.add('other');
    }

    // Include any other methods found in orders (e.g. unknown, etc.)
    pmMap.forEach((_, key) => {
      keysToInclude.add(key);
    });

    const list = Array.from(keysToInclude).map((k) => {
      const stats = pmMap.get(k) || { method: k, count: 0, revenue: 0 };
      const meta = getMethodMeta(k);
      return {
        method: k,
        label: meta.label,
        color: meta.color,
        isConfigured: meta.isConfigured,
        accountName: meta.accountName,
        count: stats.count,
        revenue: stats.revenue,
      };
    });

    // Sort: highest revenue first, then highest order count, then alphabetically
    list.sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    });

    return list;
  }, [pm, paymentAccounts, getMethodMeta]);

  const pmTotal  = useMemo(() => {
    return breakdownList.reduce((a, p) => a + (p.revenue || 0), 0);
  }, [breakdownList]);
  const topMax   = top[0]?.qty || 1;
  const hourMax  = Math.max(...hourly.map((h) => h.orders), 1);

  // Build 24-hr hourly array (fill missing hours with 0)
  const hourlyFull = Array.from({ length: 24 }, (_, i) => {
    const found = hourly.find((h) => h.hour === i);
    return { hour: i, orders: found?.orders || 0, label: `${i}:00` };
  });

  const handleExportFullReport = () => {
    if (!data) {
      toast.error('No data available to export');
      return;
    }

    const headers = [
      'Report Type',
      'Period From',
      'Period To',
      'Total Orders',
      'Total Revenue (Br)',
      'Unpaid Revenue (Br)',
      'Cancelled Orders',
      'Avg Order Value (Br)',
      'Avg Rating',
      'Total Reviews',
    ];

    const rows = [
      [
        'Summary',
        from,
        to,
        s.totalOrders ?? 0,
        s.totalRevenue ?? 0,
        s.unpaidRevenue ?? 0,
        s.cancelledOrders ?? 0,
        s.avgOrderValue ?? 0,
        s.avgRating ?? 'N/A',
        s.ratingCount ?? 0,
      ],
    ];

    exportToCSV(`analytics-summary-${from}-to-${to}`, headers, rows);
    toast.success('Analytics summary exported as CSV!');
  };

  const handleExportDailyData = () => {
    if (!daily || !daily.length) {
      toast.error('No daily revenue data to export');
      return;
    }
    const headers = ['Date', 'Paid Revenue (Br)', 'Total Orders'];
    const rows = daily.map((d) => [d.date, d.revenue, d.orders]);
    exportToCSV(`daily-revenue-${from}-to-${to}`, headers, rows);
    toast.success('Daily revenue report exported as CSV!');
  };

  const handleExportTopProducts = () => {
    if (!top || !top.length) {
      toast.error('No product sales data to export');
      return;
    }
    const headers = ['Product Name', 'Quantity Sold', 'Total Revenue (Br)', 'Order Count'];
    const rows = top.map((p) => [p.name, p.qty, p.revenue, p.orders]);
    exportToCSV(`top-products-${from}-to-${to}`, headers, rows);
    toast.success('Top products report exported as CSV!');
  };

  const handleExportStaffPerf = () => {
    if (!staff || !staff.length) {
      toast.error('No staff performance data to export');
      return;
    }
    const headers = ['Staff Name', 'Orders Served', 'Revenue Handled (Br)', 'Average Rating'];
    const rows = staff.map((st) => [st.name, st.ordersServed, st.revenue, st.avgRating ?? 'N/A']);
    exportToCSV(`staff-performance-${from}-to-${to}`, headers, rows);
    toast.success('Staff performance report exported as CSV!');
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-5 md:px-6 md:py-6 lg:px-8 lg:pt-14 lg:pb-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink flex items-center gap-2">
            <BarChart2 size={22} className="text-teal" />
            Analytics & Reports
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {from === to ? from : `${from} → ${to}`}
          </p>
        </div>

        {/* Action Controls: Period selector + Export CSV */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-ink/4 rounded-xl p-1 gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => { setPreset(p.key); setShowCustom(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  preset === p.key && !showCustom
                    ? 'bg-white text-ink shadow-xs'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowCustom((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                showCustom ? 'bg-white text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Calendar size={11} /> Custom
              <ChevronDown size={11} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportFullReport}
            disabled={!data || isLoading}
            className="px-3.5 py-1.5 rounded-xl border border-ink/10 bg-white hover:bg-ink/3 text-xs font-semibold text-ink flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
            title="Download Summary Report as CSV"
          >
            <Download size={13} className="text-teal" />
            <span>Export CSV</span>
          </button>

          {showCustom && (
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto mt-2 sm:mt-0">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="text-xs border border-ink/12 rounded-lg px-2 py-1.5 text-ink focus:outline-none focus:border-teal bg-white"
              />
              <span className="text-xs text-ink-muted">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="text-xs border border-ink/12 rounded-lg px-2 py-1.5 text-ink focus:outline-none focus:border-teal bg-white"
              />
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-3 text-ink-muted py-12 justify-center">
          <Spinner />
          <span className="text-sm">Loading analytics…</span>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-3 p-5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          Failed to load analytics. Please refresh.
        </div>
      )}

      {data && (
        <>
          {/* ── Summary KPI Row ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              {
                label: 'Total Orders',
                value: s.totalOrders ?? 0,
                icon: ShoppingBag,
                sub: `${s.cancelledOrders ?? 0} cancelled`,
                accent: true,
              },
              {
                label: 'Total Revenue',
                value: <Currency value={s.totalRevenue} />,
                icon: TrendingUp,
                sub: `Avg Br ${fmt(s.avgOrderValue)} / order`,
              },
              {
                label: 'Unpaid Revenue',
                value: <Currency value={s.unpaidRevenue} />,
                icon: CreditCard,
                sub: 'outstanding balance',
                warn: (s.unpaidRevenue || 0) > 0,
              },
              {
                label: 'Avg Rating',
                value: s.avgRating != null ? `${s.avgRating} ★` : '—',
                icon: Star,
                sub: `${s.ratingCount ?? 0} reviews`,
              },
            ].map(({ label, value, icon: Icon, sub, accent, warn }) => (
              <div
                key={label}
                className={`rounded-xl border p-5 ${
                  accent
                    ? 'border-teal/30 bg-teal/4'
                    : warn
                    ? 'border-red-200 bg-red-50/40'
                    : 'border-ink/8 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink-muted mb-1">{label}</p>
                    <p className={`font-display font-bold text-2xl leading-none ${accent ? 'text-teal' : warn ? 'text-red-600' : 'text-ink'}`}>
                      {value}
                    </p>
                    {sub && <p className="text-xs text-ink-muted mt-1.5">{sub}</p>}
                  </div>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ml-2 ${accent ? 'bg-teal/15' : warn ? 'bg-red-100' : 'bg-ink/6'}`}>
                    <Icon size={17} className={accent ? 'text-teal' : warn ? 'text-red-500' : 'text-ink-muted'} strokeWidth={1.75} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Daily Revenue Chart ────────────────────────────────────── */}
          {daily.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <SectionTitle icon={TrendingUp}>Daily Revenue (Birr — paid orders)</SectionTitle>
                <button
                  type="button"
                  onClick={handleExportDailyData}
                  className="text-xs text-teal hover:text-teal/80 font-medium flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg hover:bg-teal/5"
                  title="Export daily revenue data as CSV"
                >
                  <Download size={12} />
                  <span>Export CSV</span>
                </button>
              </div>
              <BarChart data={daily} valueKey="revenue" labelKey="date" color="#14B8A6" />
              <div className="mt-3 flex items-center gap-4 text-xs text-ink-muted">
                <span>Peak: <strong className="text-ink">Br {fmt(Math.max(...daily.map((d) => d.revenue)))}</strong></span>
                <span>Lowest: <strong className="text-ink">Br {fmt(Math.min(...daily.filter(d => d.revenue > 0).map((d) => d.revenue)))}</strong></span>
                <span>Days with orders: <strong className="text-ink">{daily.filter((d) => d.orders > 0).length}</strong></span>
              </div>
            </Card>
          )}

          {/* ── Daily Order Count Chart ────────────────────────────────── */}
          {daily.length > 0 && (
            <Card>
              <SectionTitle icon={ShoppingBag}>Daily Order Volume</SectionTitle>
              <BarChart data={daily} valueKey="orders" labelKey="date" color="#6366F1" />
            </Card>
          )}

          {/* ── Top Products + Payment Methods ────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Items */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <SectionTitle icon={ShoppingBag}>Top 10 Menu Items</SectionTitle>
                {top.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportTopProducts}
                    className="text-xs text-teal hover:text-teal/80 font-medium flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg hover:bg-teal/5"
                    title="Export top products data as CSV"
                  >
                    <Download size={12} />
                    <span>Export CSV</span>
                  </button>
                )}
              </div>
              {top.length === 0 ? (
                <p className="text-sm text-ink-muted">No orders in this period.</p>
              ) : (
                <div className="space-y-3">
                  {top.map((item) => (
                    <HBar
                      key={item.name}
                      label={item.name}
                      value={item.qty}
                      max={topMax}
                      sub={`${item.qty} sold · Br ${fmt(item.revenue)}`}
                      color="#14B8A6"
                    />
                  ))}
                </div>
              )}
            </Card>

            {/* Payment Methods Breakdown */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <SectionTitle icon={CreditCard}>Payment Method Breakdown</SectionTitle>
                <div className="flex items-center gap-2">
                  {paymentAccounts.otherBank?.bankName && (
                    <span className="hidden sm:inline-block text-[11px] text-ink-muted bg-paper px-2 py-0.5 rounded-full border border-ink/8">
                      {paymentAccounts.otherBank.bankName}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!breakdownList.length) {
                        toast.error('No payment method data to export');
                        return;
                      }
                      const headers = ['Payment Method', 'Orders Count', 'Total Revenue (Br)', 'Share (%)', 'Configured in Settings'];
                      const rows = breakdownList.map((p) => {
                        const pct = pmTotal > 0 ? Math.round((p.revenue / pmTotal) * 100) : 0;
                        return [p.label, p.count, p.revenue, `${pct}%`, p.isConfigured ? 'Yes' : 'No'];
                      });
                      exportToCSV(`payment-methods-${from}-to-${to}`, headers, rows);
                      toast.success('Payment method breakdown exported as CSV!');
                    }}
                    className="text-xs text-ink-muted hover:text-ink px-2.5 py-1 rounded-lg border border-ink/10 bg-paper hover:bg-ink/5 transition-colors flex items-center gap-1.5"
                    title="Export payment methods as CSV"
                  >
                    <Download size={12} />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              {breakdownList.length === 0 ? (
                <p className="text-sm text-ink-muted">No payment methods configured or recorded.</p>
              ) : (
                <div className="space-y-4">
                  {breakdownList.map((p) => {
                    const pct = pmTotal > 0 ? Math.round((p.revenue / pmTotal) * 100) : 0;
                    return (
                      <div key={p.method} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-ink flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: p.color }}
                            />
                            <span>{p.label}</span>
                            {p.isConfigured && ['telebirr', 'cbebirr', 'awash', 'other'].includes(p.method) && (
                              <span
                                className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-normal border border-emerald-200/60"
                                title="Active in Settings"
                              >
                                Configured
                              </span>
                            )}
                          </span>
                          <span className="text-ink-muted">
                            {p.count} order{p.count !== 1 ? 's' : ''} · Br {fmt(p.revenue)} · {pct}%
                          </span>
                        </div>
                        <div className="h-2.5 bg-ink/6 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: p.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-ink/8 flex items-center justify-between text-xs font-semibold">
                    <span className="text-ink-muted">Total Paid Revenue</span>
                    <Currency value={pmTotal} className="text-ink" />
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* ── Peak Hours + Ratings ──────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Peak hours */}
            <Card>
              <SectionTitle icon={Calendar}>Peak Hours (order volume by hour)</SectionTitle>
              <div className="flex items-end gap-0.5 h-24">
                {hourlyFull.map((h) => {
                  const pct = Math.max(4, Math.round((h.orders / hourMax) * 100));
                  const isHot = h.orders === hourMax && h.orders > 0;
                  return (
                    <div key={h.hour} className="flex-1 flex flex-col items-center gap-0.5" title={`${h.hour}:00 — ${h.orders} orders`}>
                      <div
                        className="w-full rounded-sm transition-all"
                        style={{
                          height: `${pct}%`,
                          backgroundColor: isHot ? '#F59E0B' : '#14B8A6',
                          opacity: h.orders === 0 ? 0.15 : 0.8,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-ink-muted mt-1">
                <span>12am</span>
                <span>6am</span>
                <span>12pm</span>
                <span>6pm</span>
                <span>11pm</span>
              </div>
              {hourMax > 0 && (
                <p className="text-xs text-ink-muted mt-2">
                  Busiest hour: <strong className="text-ink">{hourlyFull.find((h) => h.orders === hourMax)?.hour}:00</strong> with <strong className="text-ink">{hourMax} orders</strong>
                </p>
              )}
            </Card>

            {/* Ratings distribution */}
            <Card>
              <SectionTitle icon={Star}>Customer Ratings</SectionTitle>
              {ratings.length === 0 ? (
                <p className="text-sm text-ink-muted">No ratings submitted in this period.</p>
              ) : (
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const found = ratings.find((r) => r.stars === star);
                    const count = found?.count || 0;
                    const total = ratings.reduce((a, r) => a + r.count, 0);
                    const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-6 text-right font-semibold text-ink shrink-0">{star}★</span>
                        <div className="flex-1 h-2.5 bg-ink/6 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-ink-muted shrink-0">
                          {count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                  <p className="text-xs text-ink-muted pt-1 border-t border-ink/8 mt-2">
                    Average: <strong className="text-amber-600 text-sm">{s.avgRating ?? '—'} / 5</strong>
                    {' '}from <strong className="text-ink">{s.ratingCount ?? 0}</strong> reviews
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* ── Staff Performance ──────────────────────────────────────── */}
          {staff.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <SectionTitle icon={Users}>Staff Performance</SectionTitle>
                <button
                  type="button"
                  onClick={handleExportStaffPerf}
                  className="text-xs text-teal hover:text-teal/80 font-medium flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg hover:bg-teal/5"
                  title="Export staff performance data as CSV"
                >
                  <Download size={12} />
                  <span>Export CSV</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-ink/6 text-xs text-ink-muted uppercase font-medium">
                      <th className="pb-3 pr-4">Waiter</th>
                      <th className="pb-3 px-4 text-right">Orders Served</th>
                      <th className="pb-3 px-4 text-right">Revenue Handled</th>
                      <th className="pb-3 pl-4 text-right">Avg Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {staff.map((w, i) => (
                      <tr key={w.name} className="hover:bg-ink/1 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-teal/10 text-teal text-xs font-bold flex items-center justify-center shrink-0">
                              {w.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <span className="font-medium text-ink">{w.name}</span>
                            {i === 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">Top</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-ink">{w.ordersServed}</td>
                        <td className="py-3 px-4 text-right text-ink-muted"><Currency value={w.revenue} /></td>
                        <td className="py-3 pl-4 text-right">
                          {w.avgRating != null ? (
                            <span className="text-amber-600 font-semibold">{w.avgRating} ★</span>
                          ) : (
                            <span className="text-ink/30 text-xs">no reviews</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
