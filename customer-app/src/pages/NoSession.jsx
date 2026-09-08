import { useNavigate } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import logo from '../assets/logo.png';

/**
 * Shown when a user navigates to a protected route (/menu, /checkout, etc.)
 * without having resolved a QR code first.
 */
export default function NoSession() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center bg-paper">
      <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mb-6 shadow-lg overflow-hidden">
        <img src={logo} alt="LayoScan" className="w-16 h-16 object-cover" />
      </div>

      <div className="w-14 h-14 rounded-2xl bg-mint/50 flex items-center justify-center mb-4">
        <QrCode size={28} className="text-teal" strokeWidth={1.5} />
      </div>

      <h1 className="font-display font-bold text-2xl text-ink mb-3">
        Scan to get started
      </h1>
      <p className="text-ink-muted text-base max-w-xs leading-relaxed">
        Scan the QR code at your table to browse the menu and place your order.
      </p>
    </div>
  );
}
