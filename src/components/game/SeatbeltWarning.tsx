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
    <div className="pointer-events-none absolute inset-x-0 top-20 z-30 flex justify-center px-4">
      <div
        className="hud-panel pointer-events-auto w-full max-w-md animate-slide-up rounded-2xl p-3.5"
        style={{ animation: bumped ? "bump-shake 0.4s ease-in-out" : undefined }}
      >
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl animate-soft-pulse"
            style={{ background: "oklch(0.8 0.16 85 / 0.2)" }}
          >
            <ShieldAlert className="h-5 w-5" style={{ color: "oklch(0.86 0.16 85)" }} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h2 className="font-display text-sm font-bold tracking-tight">Buckle up</h2>
              <span className="hud-label">bumps hurt until you do</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <HeartPulse className="h-3.5 w-3.5" style={{ color: "oklch(0.8 0.14 20)" }} />
              <div
                className="h-1.5 flex-1 overflow-hidden rounded-full"
                style={{ background: "oklch(1 0 0 / 0.14)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${comfort}%`,
                    background:
                      comfort > 55
                        ? "oklch(0.82 0.15 160)"
                        : comfort > 25
                          ? "oklch(0.84 0.16 85)"
                          : "oklch(0.68 0.23 28)",
                  }}
                />
              </div>
              <span className="text-[11px] font-semibold tabular-nums">{comfort}%</span>
            </div>
          </div>

          <button
            onClick={onBuckle}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-transform duration-200 hover:scale-105 active:scale-95"
            style={{ background: "var(--gradient-primary)", color: "oklch(0.16 0.03 255)" }}
          >
            <Check className="h-3.5 w-3.5" />
            Buckle
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
