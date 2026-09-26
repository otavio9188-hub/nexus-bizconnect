export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex size-9 items-center justify-center">
        <div className="absolute inset-0 rounded-xl bg-emerald-400/10 blur-md" />
        <svg viewBox="0 0 48 48" className="relative size-9" aria-hidden="true">
          <defs>
            <linearGradient id="nexus-logo-gradient" x1="5" y1="40" x2="42" y2="7" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#9BE15D" />
              <stop offset="0.45" stopColor="#36D399" />
              <stop offset="1" stopColor="#18C8A3" />
            </linearGradient>
          </defs>
          <path
            d="M9 34.5 17.2 12c.7-1.9 3.2-2.3 4.5-.7l7.1 9 5.1-12.1c.8-1.9 3.5-2.1 4.5-.3l1.6 2.9-8.8 24.1c-.7 2-3.3 2.4-4.6.7l-7-9-5.5 12.5c-.8 1.9-3.5 2.1-4.5.4L9 34.5Z"
            fill="url(#nexus-logo-gradient)"
          />
          <path d="M12 35 20 13.8 28 25 35.5 8.5" fill="none" stroke="white" strokeOpacity=".28" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="text-[15px] font-extrabold tracking-[0.08em] text-white">NEXUS</div>
          <div className="text-[10px] font-medium uppercase tracking-[0.24em] text-emerald-300/75">ERP</div>
        </div>
      )}
    </div>
  );
}
