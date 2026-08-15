import { useEffect, useRef, useState, useCallback } from "react";

/**
 * useDriving — real driving physics for an open-world cruiser.
 *
 * Controls:
 *  - ArrowUp / W    → accelerate (gas)
 *  - ArrowDown / S   → brake / reverse
 *  - ArrowLeft / A   → steer left
 *  - ArrowRight / D  → steer right
 *  - Space           → handbrake
 *
 * The hook tracks speed (km/h), steering angle (-1..1), heading (degrees),
 * and world position (x, y) in arbitrary world units.
 *
 * Road barrier: the world has a grid of roads (CELL spacing, ROAD_W width).
 * Off-road the car hits exponential grass drag + a gentle push-back toward
 * the nearest road. No hard snap — the world keeps scrolling smoothly.
 */

export type DrivingState = {
  speed: number;        // km/h, can be negative for reverse
  steering: number;     // -1 (full left) to 1 (full right)
  heading: number;      // degrees, 0 = north, clockwise
  position: { x: number; y: number }; // world coordinates
  gas: boolean;
  brake: boolean;
  handbrake: boolean;
  offRoad: boolean;     // true when car is on grass/shoulder
};

// Road grid constants — MUST match World.tsx
const CELL = 260;        // world units between roads
const ROAD_W = 46;       // world units road width
const SHOULDER = 12;     // how far past road edge before push-back kicks in

const MAX_SPEED = 180;       // km/h top speed
const REVERSE_MAX = -25;     // km/h max reverse
const ACCEL_RATE = 45;       // km/h per second when accelerating
const BRAKE_RATE = 90;       // km/h per second when braking
const COAST_DRAG = 18;       // km/h per second natural deceleration
const STEER_RATE = 2.2;      // how fast steering input ramps
const STEER_RETURN = 3.5;    // how fast steering returns to center
const TURN_FACTOR = 0.55;    // how much steering affects heading at speed
const HANDBRAKE_RATE = 120;  // km/h per second handbrake

/**
 * Distance from the nearest road centerline and which axis is closest.
 * Roads form a grid at every CELL interval in both X and Y.
 */
function roadProximity(x: number, y: number): { dist: number; axis: "x" | "y" } {
  const dx = Math.abs(x - Math.round(x / CELL) * CELL);
  const dy = Math.abs(y - Math.round(y / CELL) * CELL);
  if (dx <= dy) return { dist: dx, axis: "x" };
  return { dist: dy, axis: "y" };
}

const INITIAL: DrivingState = {
  speed: 0,
  steering: 0,
  heading: 0,
  position: { x: 0, y: 0 },
  gas: false,
  brake: false,
  handbrake: false,
  offRoad: false,
};

export function useDriving() {
  // React state is committed at a low rate (~12 Hz) purely for HUD / world
  // chunk updates. The authoritative physics lives in `live` and runs at
  // full frame rate, so heavy React trees never re-render 60x per second.
  const [state, setState] = useState<DrivingState>(INITIAL);
  const live = useRef<DrivingState>(INITIAL);

  const keys = useRef<Record<string, boolean>>({});

  // Keyboard input
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Game loop
  useEffect(() => {
    let raf: number;
    let last = performance.now();
    let sinceCommit = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      {
        const prev = live.current;

        const k = keys.current;
        const gas = !!(k["arrowup"] || k["w"]);
        const brake = !!(k["arrowdown"] || k["s"]);
        const left = !!(k["arrowleft"] || k["a"]);
        const right = !!(k["arrowright"] || k["d"]);
        const handbrake = !!k[" "];

        // Speed physics
        let speed = prev.speed;
        if (gas && !handbrake) {
          speed += ACCEL_RATE * dt;
        } else if (brake) {
          if (speed > 0) {
            speed -= BRAKE_RATE * dt;
          } else {
            speed -= ACCEL_RATE * 0.6 * dt;
          }
        } else {
          if (speed > 0) speed = Math.max(0, speed - COAST_DRAG * dt);
          else if (speed < 0) speed = Math.min(0, speed + COAST_DRAG * dt);
        }

        if (handbrake) {
          if (speed > 0) speed = Math.max(0, speed - HANDBRAKE_RATE * dt);
          else if (speed < 0) speed = Math.min(0, speed + HANDBRAKE_RATE * dt);
        }

        speed = Math.max(REVERSE_MAX, Math.min(MAX_SPEED, speed));

        // Steering physics
        let steering = prev.steering;
        if (left && !right) steering = Math.max(-1, steering - STEER_RATE * dt);
        else if (right && !left) steering = Math.min(1, steering + STEER_RATE * dt);
        else {
          if (steering > 0) steering = Math.max(0, steering - STEER_RETURN * dt);
          else if (steering < 0) steering = Math.min(0, steering + STEER_RETURN * dt);
        }

        // Heading changes based on steering and speed
        const speedFactor = Math.min(1.2, Math.max(0.15, Math.abs(speed) / 25));
        const heading =
          ((prev.heading + steering * TURN_FACTOR * speedFactor * dt * 60 * Math.sign(speed || 1)) % 360 + 360) % 360;

        // Position update
        const dist = (speed / 3.6) * dt * 0.5;
        const rad = (heading * Math.PI) / 180;
        let position = {
          x: prev.position.x + Math.sin(rad) * dist,
          y: prev.position.y + Math.cos(rad) * dist,
        };

        // ---- ROAD BARRIER SYSTEM (smooth) ----
        const prox = roadProximity(position.x, position.y);
        const halfRoad = ROAD_W / 2;
        let offRoad = false;

        if (prox.dist > halfRoad) {
          offRoad = true;
          const overshoot = prox.dist - halfRoad;

          // Exponential grass drag — smooth curve from mild to extreme
          // shoulder edge (0):  ~30 km/h/s  — gentle slowdown
          // +12 (shoulder):     ~47 km/h/s  — noticeable
          // +25:                ~94 km/h/s  — heavy
          // +40:               ~150 km/h/s  — near stop
          const grassDrag = 30 + overshoot * overshoot * 0.08;
          if (speed > 0) speed = Math.max(0, speed - grassDrag * dt);
          else if (speed < 0) speed = Math.min(0, speed + grassDrag * dt);

          // Gentle push-back toward nearest road — only past the shoulder
          // This creates a "magnetic road" effect: the world smoothly
          // scrolls back toward the road instead of hitting a hard wall.
          if (overshoot > SHOULDER) {
            const pushStrength = Math.min(6, (overshoot - SHOULDER) * 0.25) * dt;
            const nearestRoad = Math.round(
              (prox.axis === "x" ? position.x : position.y) / CELL
            ) * CELL;
            const delta = (prox.axis === "x" ? position.x : position.y) - nearestRoad;

            if (prox.axis === "x") {
              position.x -= Math.sign(delta) * pushStrength;
            } else {
              position.y -= Math.sign(delta) * pushStrength;
            }
          }
        }

        live.current = { speed, steering, heading, position, gas, brake, handbrake, offRoad };
      }

      sinceCommit += dt;
      if (sinceCommit >= 0.08) {
        sinceCommit = 0;
        setState(live.current);
      }


      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Touch controls for mobile
  const setTouch = useCallback((control: "gas" | "brake" | "left" | "right" | "handbrake", active: boolean) => {
    const map: Record<string, string> = {
      gas: "arrowup",
      brake: "arrowdown",
      left: "arrowleft",
      right: "arrowright",
      handbrake: " ",
    };
    const key = map[control];
    if (key) keys.current[key] = active;
  }, []);

  return { state, setTouch };
}
