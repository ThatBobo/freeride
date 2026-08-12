import { useMemo } from "react";
import type { DrivingState } from "@/hooks/useDriving";
import type { GameWorldState, Zone, TimeOfDay } from "@/hooks/useGameWorld";

type WorldProps = {
  driving: DrivingState;
  passengers: string[];
  moving: boolean;
  gameWorld: GameWorldState;
  zones: Zone[];
};

/* ---------------- world constants ---------------- */

const S = 6; // px per world unit on the ground plane
const CELL = 260; // world units between roads
const ROAD_W = 46; // world units road width
const PLANE = 10000; // ground plane size in px
const TILT = 74; // camera pitch

/* ---------------- palettes ---------------- */

const SKY: Record<TimeOfDay, string> = {
  dawn: "linear-gradient(to bottom, oklch(0.42 0.11 285) 0%, oklch(0.66 0.14 40) 55%, oklch(0.82 0.11 65) 100%)",
  day: "linear-gradient(to bottom, oklch(0.55 0.14 245) 0%, oklch(0.74 0.09 230) 60%, oklch(0.88 0.05 215) 100%)",
  dusk: "linear-gradient(to bottom, oklch(0.3 0.12 285) 0%, oklch(0.52 0.17 15) 55%, oklch(0.7 0.14 55) 100%)",
  night:
    "linear-gradient(to bottom, oklch(0.13 0.05 265) 0%, oklch(0.19 0.06 262) 60%, oklch(0.28 0.06 255) 100%)",
};

const GRASS: Record<TimeOfDay, string> = {
  dawn: "oklch(0.44 0.07 148)",
  day: "oklch(0.56 0.09 148)",
  dusk: "oklch(0.38 0.06 152)",
  night: "oklch(0.22 0.035 155)",
};

const ASPHALT: Record<TimeOfDay, string> = {
  dawn: "oklch(0.33 0.012 265)",
  day: "oklch(0.4 0.008 265)",
  dusk: "oklch(0.29 0.012 265)",
  night: "oklch(0.17 0.008 265)",
};

const HAZE: Record<TimeOfDay, string> = {
  dawn: "oklch(0.72 0.09 45)",
  day: "oklch(0.85 0.05 215)",
  dusk: "oklch(0.55 0.14 20)",
  night: "oklch(0.2 0.05 260)",
};

const FACADE: Record<TimeOfDay, [string, string]> = {
  dawn: ["oklch(0.55 0.03 40)", "oklch(0.42 0.03 275)"],
  day: ["oklch(0.76 0.02 250)", "oklch(0.62 0.02 255)"],
  dusk: ["oklch(0.46 0.05 30)", "oklch(0.34 0.04 280)"],
  night: ["oklch(0.24 0.02 262)", "oklch(0.17 0.02 265)"],
};

/* ---------------- helpers ---------------- */

function rand(a: number, b: number) {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function formatClock(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeLabel(t: TimeOfDay) {
  return { dawn: "Dawn", day: "Midday", dusk: "Dusk", night: "Night" }[t];
}

type Building = { x: number; y: number; w: number; d: number; h: number; tone: number; lit: number };

function buildingsAround(cx: number, cy: number, tod: TimeOfDay): Building[] {
  const out: Building[] = [];
  const ci = Math.round(cx / CELL);
  const cj = Math.round(cy / CELL);
  for (let i = ci - 1; i <= ci + 1; i++) {
    for (let j = cj - 1; j <= cj + 1; j++) {
      const bx = i * CELL;
      const by = j * CELL;
      const count = 3 + Math.floor(rand(i, j) * 3);
      for (let k = 0; k < count; k++) {
        const r1 = rand(i * 31 + k, j * 17);
        const r2 = rand(i * 13, j * 47 + k);
        const r3 = rand(i + k * 7, j - k * 3);
        const inset = ROAD_W / 2 + 26;
        const span = CELL / 2 - inset - 20;
        const ox = inset + r1 * span;
        const oy = inset + r2 * span;
        const sx = k % 2 === 0 ? 1 : -1;
        const sy = k < 2 ? 1 : -1;
        const dist = Math.hypot(bx + ox * sx - cx, by + oy * sy - cy);
        const downtown = Math.max(0, 1 - Math.hypot(bx, by) / 900);
        out.push({
          x: bx + ox * sx,
          y: by + oy * sy,
          w: 26 + r3 * 30,
          d: 26 + r1 * 26,
          h: (18 + r2 * 46) * (0.55 + downtown * 1.5),
          tone: r3,
          lit: rand(i * 3 + k, j * 5),
        });
        if (dist > 900) out.pop();
      }
    }
  }
  return out.sort((a, b) => a.y - b.y);
}

/* ---------------- component ---------------- */

export function World({ driving, passengers, gameWorld, zones }: WorldProps) {
  const { speed, steering, position, heading } = driving;
  const {
    timeOfDay = "day",
    clockMinutes = 600,
    npcs = [],
    currentZone = null,
  } = gameWorld ?? ({} as Partial<GameWorldState>);

  const isNight = timeOfDay === "night";
  const reversing = speed < -0.5;
  const px = position.x;
  const py = position.y;

  const buildings = useMemo(
    () => buildingsAround(Math.round(px / 40) * 40, Math.round(py / 40) * 40, timeOfDay),
    [Math.round(px / 40), Math.round(py / 40), timeOfDay],
  );

  // Visible road indices around the player
  const roadIdx = useMemo(() => {
    const ci = Math.round(px / CELL);
    const cj = Math.round(py / CELL);
    const v: number[] = [];
    const h: number[] = [];
    for (let i = ci - 2; i <= ci + 2; i++) v.push(i);
    for (let j = cj - 2; j <= cj + 2; j++) h.push(j);
    return { v, h };
  }, [Math.round(px / CELL), Math.round(py / CELL)]);

  const fov = 520 - Math.min(120, Math.abs(speed) * 0.7); // speed pulls the camera in
  const [faceA, faceB] = FACADE[timeOfDay];

  return (
    <div className="relative h-full w-full overflow-hidden select-none" aria-label="Freeride city — driver view">
      {/* ---------- SKY ---------- */}
      <div className="absolute inset-0" style={{ background: SKY[timeOfDay] }} />

      {isNight && (
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: 30 }).map((_, i) => (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                width: i % 7 === 0 ? 2.5 : 1.5,
                height: i % 7 === 0 ? 2.5 : 1.5,
                left: `${(i * 61) % 100}%`,
                top: `${(i * 29) % 42}%`,
                background: "oklch(0.98 0.02 250)",
                opacity: 0.25 + ((i % 6) * 0.12),
              }}
            />
          ))}
        </div>
      )}

      {/* sun / moon */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          left: "62%",
          top: isNight ? "10%" : "16%",
          width: isNight ? 54 : 90,
          height: isNight ? 54 : 90,
          transform: "translate(-50%,-50%)",
          background: isNight
            ? "radial-gradient(circle at 38% 38%, oklch(0.97 0.02 250), oklch(0.82 0.03 255))"
            : "radial-gradient(circle, oklch(0.97 0.13 85), oklch(0.86 0.16 65))",
          boxShadow: isNight
            ? "0 0 60px 18px oklch(0.9 0.03 255 / 0.28)"
            : "0 0 120px 40px oklch(0.9 0.14 75 / 0.35)",
        }}
      />

      {/* distant skyline silhouette sitting on the horizon */}
      <div className="pointer-events-none absolute inset-x-0" style={{ top: "34%", height: "18%" }}>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-[3px] opacity-60">
          {Array.from({ length: 28 }).map((_, i) => {
            const h = 12 + rand(i, 3) * 78;
            return (
              <span
                key={i}
                style={{
                  width: 10 + rand(i, 9) * 22,
                  height: h,
                  background: isNight ? "oklch(0.16 0.03 262)" : "oklch(0.45 0.03 250 / 0.55)",
                  borderTopLeftRadius: 2,
                  borderTopRightRadius: 2,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* ---------- 3D SCENE ---------- */}
      <div
        className="absolute inset-0"
        style={{
          perspective: `${fov}px`,
          perspectiveOrigin: "50% 34%",
        }}
      >
        <div
          className="absolute"
          style={{
            left: "50%",
            top: "84%",
            width: 0,
            height: 0,
            transformStyle: "preserve-3d",
            willChange: "transform",
            transform: `rotateX(${TILT}deg) rotateZ(${-heading}deg) translate(${-px * S}px, ${-py * S}px)`,
          }}
        >
          {/* ground */}
          <div
            className="absolute"
            style={{
              left: -PLANE / 2 + px * S,
              top: -PLANE / 2 + py * S,
              width: PLANE,
              height: PLANE,
              background: GRASS[timeOfDay],
              backgroundImage: `radial-gradient(circle at 30% 30%, oklch(1 0 0 / 0.05) 0 2px, transparent 3px)`,
              backgroundSize: "48px 48px",
            }}
          />

          {/* vertical roads */}
          {roadIdx.v.map((i) => (
            <div
              key={`v${i}`}
              className="absolute"
              style={{
                left: i * CELL * S - (ROAD_W * S) / 2,
                top: -PLANE / 2 + py * S,
                width: ROAD_W * S,
                height: PLANE,
                background: ASPHALT[timeOfDay],
                boxShadow: "inset 0 0 0 3px oklch(0.9 0.02 250 / 0.25)",
              }}
            >
              <div
                className="road-dashes absolute inset-y-0 left-1/2 w-[7px] -translate-x-1/2 opacity-80"
                style={{ animationPlayState: "paused" }}
              />
            </div>
          ))}

          {/* horizontal roads */}
          {roadIdx.h.map((j) => (
            <div
              key={`h${j}`}
              className="absolute"
              style={{
                left: -PLANE / 2 + px * S,
                top: j * CELL * S - (ROAD_W * S) / 2,
                width: PLANE,
                height: ROAD_W * S,
                background: ASPHALT[timeOfDay],
                boxShadow: "inset 0 0 0 3px oklch(0.9 0.02 250 / 0.25)",
              }}
            >
              <div
                className="absolute inset-x-0 top-1/2 h-[7px] -translate-y-1/2 opacity-80"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, var(--road-line) 0 26px, transparent 26px 80px)",
                }}
              />
            </div>
          ))}

          {/* zone ground markers */}
          {zones.map((z) => {
            if (Math.hypot(z.x - px, z.y - py) > 700) return null;
            const active = currentZone?.id === z.id;
            return (
              <div key={z.id} style={{ transformStyle: "preserve-3d" }}>
                <div
                  className="absolute rounded-full"
                  style={{
                    left: z.x * S,
                    top: z.y * S,
                    width: z.radius * 2 * S,
                    height: z.radius * 2 * S,
                    transform: "translate(-50%,-50%)",
                    background: active
                      ? "radial-gradient(circle, oklch(0.72 0.16 235 / 0.4), oklch(0.72 0.16 235 / 0.05) 70%, transparent)"
                      : "radial-gradient(circle, oklch(0.85 0.12 165 / 0.22), transparent 72%)",
                    border: `3px solid ${active ? "oklch(0.75 0.16 235 / 0.8)" : "oklch(0.85 0.12 165 / 0.45)"}`,
                  }}
                />
                {/* upright marker */}
                <div
                  className="absolute flex flex-col items-center"
                  style={{
                    left: z.x * S,
                    top: z.y * S,
                    transform: "translateX(-50%) rotateX(-90deg)",
                    transformOrigin: "50% 100%",
                  }}
                >
                  <div className="hud-panel flex items-center gap-1.5 rounded-full px-3 py-1 whitespace-nowrap text-[12px] font-semibold">
                    <span>{z.emoji}</span>
                    {z.name}
                  </div>
                  <span
                    className="w-[2px]"
                    style={{
                      height: 34,
                      background: "linear-gradient(to bottom, oklch(0.85 0.12 165 / 0.9), transparent)",
                    }}
                  />
                </div>
              </div>
            );
          })}

          {/* buildings */}
          {buildings.map((b, i) => (
            <div key={i} style={{ transformStyle: "preserve-3d" }}>
              {/* footprint shadow on the ground */}
              <div
                className="absolute rounded-[3px]"
                style={{
                  left: b.x * S,
                  top: b.y * S,
                  width: b.w * S,
                  height: b.d * S,
                  transform: "translate(-50%,-50%)",
                  background: "oklch(0.1 0.02 260 / 0.35)",
                  filter: "blur(4px)",
                }}
              />
              {/* facade */}
              <div
                className="absolute overflow-hidden"
                style={{
                  left: b.x * S,
                  top: b.y * S + (b.d * S) / 2,
                  width: b.w * S,
                  height: b.h * S,
                  transform: "translateX(-50%) rotateX(-90deg)",
                  transformOrigin: "50% 100%",
                  background: `linear-gradient(to bottom, ${b.tone > 0.5 ? faceA : faceB}, ${faceB})`,
                  borderTop: `2px solid ${isNight ? "oklch(0.35 0.02 262)" : "oklch(0.88 0.02 250 / 0.7)"}`,
                  boxShadow: "0 0 0 1px oklch(0.1 0.02 260 / 0.35)",
                }}
              >
                <div
                  className="h-full w-full"
                  style={{
                    backgroundImage: isNight
                      ? `repeating-linear-gradient(0deg, transparent 0 5px, ${b.lit > 0.42 ? "oklch(0.9 0.13 78 / 0.85)" : "oklch(0.12 0.02 262 / 0.8)"} 5px 12px, transparent 12px 17px), repeating-linear-gradient(90deg, transparent 0 5px, ${b.lit > 0.42 ? "oklch(0.9 0.13 78 / 0.85)" : "oklch(0.12 0.02 262 / 0.8)"} 5px 12px, transparent 12px 17px)`
                      : `repeating-linear-gradient(0deg, transparent 0 5px, oklch(0.62 0.05 235 / 0.6) 5px 12px, transparent 12px 17px), repeating-linear-gradient(90deg, transparent 0 5px, oklch(0.62 0.05 235 / 0.6) 5px 12px, transparent 12px 17px)`,
                    backgroundSize: "17px 17px",
                    padding: "5px",
                  }}
                />
              </div>
            </div>
          ))}

          {/* NPC traffic */}
          {npcs.map((n) => {
            if (Math.hypot(n.x - px, n.y - py) > 380) return null;
            return (
              <div key={n.id} style={{ transformStyle: "preserve-3d" }}>
                <div
                  className="absolute rounded-full"
                  style={{
                    left: n.x * S,
                    top: n.y * S,
                    width: 60,
                    height: 30,
                    transform: "translate(-50%,-50%)",
                    background: "oklch(0.1 0.02 260 / 0.4)",
                    filter: "blur(5px)",
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    left: n.x * S,
                    top: n.y * S + 12,
                    transform: `translateX(-50%) rotateX(-90deg) rotateY(${((n.heading - heading + 540) % 360) - 180}deg)`,
                    transformOrigin: "50% 100%",
                  }}
                >
                  <CarSprite color={n.color} night={isNight} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---------- ATMOSPHERE ---------- */}
      {/* distance haze */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[62%]"
        style={{
          background: `linear-gradient(to bottom, transparent 40%, ${HAZE[timeOfDay]} 100%)`,
          opacity: 0.55,
          maskImage: "linear-gradient(to bottom, transparent 40%, black 92%, transparent)",
        }}
      />
      {/* headlight cone at night */}
      {isNight && (
        <div
          className="pointer-events-none absolute left-1/2 bottom-[8%] -translate-x-1/2"
          style={{
            width: 620,
            height: 460,
            background:
              "radial-gradient(ellipse at 50% 100%, oklch(0.95 0.1 80 / 0.22), oklch(0.9 0.1 80 / 0.07) 45%, transparent 72%)",
            filter: "blur(6px)",
          }}
        />
      )}
      {/* vignette + windshield tint */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, transparent 45%, oklch(0.1 0.03 260 / 0.45) 100%)",
        }}
      />
      {/* speed streaks */}
      {Math.abs(speed) > 55 && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${6 + i * 9.4}%`,
                width: 2,
                height: 90,
                background: "linear-gradient(to bottom, transparent, oklch(1 0 0 / 0.35), transparent)",
                animation: `streak ${0.28 + (i % 4) * 0.06}s linear infinite`,
                animationDelay: `${i * 0.04}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* ---------- PLAYER CAR (screen space) ---------- */}
      <div
        className="pointer-events-none absolute left-1/2 z-20"
        style={{
          bottom: "9%",
          transform: `translateX(-50%) translateX(${steering * -14}px) rotate(${steering * -2.2}deg)`,
          transition: "transform 90ms linear",
        }}
      >
        <div
          className="absolute left-1/2 top-full h-6 w-[210px] -translate-x-1/2 -translate-y-2 rounded-full"
          style={{ background: "oklch(0.1 0.03 260 / 0.5)", filter: "blur(9px)" }}
        />
        <PlayerCar night={isNight} braking={driving.brake || reversing} boost={driving.gas && speed > 3} />
      </div>

      {/* ---------- HUD ---------- */}
      {/* top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between p-4">
        <div className="hud-panel flex items-center gap-3 rounded-2xl px-4 py-2.5">
          <div className="flex flex-col">
            <span className="hud-label">Location</span>
            <span className="font-display text-sm font-semibold leading-tight">
              {currentZone ? currentZone.name : "Open Roads"}
            </span>
          </div>
          <span className="h-8 w-px bg-[oklch(1_0_0_/_0.15)]" />
          <div className="flex flex-col">
            <span className="hud-label">{timeLabel(timeOfDay)}</span>
            <span className="font-display text-sm font-semibold leading-tight tabular-nums">
              {formatClock(clockMinutes)}
            </span>
          </div>
        </div>

        <div className="hud-panel flex items-center gap-2 rounded-2xl px-4 py-2.5">
          <span className="hud-label">Crew</span>
          <span className="font-display text-sm font-semibold tabular-nums">
            {passengers.length + 1}
            <span className="text-[oklch(0.75_0.02_250)]">/4</span>
          </span>
          <div className="flex gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <span
                key={i}
                className="h-1.5 w-4 rounded-full"
                style={{
                  background:
                    i <= passengers.length ? "var(--gradient-primary)" : "oklch(1 0 0 / 0.18)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* minimap */}
      <div className="pointer-events-none absolute bottom-5 left-5 z-30">
        <Minimap px={px} py={py} heading={heading} zones={zones} npcs={npcs} />
      </div>

      {/* speedometer */}
      <div className="pointer-events-none absolute bottom-5 right-5 z-30">
        <Speedometer speed={speed} gas={driving.gas} brake={driving.brake} reversing={reversing} />
      </div>

      <style>{`
        @keyframes streak { from { top: 100%; } to { top: -25%; } }
      `}</style>
    </div>
  );
}

/* ---------------- sprites ---------------- */

function CarSprite({ color, night }: { color: string; night: boolean }) {
  return (
    <div className="relative" style={{ width: 74, height: 52 }}>
      {/* cabin */}
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 rounded-t-[10px]"
        style={{
          width: 52,
          height: 22,
          background: `color-mix(in oklab, ${color} 78%, oklch(0.2 0.02 260))`,
        }}
      >
        <div
          className="absolute inset-x-[6px] top-[5px] h-[12px] rounded-[4px]"
          style={{ background: night ? "oklch(0.28 0.04 250)" : "oklch(0.6 0.06 235 / 0.85)" }}
        />
      </div>
      {/* body */}
      <div
        className="absolute bottom-[6px] left-1/2 -translate-x-1/2 rounded-[8px]"
        style={{
          width: 70,
          height: 26,
          background: `linear-gradient(to bottom, ${color}, color-mix(in oklab, ${color} 62%, oklch(0.18 0.02 260)))`,
          boxShadow: "inset 0 2px 0 oklch(1 0 0 / 0.25)",
        }}
      >
        <span
          className="absolute bottom-[5px] left-[6px] h-[7px] w-[12px] rounded-[3px]"
          style={{
            background: "oklch(0.62 0.22 28)",
            boxShadow: night ? "0 0 12px oklch(0.62 0.22 28 / 0.9)" : undefined,
          }}
        />
        <span
          className="absolute bottom-[5px] right-[6px] h-[7px] w-[12px] rounded-[3px]"
          style={{
            background: "oklch(0.62 0.22 28)",
            boxShadow: night ? "0 0 12px oklch(0.62 0.22 28 / 0.9)" : undefined,
          }}
        />
      </div>
      {/* wheels */}
      <div className="absolute bottom-0 left-[3px] h-[9px] w-[13px] rounded-[3px] bg-[oklch(0.16_0.01_260)]" />
      <div className="absolute bottom-0 right-[3px] h-[9px] w-[13px] rounded-[3px] bg-[oklch(0.16_0.01_260)]" />
    </div>
  );
}

function PlayerCar({ night, braking, boost }: { night: boolean; braking: boolean; boost: boolean }) {
  const tail = braking ? "oklch(0.68 0.26 28)" : "oklch(0.5 0.2 28)";
  return (
    <div className="relative" style={{ width: 220, height: 132 }}>
      {/* roof / cabin */}
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 rounded-t-[26px]"
        style={{
          width: 138,
          height: 58,
          background: "linear-gradient(to bottom, oklch(0.68 0.14 238), oklch(0.5 0.13 242))",
          boxShadow: "inset 0 3px 0 oklch(1 0 0 / 0.3)",
        }}
      >
        {/* rear window */}
        <div
          className="absolute inset-x-[14px] top-[16px] h-[34px] rounded-[12px]"
          style={{
            background: night
              ? "linear-gradient(to bottom, oklch(0.24 0.04 250), oklch(0.18 0.03 255))"
              : "linear-gradient(to bottom, oklch(0.66 0.07 232), oklch(0.45 0.06 240))",
            boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.25)",
          }}
        />
      </div>

      {/* body */}
      <div
        className="absolute bottom-[14px] left-1/2 -translate-x-1/2 rounded-[22px]"
        style={{
          width: 208,
          height: 70,
          background:
            "linear-gradient(to bottom, oklch(0.72 0.15 238) 0%, oklch(0.56 0.14 240) 55%, oklch(0.38 0.1 245) 100%)",
          boxShadow:
            "inset 0 4px 0 oklch(1 0 0 / 0.28), inset 0 -10px 22px oklch(0.15 0.04 260 / 0.5), 0 14px 30px -12px oklch(0.12 0.04 260 / 0.7)",
        }}
      >
        {/* spoiler line */}
        <div className="absolute inset-x-[26px] top-[10px] h-[3px] rounded-full bg-[oklch(1_0_0_/_0.22)]" />
        {/* tail lights */}
        <span
          className="absolute bottom-[16px] left-[14px] h-[14px] w-[42px] rounded-[7px] transition-all duration-150"
          style={{ background: tail, boxShadow: `0 0 ${braking ? 26 : 12}px ${tail}` }}
        />
        <span
          className="absolute bottom-[16px] right-[14px] h-[14px] w-[42px] rounded-[7px] transition-all duration-150"
          style={{ background: tail, boxShadow: `0 0 ${braking ? 26 : 12}px ${tail}` }}
        />
        {/* plate */}
        <div className="absolute bottom-[12px] left-1/2 -translate-x-1/2 rounded-[4px] bg-[oklch(0.94_0.02_240)] px-2 py-[1px] text-[9px] font-bold tracking-[0.12em] text-[oklch(0.25_0.04_255)]">
          FREE·RIDE
        </div>
        {/* exhaust glow */}
        {boost && (
          <span
            className="absolute -bottom-[6px] left-1/2 h-3 w-16 -translate-x-1/2 rounded-full"
            style={{ background: "oklch(0.8 0.12 60 / 0.5)", filter: "blur(6px)" }}
          />
        )}
      </div>

      {/* wheels */}
      <div className="absolute bottom-0 left-[2px] h-[26px] w-[34px] rounded-[8px] bg-[oklch(0.16_0.01_260)] shadow-[inset_0_3px_0_oklch(1_0_0_/_0.12)]" />
      <div className="absolute bottom-0 right-[2px] h-[26px] w-[34px] rounded-[8px] bg-[oklch(0.16_0.01_260)] shadow-[inset_0_3px_0_oklch(1_0_0_/_0.12)]" />
    </div>
  );
}

/* ---------------- HUD widgets ---------------- */

function Speedometer({
  speed,
  gas,
  brake,
  reversing,
}: {
  speed: number;
  gas: boolean;
  brake: boolean;
  reversing: boolean;
}) {
  const v = Math.min(180, Math.abs(speed));
  const pct = v / 180;
  const R = 54;
  const C = Math.PI * R; // half circle length
  const gear = reversing ? "R" : Math.abs(speed) < 1 ? "N" : "D";

  return (
    <div className="hud-panel flex items-end gap-4 rounded-3xl px-5 py-4">
      <div className="relative" style={{ width: 132, height: 82 }}>
        <svg width="132" height="82" viewBox="0 0 132 82" className="overflow-visible">
          <path
            d={`M 12 70 A ${R} ${R} 0 0 1 120 70`}
            fill="none"
            stroke="oklch(1 0 0 / 0.14)"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <path
            d={`M 12 70 A ${R} ${R} 0 0 1 120 70`}
            fill="none"
            stroke="url(#spd)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
            style={{ transition: "stroke-dashoffset 110ms linear" }}
          />
          <defs>
            <linearGradient id="spd" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="oklch(0.82 0.14 165)" />
              <stop offset="55%" stopColor="oklch(0.78 0.15 220)" />
              <stop offset="100%" stopColor="oklch(0.7 0.22 25)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span className="font-display text-[34px] font-bold leading-none tabular-nums">
            {Math.round(v)}
          </span>
          <span className="hud-label mt-0.5">km/h</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 pb-1">
        <span
          className="grid h-9 w-9 place-items-center rounded-xl font-display text-base font-bold"
          style={{
            background: gear === "D" ? "var(--gradient-primary)" : "oklch(1 0 0 / 0.12)",
            color: gear === "D" ? "oklch(0.15 0.03 255)" : "inherit",
          }}
        >
          {gear}
        </span>
        <div className="flex gap-1">
          <span
            className="h-1.5 w-5 rounded-full transition-colors"
            style={{ background: gas ? "oklch(0.82 0.16 150)" : "oklch(1 0 0 / 0.15)" }}
          />
          <span
            className="h-1.5 w-5 rounded-full transition-colors"
            style={{ background: brake ? "oklch(0.68 0.24 28)" : "oklch(1 0 0 / 0.15)" }}
          />
        </div>
      </div>
    </div>
  );
}

function Minimap({
  px,
  py,
  heading,
  zones,
  npcs,
}: {
  px: number;
  py: number;
  heading: number;
  zones: Zone[];
  npcs: GameWorldState["npcs"];
}) {
  const R = 62;
  const RANGE = 420; // world units shown
  const k = R / RANGE;

  return (
    <div className="hud-panel relative grid place-items-center rounded-full" style={{ width: 148, height: 148 }}>
      <div
        className="absolute inset-2 overflow-hidden rounded-full"
        style={{ background: "oklch(0.16 0.03 258 / 0.85)" }}
      >
        {/* road grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, oklch(1 0 0 / 0.14) 0 2px, transparent 2px 40px), repeating-linear-gradient(90deg, oklch(1 0 0 / 0.14) 0 2px, transparent 2px 40px)",
            backgroundPosition: `${-(px % CELL) * k * 2}px ${-(py % CELL) * k * 2}px`,
          }}
        />
        {zones.map((z) => {
          const dx = (z.x - px) * k;
          const dy = (z.y - py) * k;
          if (Math.hypot(dx, dy) > R - 6) return null;
          return (
            <span
              key={z.id}
              className="absolute text-[11px]"
              style={{ left: `calc(50% + ${dx}px)`, top: `calc(50% - ${dy}px)`, transform: "translate(-50%,-50%)" }}
            >
              {z.emoji}
            </span>
          );
        })}
        {npcs.map((n) => {
          const dx = (n.x - px) * k;
          const dy = (n.y - py) * k;
          if (Math.hypot(dx, dy) > R - 6) return null;
          return (
            <span
              key={n.id}
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{
                left: `calc(50% + ${dx}px)`,
                top: `calc(50% - ${dy}px)`,
                transform: "translate(-50%,-50%)",
                background: n.color,
              }}
            />
          );
        })}
        {/* player */}
        <span
          className="absolute left-1/2 top-1/2"
          style={{ transform: `translate(-50%,-50%) rotate(${heading}deg)` }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <path d="M8 1 L13 15 L8 12 L3 15 Z" fill="oklch(0.82 0.15 200)" />
          </svg>
        </span>
      </div>
      <span className="absolute top-1 left-1/2 -translate-x-1/2 hud-label">N</span>
    </div>
  );
}
