import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useSessionStore } from './store/sessionStore';
import ErrorBoundary from './components/ErrorBoundary';
import { useCustomerNotifications } from './hooks/useCustomerNotifications';
import CustomerNotificationPill from './components/CustomerNotificationPill';

// ── Code-split pages (loaded on demand) ──────────────────────────────────────
const Resolve       = lazy(() => import('./pages/Resolve'));
const Menu          = lazy(() => import('./pages/Menu'));
const About         = lazy(() => import('./pages/About'));
const Checkout      = lazy(() => import('./pages/Checkout'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const Landing       = lazy(() => import('./pages/Landing'));
const NoSession     = lazy(() => import('./pages/NoSession'));
const NotFound      = lazy(() => import('./pages/NotFound'));

function CustomerNotificationCoordinator() {
  useCustomerNotifications();
  return <CustomerNotificationPill />;
}

// ── Skeleton fallbacks ────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="min-h-screen bg-paper max-w-[560px] mx-auto">
      {/* Cover skeleton */}
      <div className="h-52 bg-ink/6 animate-pulse" />
      {/* Chip row skeleton */}
      <div className="px-4 py-3 flex gap-2">
        {[80, 60, 70, 55].map((w, i) => (
          <div
            key={i}
            className="h-8 rounded-full bg-ink/6 animate-pulse shrink-0"
            style={{ width: `${w}px` }}
          />
        ))}
      </div>
      {/* Product grid skeleton */}
      <div className="px-4 py-2 grid grid-cols-2 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl overflow-hidden border border-ink/6 animate-pulse">
            <div className="aspect-[4/3] bg-ink/6" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-ink/6 rounded w-3/4" />
              <div className="h-4 bg-ink/6 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InlineSkeleton() {
  return (
    <div className="min-h-screen bg-paper max-w-[560px] mx-auto px-4 pt-16 space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-20 bg-ink/6 rounded-2xl animate-pulse" />
      ))}
    </div>
  );
}

// ── React Query client ────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

// ── Session guard ─────────────────────────────────────────────────────────────
function SessionRoute({ children }) {
  const table = useSessionStore((s) => s.table);
  return table ? children : (
    <Suspense fallback={null}>
      <NoSession />
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <CustomerNotificationCoordinator />
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              {/* Landing entry point */}
              <Route path="/" element={<Landing />} />

              {/* QR entry point */}
              <Route path="/t/:qrToken" element={<Resolve />} />

              {/* Session-guarded routes */}
              <Route
                path="/menu"
                element={<SessionRoute><Menu /></SessionRoute>}
              />
              <Route
                path="/about"
                element={<SessionRoute><About /></SessionRoute>}
              />
              <Route
                path="/checkout"
                element={<SessionRoute><Checkout /></SessionRoute>}
              />
              <Route
                path="/order/:orderId"
                element={
                  <SessionRoute>
                    <Suspense fallback={<InlineSkeleton />}>
                      <OrderTracking />
                    </Suspense>
                  </SessionRoute>
                }
              />
              <Route
                path="/orders"
                element={
                  <SessionRoute>
                    <Suspense fallback={<InlineSkeleton />}>
                      <OrderTracking />
                    </Suspense>
                  </SessionRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<Landing />} />
            </Routes>
          </Suspense>
        </BrowserRouter>

        <Toaster
          position="bottom-center"
          toastOptions={{
            duration: 2500,
            style: {
              fontFamily:   'Inter, sans-serif',
              fontSize:     '13px',
              borderRadius: '14px',
              boxShadow:    '0 8px 24px rgba(18,26,44,0.18)',
              maxWidth:     '320px',
            },
            success: { iconTheme: { primary: 'var(--color-primary, #14B8A6)', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
          }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
