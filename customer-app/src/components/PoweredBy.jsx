import logo from '../assets/logo.png';

export default function PoweredBy({ className = '' }) {
  return (
    <div className={`flex items-center justify-center py-6 ${className}`}>
      <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/90 border border-ink/10 shadow-sm backdrop-blur-sm hover:border-ink/20 transition-all">
        <img
          src={logo}
          alt="LayoScan Logo"
          className="w-5 h-5 rounded-md object-contain shrink-0"
          loading="lazy"
        />
        <span className="text-xs text-ink/75 font-medium tracking-tight">
          Powered by <strong className="font-bold text-ink font-display">LayoScan</strong>
        </span>
      </div>
    </div>
  );
}
