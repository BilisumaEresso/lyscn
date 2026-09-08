import { Link } from 'react-router-dom';

/** 404 page for the dashboard */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-8 text-center">
      <p className="font-display font-bold text-7xl text-ink/8 mb-4 select-none">404</p>
      <h1 className="font-display font-bold text-2xl text-ink mb-2">Page not found</h1>
      <p className="text-ink-muted text-sm mb-7 max-w-xs">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="px-5 py-2.5 bg-teal text-white rounded-xl font-display font-semibold text-sm hover:bg-teal/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
