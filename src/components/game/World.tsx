import { Car, ShieldCheck, TrafficCone, CornerUpRight, Users } from "lucide-react";

type WorldProps = {
  moving: boolean;
  speed: number;
  passengers: string[];
};

const TRAFFIC = [
  { top: "34%", duration: 9, delay: 0, tint: "oklch(0.78 0.14 25)" },
  { top: "41%", duration: 12, delay: 2, tint: "oklch(0.82 0.12 95)" },
  { top: "62%", duration: 10, delay: 1, tint: "oklch(0.75 0.12 280)" },
  { top: "69%", duration: 14, delay: 3.5, tint: "oklch(0.8 0.12 160)" },
];

const BUILDINGS = [12, 20, 15, 26, 18, 30, 14, 22, 17, 28, 13, 24];

export function World({ moving, speed, passengers }: WorldProps) {
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-3xl border border-border"
      style={{ background: "var(--gradient-sky)" }}
      aria-label="Open world city view"
    >
      {/* sun + clouds */}
      <div className="absolute right-16 top-10 h-20 w-20 rounded-full bg-warn/80 blur-[2px]" />
      {[
        { left: "12%", top: "10%", w: 120, d: 42 },
        { left: "48%", top: "18%", w: 90, d: 60 },
        { left: "76%", top: "8%", w: 140, d: 52 },
      ].map((c, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-card/70 blur-[1px]"
          style={{ left: c.left, top: c.top, width: c.w, height: c.w / 3 }}
        />
      ))}

      {/* skyline */}
      <div className="absolute inset-x-0 top-[18%] flex items-end justify-between px-6">
        {BUILDINGS.map((h, i) => (
          <div
            key={i}
            className="w-[6%] rounded-t-xl bg-secondary/80 shadow-[var(--shadow-soft)]"
            style={{ height: `${h * 5}px` }}
          >
            <div className="mt-3 grid grid-cols-2 gap-1 px-2">
              {Array.from({ length: 6 }).map((_, w) => (
                <span key={w} className="h-1.5 rounded-[2px] bg-card/70" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* grass band */}
      <div className="absolute inset-x-0 bottom-0 h-[58%] bg-grass" />

      {/* road */}
      <div className="absolute inset-x-0 top-[30%] h-[46%] bg-road">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 road-dashes opacity-90" />
        <div className="absolute inset-x-0 top-2 h-1 bg-card/40" />
        <div className="absolute inset-x-0 bottom-2 h-1 bg-card/40" />
      </div>

      {/* ambient traffic */}
      {TRAFFIC.map((t, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: t.top,
            animation: `world-traffic ${t.duration}s linear ${t.delay}s infinite`,
          }}
        >
          <TinyCar tint={t.tint} />
        </div>
      ))}

      {/* player car */}
      <div className="absolute left-1/2 top-[50%] -translate-x-1/2 -translate-y-1/2">
        <div
          className="relative"
          style={{ animation: moving ? "world-bob 0.6s ease-in-out infinite" : undefined }}
        >
          <span className="absolute -inset-6 rounded-full bg-accent/25 animate-ring-ping" />
          <div className="relative flex h-24 w-40 items-center justify-center rounded-[1.6rem] bg-card shadow-[var(--shadow-phone)]">
            <div
              className="absolute inset-2 rounded-[1.2rem]"
              style={{ background: "var(--gradient-primary)" }}
            />
            <Car className="relative h-10 w-10 text-primary-foreground" />
            <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-card px-3 py-1 text-[11px] font-semibold shadow-[var(--shadow-soft)]">
              You
            </span>
          </div>
        </div>
      </div>

      {/* status chips */}
      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
        <Chip icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Collision shield on" />
        <Chip icon={<CornerUpRight className="h-3.5 w-3.5" />} label="Auto-turn" />
        <Chip icon={<TrafficCone className="h-3.5 w-3.5" />} label="Auto-stop" />
      </div>

      <div className="absolute bottom-4 left-4 flex items-center gap-3">
        <div className="glass-card rounded-2xl px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Speed</p>
          <p className="font-display text-2xl font-bold leading-none">
            {speed}
            <span className="ml-1 text-xs font-medium text-muted-foreground">km/h</span>
          </p>
        </div>
        <div className="glass-card flex items-center gap-2 rounded-2xl px-4 py-3">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">
            {passengers.length + 1}/4 riding
            {passengers.length > 0 && (
              <span className="ml-1 font-normal text-muted-foreground">
                · {passengers.join(", ")}
              </span>
            )}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes world-traffic { from { left: -18%; } to { left: 112%; } }
        @keyframes world-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      `}</style>
    </div>
  );
}

function TinyCar({ tint }: { tint: string }) {
  return (
    <div
      className="flex h-10 w-20 items-center justify-center rounded-2xl shadow-[var(--shadow-soft)]"
      style={{ backgroundColor: tint }}
    >
      <div className="h-4 w-10 rounded-md bg-card/70" />
    </div>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="glass-card inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold">
      <span className="text-accent-foreground">{icon}</span>
      {label}
    </span>
  );
}
