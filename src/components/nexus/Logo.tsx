export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/src/components/capture_260924_211136.png"
        alt="Nexus"
        className="size-9 rounded-md object-cover"
      />
      {!compact && (
        <div className="leading-tight">
          <div className="text-[15px] font-bold tracking-tight">NEXUS</div>
          <div className="text-[10px] font-medium uppercase tracking-[0.2em] opacity-70">ERP</div>
        </div>
      )}
    </div>
  );
}
