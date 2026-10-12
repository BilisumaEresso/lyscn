import { useState } from 'react';
import { WifiOff, RefreshCw, AlertTriangle, CheckCircle2, ShoppingBag, X } from 'lucide-react';
import { useNetworkStore } from '../store/networkStore';
import { useOrderQueueStore } from '../lib/orderQueue';
import clsx from 'clsx';

export default function OfflineBanner() {
  const isOnline = useNetworkStore((s) => s.isOnline);
  const isChecking = useNetworkStore((s) => s.isChecking);
  const checkConnection = useNetworkStore((s) => s.checkConnection);

  const queue = useOrderQueueStore((s) => s.queue);
  const isFlushing = useOrderQueueStore((s) => s.isFlushing);
  const flushQueue = useOrderQueueStore((s) => s.flushQueue);
  const dismissConflict = useOrderQueueStore((s) => s.dismissConflict);
  const resolveConflictAndRestoreCart = useOrderQueueStore((s) => s.resolveConflictAndRestoreCart);

  const [isRetrying, setIsRetrying] = useState(false);

  const pendingOrders = queue.filter((q) => q.status === 'pending' || q.status === 'syncing');
  const pendingCount = pendingOrders.length;
  const conflictOrders = queue.filter((q) => q.status === 'conflict');

  const handleManualRetry = async () => {
    setIsRetrying(true);
    try {
      await checkConnection();
      await flushQueue();
    } finally {
      setIsRetrying(false);
    }
  };

  const isBusy = isChecking || isFlushing || isRetrying;

  return (
    <>
      {/* ── Offline & Queued Banner ────────────────────────────────────────── */}
      {(!isOnline || pendingCount > 0) && (
        <div
          role="status"
          aria-live="polite"
          className={clsx(
            'fixed top-0 inset-x-0 z-50 px-3 py-2 text-xs font-semibold shadow-md transition-colors flex items-center justify-between gap-2 max-w-[560px] mx-auto',
            !isOnline
              ? 'bg-amber-600 text-white'
              : 'bg-teal-700 text-white'
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {!isOnline ? (
              <WifiOff className="w-4 h-4 shrink-0 text-amber-200 animate-pulse" />
            ) : (
              <RefreshCw className={clsx('w-4 h-4 shrink-0', isBusy && 'animate-spin')} />
            )}
            <span className="truncate">
              {!isOnline
                ? pendingCount > 0
                  ? `Offline — ${pendingCount} ${pendingCount === 1 ? 'order' : 'orders'} queued`
                  : 'Offline — connecting to server...'
                : `Syncing ${pendingCount} queued ${pendingCount === 1 ? 'order' : 'orders'}...`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleManualRetry}
            disabled={isBusy}
            aria-label="Retry connection and send queued orders"
            className="shrink-0 bg-white/20 hover:bg-white/30 active:bg-white/40 text-white text-[11px] px-2.5 py-1 rounded-md transition-all flex items-center gap-1 font-medium disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={clsx('w-3 h-3', isBusy && 'animate-spin')} />
            <span>{isBusy ? 'Retrying…' : 'Retry'}</span>
          </button>
        </div>
      )}

      {/* ── Conflict Surface Banner / Alert ─────────────────────────────────── */}
      {/* "Conflict rule: queued order rejected because the item went unavailable → surface it, don't silently drop" */}
      {conflictOrders.length > 0 && (
        <div className="fixed top-12 inset-x-0 z-50 px-3 py-2 max-w-[560px] mx-auto space-y-2 pointer-events-auto">
          {conflictOrders.map((order) => {
            const conflict = order.conflict || {};
            const unavailableName = conflict.unavailableProductName || 'An ordered item';

            return (
              <div
                key={order.clientOrderId}
                className="bg-red-50 border-2 border-red-500 rounded-xl p-3 shadow-lg text-ink animate-in fade-in slide-in-from-top-2"
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-red-900 text-sm">
                      Order Conflict: Item Unavailable
                    </p>
                    <p className="text-xs text-red-800 mt-0.5">
                      {conflict.message || `"${unavailableName}" became unavailable while your connection was offline.`}
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => resolveConflictAndRestoreCart(order.clientOrderId)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Remove Item & Edit Cart</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => dismissConflict(order.clientOrderId)}
                        className="bg-white hover:bg-gray-100 text-ink/70 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-ink/20 transition-colors cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismissConflict(order.clientOrderId)}
                    className="text-ink/40 hover:text-ink/80 p-1"
                    aria-label="Close alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
