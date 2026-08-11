import { Car, Users, MapPin } from "lucide-react";
import type { DrivingState } from "@/hooks/useDriving";
import type { GameWorldState, Zone, TimeOfDay } from "@/hooks/useGameWorld";

type WorldProps = {
  driving: DrivingState;
  passengers: string[];
  moving: boolean;
  gameWorld: GameWorldState;
  zones: Zone[];
};

const ROAD_COLORS: Record<TimeOfDay, string> = {
  dawn: "oklch(0.45 0.02 260)",
  day: "oklch(0.38 0.01 260)",
  dusk: "oklch(0.35 0.02 260)",
  night: "oklch(0.2 0.01 260)",
};

const GRASS_COLORS: Record<TimeOfDay, string> = {
  dawn: "oklch(0.62 0.09 140)",
  day: "oklch(0.68 0.11 145)",
  dusk: "oklch(0.5 0.08 145)",
  night: "oklch(0.3 0.05 150)",
};

const NIGHT_TINT: Record<TimeOfDay, string> = {
  dawn: "oklch(0.7 0.12 40 / 0.12)",
  day: "transparent",
  dusk: "oklch(0.45 0.14 20 / 0.18)",
  night: "oklch(0.15 0.06 265 / 0.35)",
};

function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function World({ driving, passengers, gameWorld, zones }: WorldProps) {
  const { speed, position, heading } = driving;
  const {
    timeOfDay = "day",
    clockMinutes = 600,
    npcs = [],
    currentZone = null,
  } = gameWorld ?? ({} as Partial<GameWorldState>);

  const worldOffsetX = -position.x * 8;
  const worldOffsetY = -position.y * 8;
  const isReversing = speed < -1;
  const speedLines = Math.abs(speed) > 30;
  const isNight = timeOfDay === "night";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: GRASS_COLORS[timeOfDay] }}
      aria-label="Open world city view"
    >
      {/* Scrolling world layer */}
      <div
        className="absolute inset-0"
        style={{ transform: `translate(${worldOffsetX}px, ${worldOffsetY}px)` }}
      >
        {/* Road — vertical strip through the map */}
        <div
          className="absolute inset-y-[-200%] left-1/2 w-[280px] -translate-x-1/2"
          style={{ background: ROAD_COLORS[timeOfDay] }}
        >
          <div className="absolute inset-y-0 left-3 w-1 bg-road-line/50" />
          <div className="absolute inset-y-0 right-3 w-1 bg-road-line/50" />
          <div
            className="absolute inset-y-0 left-1/2 w-1.5 -translate-x-1/2 road-dashes opacity-80"
            style={{
              animationDuration: `${Math.max(0.25, 1.2 / Math.max(0.4, Math.abs(speed) / 30))}s`,
              animationPlayState: Math.abs(speed) > 1 ? "running" : "paused",
            }}
          />
        </div>

        {/* Buildings — flat top-down blocks off the road */}
        {BUILDINGS_DATA.map((b, i) => (
          <div
            key={i}
            className="absolute rounded-md"
            style={{
              left: `calc(50% + ${b.x}px)`,
              top: `calc(50% + ${b.y}px)`,
              width: `${28 + (b.h % 5) * 8}px`,
              height: `${28 + (b.h % 7) * 8}px`,
              transform: "translate(-50%, -50%)",
              background: isNight ? "oklch(0.3 0.02 260)" : "oklch(0.78 0.02 250)",
              boxShadow: "0 6px 14px -6px oklch(0.2 0.05 260 / 0.5)",
              border: "1px solid oklch(0.55 0.02 260 / 0.3)",
            }}
          >
            {isNight && (
              <div className="grid h-full w-full grid-cols-2 content-center gap-1 p-1.5">
                {Array.from({ length: 4 }).map((_, w) => (
                  <span
                    key={w}
                    className="h-1.5 rounded-[1px]"
                    style={{
                      background: (i + w) % 3 ? "oklch(0.9 0.12 60 / 0.75)" : "transparent",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Zones — landmarks */}
        {zones.map((zone) => {
          const active = currentZone?.id === zone.id;
          return (
            <div
              key={zone.id}
              className="absolute flex flex-col items-center"
              style={{
                left: `calc(50% + ${zone.x * 8}px)`,
                top: `calc(50% + ${zone.y * 8}px)`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div
                className={`flex items-center justify-center rounded-full border-2 ${
                  active ? "border-primary bg-primary/20" : "border-border/50 bg-card/25"
                }`}
                style={{ width: `${zone.radius * 2}px`, height: `${zone.radius * 2}px` }}
              >
                <span style={{ fontSize: `${Math.min(40, zone.radius * 0.5)}px` }}>
                  {zone.emoji}
                </span>
              </div>
              <span
                className={`mt-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  active ? "bg-primary text-primary-foreground" : "glass-card"
                }`}
              >
                {zone.name}
              </span>
            </div>
          );
        })}

        {/* NPC cars */}
        {npcs.map((npc) => {
          const screenX = npc.x * 8;
          const screenY = npc.y * 8;
          return (
            <div
              key={npc.id}
              className="absolute"
              style={{
                left: `calc(50% + ${screenX}px)`,
                top: `calc(50% + ${screenY}px)`,
                transform: `translate(-50%, -50%) rotate(${npc.heading - 90}deg)`,
              }}
            >
              <div
                className="flex h-14 w-8 items-center justify-center rounded-lg shadow-md"
                style={{ backgroundColor: npc.color }}
              >
                <div className="h-4 w-5 rounded-sm bg-card/60" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Time-of-day tint */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{ background: NIGHT_TINT[timeOfDay] }}
      />

      {/* Speed lines */}
      {speedLines && (
        <div className="pointer-events-none absolute inset-0 z-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-20 w-0.5 bg-card/30"
              style={{
                left: `${20 + i * 12}%`,
                top: "110%",
                animation: `speed-line ${0.3 + (i % 3) * 0.1}s linear infinite`,
                animationDelay: `${i * 0.05}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Player car */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
        <div style={{ transform: `rotate(${heading - 90}deg)` }}>
          {isNight && (
            <div
              className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full"
              style={{
                width: "140px",
                height: "110px",
                background:
                  "radial-gradient(ellipse at bottom, oklch(0.9 0.12 70 / 0.35), transparent 70%)",
              }}
            />
          )}
          <div className="relative flex h-16 w-10 items-center justify-center rounded-xl bg-card shadow-[var(--shadow-soft)]">
            <div
              className="absolute inset-1 rounded-lg"
              style={{ background: "var(--gradient-primary)" }}
            />
            <Car
              className="relative h-5 w-5 text-primary-foreground"
              style={{ transform: isReversing ? "scaleX(-1)" : undefined }}
            />
            {isNight && (
              <>
                <span className="absolute bottom-0.5 left-1 h-1.5 w-2 rounded-full bg-destructive/80" />
                <span className="absolute bottom-0.5 right-1 h-1.5 w-2 rounded-full bg-destructive/80" />
              </>
            )}
          </div>
        </div>
        <span className="mt-1 block rounded-full bg-card px-2 py-0.5 text-center text-[10px] font-semibold shadow-[var(--shadow-soft)]">
          You
        </span>
      </div>

      {/* Top HUD */}
      <div className="pointer-events-none absolute left-1/2 top-4 z-30 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2">
        <div className="glass-card flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold">
          <span className="text-sm">{timeOfDayEmoji(timeOfDay)}</span>
          <span>{formatClock(clockMinutes)}</span>
        </div>
        {currentZone && (
          <div className="glass-card flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            {currentZone.name}
          </div>
        )}
      </div>

      {/* Bottom HUD */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-30 flex items-center gap-3">
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

      <style>{`
        @keyframes speed-line { from { top: 110%; } to { top: -10%; } }
      `}</style>
    </div>
  );
}

// Scattered buildings, kept clear of the road corridor
const BUILDINGS_DATA = [
  { x: -180, y: -200, h: 24 }, { x: -140, y: -100, h: 20 }, { x: -100, y: -250, h: 15 },
  { x: -60, y: -150, h: 26 }, { x: -80, y: 50, h: 18 }, { x: -120, y: 200, h: 30 },
  { x: -160, y: 100, h: 14 }, { x: -50, y: 300, h: 22 }, { x: -180, y: 0, h: 28 },
  { x: 60, y: -150, h: 16 }, { x: 80, y: 50, h: 24 },
  { x: 120, y: -200, h: 13 }, { x: 180, y: 100, h: 20 }, { x: 140, y: 250, h: 16 },
  { x: 50, y: 300, h: 25 }, { x: 100, y: -50, h: 18 },
];

function timeOfDayEmoji(t: TimeOfDay): string {
  return { dawn: "🌅", day: "☀️", dusk: "🌆", night: "🌙" }[t];
}
