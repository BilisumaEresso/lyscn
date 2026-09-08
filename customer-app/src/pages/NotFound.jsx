import logo from '../assets/logo.png';

/** 404 / no-session page for the customer app */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-8 text-center">
      <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mb-6 shadow-lg overflow-hidden">
        <img src={logo} alt="LayoScan" className="w-16 h-16 object-cover" />
      </div>
      <h1 className="font-display font-bold text-2xl text-ink mb-2">Page not found</h1>
      <p className="text-ink-muted text-sm max-w-xs">
        Scan the QR code at your table to get started, or check the URL and try again.
      </p>
    </div>
  );
}
