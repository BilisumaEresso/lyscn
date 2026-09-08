import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';

function StatCard({ icon: Icon, label, value, sub, accent = false }) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? 'border-teal/30 bg-teal/4' : 'border-ink/8 bg-white'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-ink-muted mb-1">{label}</p>
          <p className={`font-display font-bold text-3xl ${accent ? 'text-teal' : 'text-ink'}`}>
            {value}
          </p>
          {sub && <p className="text-xs text-ink-muted mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? 'bg-teal/15' : 'bg-ink/6'}`}>
          <Icon size={20} className={accent ? 'text-teal' : 'text-ink-muted'} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { restaurant } = useAuthStore();

  // Today's orders
  const today = new Date().toISOString().split('T')[0];
  const { data: todayData, isLoading } = useQuery({
    queryKey: ['orders-today', today],
    queryFn: () => api.get('/orders', { params: { date: today } }).then((r) => r.data),
    refetchInterval: 30_000,
  });

  // All orders (for unpaid count across all time)
  const { data: allData } = useQuery({
    queryKey: ['orders-unpaid'],
    queryFn: () => api.get('/orders').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const todayOrders = todayData?.orders ?? [];
  const allOrders   = allData?.orders ?? [];

  const todayCount   = todayOrders.length;
  const todayRevenue = todayOrders
    .filter((o) => o.paymentStatus === 'paid')
    .reduce((s, o) => s + o.totalAmount, 0);
  const unpaidCount  = allOrders.filter(
    (o) => o.paymentStatus === 'unpaid' && o.status !== 'cancelled'
  ).length;
  const placedCount  = todayOrders.filter((o) => o.status === 'placed').length;

  const recentOrders = [...allOrders].slice(0, 5);

  return (
    <div className="max-w-[1200px] mx-auto px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-ink">
          Good {getGreeting()},{' '}
          <span className="text-teal">{restaurant?.name ?? 'Dashboard'}</span>
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 text-ink-muted py-8">
          <Spinner />
          <span className="text-sm">Loading today's stats…</span>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <StatCard
              icon={ShoppingBag}
              label="Orders today"
              value={todayCount}
              sub="across all tables"
              accent
            />
            <StatCard
              icon={DollarSign}
              label="Revenue today"
              value={`$${todayRevenue.toFixed(2)}`}
              sub="paid orders only"
            />
            <StatCard
              icon={AlertCircle}
              label="Unpaid orders"
              value={unpaidCount}
              sub="pending payment"
            />
            <StatCard
              icon={Clock}
              label="New (placed)"
              value={placedCount}
              sub="need acceptance"
            />
          </div>

          {/* Recent orders */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-lg text-ink">Recent orders</h2>
              <Link
                to="/orders"
                className="text-sm text-teal hover:text-teal/70 font-medium transition-colors"
              >
                View all →
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="border border-ink/8 rounded-xl p-8 text-center">
                <ShoppingBag size={32} className="text-ink/20 mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm text-ink-muted">No orders yet today.</p>
                <p className="text-xs text-ink/40 mt-1">
                  Orders will appear here as customers scan and order.
                </p>
              </div>
            ) : (
              <div className="border border-ink/8 rounded-xl overflow-hidden bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink/6 bg-ink/2">
                      <th className="text-left px-4 py-3 text-xs font-medium text-ink-muted">Table</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-ink-muted">Items</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-ink-muted">Total</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-ink-muted">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-ink-muted">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order._id} className="border-b border-ink/4 last:border-0 hover:bg-ink/1.5">
                        <td className="px-4 py-3 font-medium text-ink">
                          {order.tableId?.label ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-ink-muted">
                          {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-4 py-3 font-medium text-ink">
                          ${order.totalAmount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge status={order.status} label={capitalize(order.status)} />
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            status={order.paymentStatus}
                            label={capitalize(order.paymentStatus)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
