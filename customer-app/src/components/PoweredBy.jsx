import logo from '../assets/logo.png';

export default function PoweredBy({ className = '' }) {
  return (
    <div className={`flex items-center justify-center py-7 ${className}`}>
      <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/95 border border-ink/12 shadow-md backdrop-blur-sm hover:border-ink/25 hover:shadow-lg transition-all group">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl gradient-brand p-0.5 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
          <img
            src={logo}
            alt="LayoScan Logo"
            className="w-full h-full rounded-[10px] object-cover"
            loading="lazy"
          />
        </div>
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className="text-xs sm:text-sm text-ink/75 font-medium tracking-tight">
            Powered by
          </span>
          <span className="font-display font-extrabold text-sm sm:text-base text-ink tracking-tight group-hover:text-teal transition-colors">
            LayoScan
          </span>
        </div>
      </div>
    </div>
  );
}
