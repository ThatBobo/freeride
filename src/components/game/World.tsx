import { Car, ShieldCheck, TrafficCone, CornerUpRight, Users } from "lucide-react";
import type { DrivingState } from "@/hooks/useDriving";

type WorldProps = {
  driving: DrivingState;
  passengers: string[];
  moving: boolean;
};

const BUILDINGS = [12, 20, 15, 26, 18, 30, 14, 22, 17, 28, 13, 24];

export function World({ driving, passengers, moving }: WorldProps) {
  const { speed, steering, position } = driving;

  // World scroll: the world moves opposite to the car's position to simulate driving
  const worldOffsetX = -position.x * 8;  // scale world units to pixels
  const worldOffsetY = -position.y * 8;

  // Car rotation based on heading
  const carRotation = driving.heading;

  // Speed-based effects
  const speedLines = Math.abs(speed) > 30;
  const isReversing = speed < -1;

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-3xl border border-border"
      style={{ background: "var(--gradient-sky)" }}
      aria-label="Open world city view"
    >
      {/* Sun */}
      <div className="absolute right-16 top-10 h-20 w-20 rounded-full bg-warn/80 blur-[2px]" />

      {/* Clouds */}
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

      {/* Scrolling world layer */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${worldOffsetX}px, ${worldOffsetY}px)`,
          transition: "none",
        }}
      >
        {/* Skyline — tiled for infinite scroll */}
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

        {/* Grass band */}
        <div className="absolute inset-x-0 bottom-0 h-[58%] bg-grass" />

        {/* Road */}
        <div className="absolute inset-x-0 top-[30%] h-[46%] bg-road">
          <div
            className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 road-dashes opacity-90"
            style={{ animationDuration: speed > 5 ? `${Math.max(0.3, 1.2 / (speed / 30))}s` : "0s" }}
          />
          <div className="absolute inset-x-0 top-2 h-1 bg-card/40" />
          <div className="absolute inset-x-0 bottom-2 h-1 bg-card/40" />
        </div>
      </div>

      {/* Speed lines effect when fast */}
      {speedLines && (
        <div className="pointer-events-none absolute inset-0 z-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-0.5 w-20 bg-card/30"
              style={{
                top: `${20 + i * 12}%`,
                left: "-5%",
                animation: `speed-line ${0.3 + (i % 3) * 0.1}s linear infinite`,
                animationDelay: `${i * 0.05}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Player car — centered, rotates with heading */}
      <div
        className="absolute left-1/2 top-[50%] z-20"
        style={{ transform: `translate(-50%, -50%) rotate(${carRotation}deg)` }}
      >
        <div
          className="relative"
          style={{
            animation: moving && Math.abs(speed) > 1 ? "world-bob 0.6s ease-in-out infinite" : undefined,
          }}
        >
          <span className="absolute -inset-6 rounded-full bg-accent/25 animate-ring-ping" />
          {/* Car body */}
          <div className="relative flex h-24 w-40 items-center justify-center rounded-[1.6rem] bg-card shadow-[var(--shadow-phone)]">
            <div
              className="absolute inset-2 rounded-[1.2rem]"
              style={{ background: "var(--gradient-primary)" }}
            />
            <Car
              className="relative h-10 w-10 text-primary-foreground"
              style={{ transform: isReversing ? "scaleX(-1)" : undefined }}
            />
            {/* Steering indicator — subtle tilt */}
            <div
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-card px-3 py-1 text-[11px] font-semibold shadow-[var(--shadow-soft)]"
              style={{ transform: `translateX(calc(-50% + ${steering * 8}px))` }}
            >
              You
            </div>
          </div>
        </div>
      </div>

      {/* Status chips */}
      <div className="absolute left-4 top-4 z-30 flex flex-wrap gap-2">
        <Chip icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Collision shield on" />
        <Chip icon={<CornerUpRight className="h-3.5 w-3.5" />} label="Auto-turn" />
        <Chip icon={<TrafficCone className="h-3.5 w-3.5" />} label="Auto-stop" />
      </div>

      {/* HUD */}
      <div className="absolute bottom-4 left-4 z-30 flex items-center gap-3">
        <div className="glass-card rounded-2xl px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Speed</p>
          <p className="font-display text-2xl font-bold leading-none">
            {Math.abs(Math.round(speed))}
            <span className="ml-1 text-xs font-medium text-muted-foreground">
              km/h{isReversing ? " (R)" : ""}
            </span>
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

      {/* Steering indicator bar */}
      <div className="absolute bottom-4 right-4 z-30 glass-card rounded-2xl px-4 py-3">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Steering</p>
        <div className="mt-1 h-2 w-24 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-100"
            style={{
              width: `${Math.abs(steering) * 50}%`,
              marginLeft: steering < 0 ? `${50 - Math.abs(steering) * 50}%` : "50%",
            }}
          />
        </div>
      </div>

      {/* Touch controls hint */}
      <div className="absolute bottom-20 left-1/2 z-30 -translate-x-1/2 text-center">
        <p className="text-[10px] font-medium text-muted-foreground/60">
          WASD / Arrows to drive · Space = handbrake
        </p>
      </div>

      <style>{`
        @keyframes world-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes speed-line { from { left: -5%; } to { left: 110%; } }
      `}</style>
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
