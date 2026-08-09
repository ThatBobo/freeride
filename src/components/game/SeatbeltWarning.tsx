import { ShieldAlert, Check } from "lucide-react";

export function SeatbeltWarning({ onBuckle }: { onBuckle: () => void }) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center p-6">
      <div className="w-full max-w-xl animate-slide-up rounded-3xl border border-border bg-warn/95 p-5 shadow-[var(--shadow-phone)]">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-card/70 animate-soft-pulse">
            <ShieldAlert className="h-6 w-6 text-warn-foreground" />
          </span>
          <div className="min-w-0 text-warn-foreground">
            <h2 className="truncate font-display text-lg font-bold">Buckle up to drive</h2>
            <p className="text-sm opacity-80">
              The car stays parked until your seatbelt is on. Safety first!
            </p>
          </div>
          <button
            onClick={onBuckle}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)] transition-transform duration-200 hover:scale-105"
          >
            <Check className="h-4 w-4" />
            Buckle up
          </button>
        </div>
      </div>
    </div>
  );
}
