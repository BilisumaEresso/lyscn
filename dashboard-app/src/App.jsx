import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import ErrorBoundary from './components/ErrorBoundary';

// Layout
import AppShell from './components/layout/AppShell';

// ── Code-split pages ──────────────────────────────────────────────────────────
const Login    = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Menu     = lazy(() => import('./pages/Menu'));
const Tables   = lazy(() => import('./pages/Tables'));
const Orders   = lazy(() => import('./pages/Orders'));
const Staff    = lazy(() => import('./pages/Staff'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

// ── Skeleton fallbacks ────────────────────────────────────────────────────────
function KanbanSkeleton() {
  return (
    <div className="flex gap-4 px-6 py-4 overflow-x-hidden">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="w-72 shrink-0 rounded-2xl bg-ink/4 animate-pulse" style={{ height: 'calc(100vh - 140px)' }} />
      ))}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="px-6 py-6 space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-16 bg-ink/5 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

// ── React Query client ────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  },
});

// ── Auth guards ───────────────────────────────────────────────────────────────
function PrivateRoute() {
  const { accessToken } = useAuthStore();
  return accessToken ? <Outlet /> : <Navigate to="/login" replace />;
}

function PublicOnlyRoute() {
  const { accessToken } = useAuthStore();
  return accessToken ? <Navigate to="/" replace /> : <Outlet />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              {/* Public routes */}
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login"    element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Route>

              {/* Protected routes */}
              <Route element={<PrivateRoute />}>
                <Route element={<AppShell />}>
                  <Route path="/"         element={<Dashboard />} />
                  <Route path="/menu"     element={<Suspense fallback={<PageSkeleton />}><Menu /></Suspense>} />
                  <Route path="/tables"   element={<Suspense fallback={<PageSkeleton />}><Tables /></Suspense>} />
                  <Route path="/orders"   element={<Suspense fallback={<KanbanSkeleton />}><Orders /></Suspense>} />
                  <Route path="/staff"    element={<Suspense fallback={<PageSkeleton />}><Staff /></Suspense>} />
                  <Route path="/settings" element={<Suspense fallback={<PageSkeleton />}><Settings /></Suspense>} />
                </Route>
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>

        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3500,
            style: {
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              borderRadius: '10px',
              boxShadow: '0 4px 16px rgba(18,26,44,0.12)',
            },
            success: { iconTheme: { primary: '#14B8A6', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
          }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
