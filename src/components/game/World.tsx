import { Car, Users, MapPin } from "lucide-react";
import type { DrivingState } from "@/hooks/useDriving";
import type { GameWorldState, Zone, NPC, TimeOfDay } from "@/hooks/useGameWorld";

type WorldProps = {
  driving: DrivingState;
  passengers: string[];
  moving: boolean;
  gameWorld: GameWorldState;
  zones: Zone[];
};

// Sky gradients per time of day
const SKY_GRADIENTS: Record<TimeOfDay, string> = {
  dawn: "linear-gradient(to bottom, oklch(0.7 0.15 35) 0%, oklch(0.82 0.1 80) 40%, oklch(0.9 0.05 90) 100%)",
  day: "linear-gradient(to bottom, oklch(0.55 0.18 240) 0%, oklch(0.75 0.12 200) 50%, oklch(0.88 0.06 190) 100%)",
  dusk: "linear-gradient(to bottom, oklch(0.45 0.2 25) 0%, oklch(0.6 0.18 350) 40%, oklch(0.78 0.12 60) 100%)",
  night: "linear-gradient(to bottom, oklch(0.15 0.05 250) 0%, oklch(0.22 0.08 260) 50%, oklch(0.3 0.06 250) 100%)",
};

const ROAD_COLORS: Record<TimeOfDay, string> = {
  dawn: "oklch(0.45 0.02 260)",
  day: "oklch(0.38 0.01 260)",
  dusk: "oklch(0.35 0.02 260)",
  night: "oklch(0.2 0.01 260)",
};

const GRASS_COLORS: Record<TimeOfDay, string> = {
  dawn: "oklch(0.55 0.12 140)",
  day: "oklch(0.6 0.15 140)",
  dusk: "oklch(0.45 0.1 140)",
  night: "oklch(0.28 0.06 140)",
};

const BUILDING_COLORS: Record<TimeOfDay, string> = {
  dawn: "oklch(0.65 0.03 260) / 0.85",
  day: "oklch(0.7 0.02 260) / 0.8",
  dusk: "oklch(0.5 0.03 260) / 0.85",
  night: "oklch(0.3 0.02 260) / 0.9",
};

// Clock helper
function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function World({ driving, passengers, moving, gameWorld, zones }: WorldProps) {
  const { speed, steering, position, heading } = driving;
  const {
    timeOfDay = "day",
    clockMinutes = 600,
    npcs = [],
    currentZone = null,
  } = gameWorld ?? ({} as Partial<GameWorldState>);

  // World offset: move the world opposite to car position
  const worldOffsetX = -position.x * 8;
  const worldOffsetY = -position.y * 8;
  const isReversing = speed < -1;
  const speedLines = Math.abs(speed) > 30;
  const isNight = timeOfDay === "night";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ background: SKY_GRADIENTS[timeOfDay] }}
      aria-label="Open world city view"
    >
      {/* Sun / Moon */}
      <div
        className="absolute rounded-full blur-[2px] transition-all duration-1000"
        style={{
          right: isNight ? "20%" : "10%",
          top: isNight ? "15%" : "8%",
          width: isNight ? "48px" : "80px",
          height: isNight ? "48px" : "80px",
          background: isNight ? "oklch(0.9 0.02 260)" : "oklch(0.85 0.15 60)",
          opacity: isNight ? 0.7 : 0.9,
        }}
      />

      {/* Stars at night */}
      {isNight && (
        <div className="pointer-events-none absolute inset-0 z-0">
          {Array.from({ length: 30 }).map((_, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-card"
              style={{
                width: "2px",
                height: "2px",
                top: `${(i * 37) % 50}%`,
                left: `${(i * 53) % 100}%`,
                opacity: 0.4 + ((i % 5) * 0.1),
              }}
            />
          ))}
        </div>
      )}

      {/* Clouds */}
      {[
        { left: "12%", top: "10%", w: 120 },
        { left: "48%", top: "18%", w: 90 },
        { left: "76%", top: "8%", w: 140 },
      ].map((c, i) => (
        <div
          key={i}
          className="absolute rounded-full blur-[1px]"
          style={{
            left: c.left,
            top: c.top,
            width: c.w,
            height: c.w / 3,
            background: isNight ? "oklch(0.25 0.03 260)" : "oklch(0.95 0.01 250 / 0.7)",
          }}
        />
      ))}

      {/* Scrolling world layer */}
      <div
        className="absolute inset-0"
        style={{ transform: `rotate(${-heading}deg) translate(${worldOffsetX}px, ${worldOffsetY}px)` }}
      >
        {/* Zones — landmarks in the world */}
        {zones.map((zone) => {
          const screenX = zone.x * 8;
          const screenY = zone.y * 8;
          return (
            <div
              key={zone.id}
              className="absolute flex flex-col items-center"
              style={{
                left: `calc(50% + ${screenX}px)`,
                top: `calc(50% + ${screenY}px)`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div
                className={`flex items-center justify-center rounded-2xl border-2 ${
                  currentZone?.id === zone.id
                    ? "border-primary bg-primary/20"
                    : "border-border/40 bg-card/30"
                }`}
                style={{ width: `${zone.radius * 2}px`, height: `${zone.radius * 2}px` }}
              >
                <span style={{ fontSize: `${Math.min(48, zone.radius * 0.4)}px` }}>
                  {zone.emoji}
                </span>
              </div>
              <span
                className={`mt-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  currentZone?.id === zone.id
                    ? "bg-primary text-primary-foreground"
                    : "glass-card"
                }`}
              >
                {zone.name}
              </span>
            </div>
          );
        })}

        {/* Skyline buildings — scattered */}
        {BUILDINGS_DATA.map((b, i) => (
          <div
            key={i}
            className="absolute rounded-t-xl"
            style={{
              left: `calc(50% + ${b.x * 8}px)`,
              top: `calc(50% + ${b.y * 8 - b.h * 3}px)`,
              width: "40px",
              height: `${b.h * 3}px`,
              background: `oklch(${isNight ? "0.25 0.02 260" : "0.7 0.02 260"} / ${isNight ? 0.9 : 0.8})`,
            }}
          >
            {isNight && (
              <div className="mt-2 grid grid-cols-2 gap-1 px-1">
                {Array.from({ length: Math.min(8, Math.floor(b.h / 2)) }).map((_, w) => (
                  <span
                    key={w}
                    className="h-1.5 rounded-[1px]"
                    style={{
                      background: Math.random() > 0.3 ? "oklch(0.9 0.12 60 / 0.8)" : "transparent",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Grass — left of road */}
        <div
          className="absolute"
          style={{
            inset: "0",
            background: GRASS_COLORS[timeOfDay],
            clipPath: "polygon(0 0, 36% 0, 36% 100%, 0 100%)",
          }}
        />
        {/* Grass — right of road */}
        <div
          className="absolute"
          style={{
            inset: "0",
            background: GRASS_COLORS[timeOfDay],
            clipPath: "polygon(64% 0, 100% 0, 100% 100%, 64% 100%)",
          }}
        />

        {/* Road — vertical, north-south */}
        <div
          className="absolute"
          style={{
            inset: "0",
            background: ROAD_COLORS[timeOfDay],
            clipPath: "polygon(36% 0, 64% 0, 64% 100%, 36% 100%)",
          }}
        >
          <div
            className="absolute inset-y-0 left-1/2 w-1.5 -translate-x-1/2 road-dashes opacity-80"
            style={{
              animationDuration: speed > 5 ? `${Math.max(0.3, 1.2 / (Math.abs(speed) / 30))}s` : "0s",
              animationPlayState: Math.abs(speed) > 1 ? "running" : "paused",
            }}
          />
        </div>

        {/* NPC cars */}
        {npcs.map((npc) => {
          const screenX = (npc.x - position.x) * 8;
          const screenY = (npc.y - position.y) * 8;
          // Only render if roughly on screen
          if (Math.abs(screenX) > 600 || Math.abs(screenY) > 400) return null;
          return (
            <div
              key={npc.id}
              className="absolute"
              style={{
                left: `calc(50% + ${screenX}px)`,
                top: `calc(50% + ${screenY}px)`,
                transform: `translate(-50%, -50%) rotate(${npc.heading}deg)`,
              }}
            >
              <div
                className="flex h-10 w-20 items-center justify-center rounded-2xl shadow-lg"
                style={{ backgroundColor: npc.color }}
              >
                <div className="h-3 w-8 rounded bg-card/60" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Speed lines effect when fast */}
      {speedLines && (
        <div className="pointer-events-none absolute inset-0 z-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-20 bg-card/30"
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

      {/* Player car — centered, always faces forward */}
      <div
        className="absolute left-1/2 top-[50%] z-20"
        style={{ transform: `translate(-50%, -50%)` }}
      >
        <div
          className="relative"
          style={{
            animation: moving ? "world-bob 0.6s ease-in-out infinite" : undefined,
          }}
        >
          <span className="absolute -inset-6 rounded-full bg-accent/25 animate-ring-ping" />
          {/* Headlights at night */}
          {isNight && Math.abs(speed) > 0 && (
            <div
              className="absolute -top-8 left-1/2 -translate-x-1/2"
              style={{
                width: "120px",
                height: "80px",
                background: "radial-gradient(ellipse at center, oklch(0.9 0.1 60 / 0.3), transparent 70%)",
                transform: "translateY(-30px)",
              }}
            />
          )}
          <div className="relative flex h-24 w-40 items-center justify-center rounded-[1.6rem] bg-card shadow-[var(--shadow-phone)]">
            <div
              className="absolute inset-2 rounded-[1.2rem]"
              style={{ background: "var(--gradient-primary)" }}
            />
            <Car
              className="relative h-10 w-10 text-primary-foreground"
              style={{ transform: isReversing ? "scaleX(-1)" : undefined }}
            />
            <div
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-card px-3 py-1 text-[11px] font-semibold shadow-[var(--shadow-soft)]"
              style={{ transform: `translateX(calc(-50% + ${steering * 8}px))` }}
            >
              You
            </div>
          </div>
          {/* Taillights at night */}
          {isNight && (
            <div className="absolute -bottom-1 left-3 h-2 w-3 rounded-full bg-destructive/80" />
          )}
          {isNight && (
            <div className="absolute -bottom-1 right-3 h-2 w-3 rounded-full bg-destructive/80" />
          )}
        </div>
      </div>

      {/* Top HUD: Clock + Time of day + Current zone */}
      <div className="absolute left-4 top-4 z-30 flex flex-wrap items-center gap-2">
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

      {/* Bottom HUD: Speed + Passengers */}
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

      {/* Controls hint */}
      <div className="absolute bottom-20 left-1/2 z-30 -translate-x-1/2 text-center">
        <p className="text-[10px] font-medium text-muted-foreground/60">
          WASD / Arrows to drive · Space = handbrake
        </p>
      </div>

      <style>{`
        @keyframes world-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes speed-line { from { top: 110%; } to { top: -10%; } }
      `}</style>
    </div>
  );
}

// Scattered buildings data
const BUILDINGS_DATA = [
  // Left side of road
  { x: -180, y: -200, h: 24 }, { x: -140, y: -100, h: 20 }, { x: -100, y: -250, h: 15 },
  { x: -60, y: -150, h: 26 }, { x: -80, y: 50, h: 18 }, { x: -120, y: 200, h: 30 },
  { x: -160, y: 100, h: 14 }, { x: -50, y: 300, h: 22 }, { x: -180, y: 0, h: 28 },
  // Right side of road
  { x: 60, y: -150, h: 16 }, { x: 80, y: 50, h: 24 },
  { x: 120, y: -200, h: 13 }, { x: 180, y: 100, h: 20 }, { x: 140, y: 250, h: 16 },
  { x: 50, y: 300, h: 25 }, { x: 100, y: -50, h: 18 },
];

function timeOfDayEmoji(t: TimeOfDay): string {
  return { dawn: "🌅", day: "☀️", dusk: "🌆", night: "🌙" }[t];
}
