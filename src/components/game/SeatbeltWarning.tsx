import { ShieldAlert, Check, HeartPulse } from "lucide-react";

export function SeatbeltWarning({
  onBuckle,
  comfort,
  bumped,
}: {
  onBuckle: () => void;
  comfort: number;
  bumped: boolean;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center p-6">
      <div
        className="w-full max-w-xl animate-slide-up rounded-3xl border border-border bg-warn/95 p-5 shadow-[var(--shadow-phone)]"
        style={{ animation: bumped ? "bump-shake 0.4s ease-in-out" : undefined }}
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-card/70 animate-soft-pulse">
            <ShieldAlert className="h-6 w-6 text-warn-foreground" />
          </span>
          <div className="min-w-0 text-warn-foreground">
            <h2 className="truncate font-display text-lg font-bold">Buckle up for comfort</h2>
            <p className="text-sm opacity-80">
              The car keeps driving either way — but bumps will shake you around until you buckle.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <HeartPulse className="h-4 w-4" />
              <div className="h-2 w-40 overflow-hidden rounded-full bg-card/50">
                <div
                  className="h-full rounded-full bg-card transition-all duration-500"
                  style={{ width: `${comfort}%` }}
                />
              </div>
              <span className="text-xs font-semibold">{comfort}%</span>
            </div>
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
      <style>{`
        @keyframes bump-shake {
          0%,100% { transform: translateX(0) }
          25% { transform: translateX(-8px) rotate(-1deg) }
          75% { transform: translateX(8px) rotate(1deg) }
        }
      `}</style>
    </div>
  );
}
