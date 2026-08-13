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
 * The car can drift onto the shoulder but heavy drag stops it from
 * flying off into the grass.
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
const SHOULDER = 12;     // how far past road edge the car can crawl (curb zone)

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
 * Distance from the nearest road centerline.
 * Roads form a grid at every CELL interval in both X and Y.
 * Returns 0 when perfectly on a road centerline.
 */
function distToNearestRoad(x: number, y: number): number {
  // Nearest vertical road centerline: x = n * CELL
  const dx = Math.abs(x - Math.round(x / CELL) * CELL);
  // Nearest horizontal road centerline: y = n * CELL
  const dy = Math.abs(y - Math.round(y / CELL) * CELL);
  return Math.min(dx, dy);
}

export function useDriving() {
  const [state, setState] = useState<DrivingState>({
    speed: 0,
    steering: 0,
    heading: 0,  // North = forward
    position: { x: 0, y: 0 },
    gas: false,
    brake: false,
    handbrake: false,
    offRoad: false,
  });

  const keys = useRef<Record<string, boolean>>({});
  const ref = useRef<DrivingState>(state);
  ref.current = state;

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

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); // cap at 50ms
      last = now;

      setState((prev) => {
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
            speed -= ACCEL_RATE * 0.6 * dt; // reverse acceleration
          }
        } else {
          // coast / drag
          if (speed > 0) speed = Math.max(0, speed - COAST_DRAG * dt);
          else if (speed < 0) speed = Math.min(0, speed + COAST_DRAG * dt);
        }

        if (handbrake) {
          if (speed > 0) speed = Math.max(0, speed - HANDBRAKE_RATE * dt);
          else if (speed < 0) speed = Math.min(0, speed + HANDBRAKE_RATE * dt);
        }

        speed = Math.max(REVERSE_MAX, Math.min(MAX_SPEED, speed));

        // Steering physics — ramp towards target
        let steering = prev.steering;
        if (left && !right) steering = Math.max(-1, steering - STEER_RATE * dt);
        else if (right && !left) steering = Math.min(1, steering + STEER_RATE * dt);
        else {
          // return to center
          if (steering > 0) steering = Math.max(0, steering - STEER_RETURN * dt);
          else if (steering < 0) steering = Math.min(0, steering + STEER_RETURN * dt);
        }

        // Heading changes based on steering and speed (more speed = more turn)
        const speedFactor = Math.min(1.2, Math.max(0.15, Math.abs(speed) / 25));
        const heading =
          ((prev.heading + steering * TURN_FACTOR * speedFactor * dt * 60 * Math.sign(speed || 1)) % 360 + 360) % 360;

        // Position update: convert speed to world units
        // 1 km/h ≈ 0.5 world units / second for a nice visual feel
        const dist = (speed / 3.6) * dt * 0.5; // m/s * dt * scale
        const rad = (heading * Math.PI) / 180;
        let position = {
          x: prev.position.x + Math.sin(rad) * dist,
          y: prev.position.y + Math.cos(rad) * dist, // positive Y = forward (toward camera in 3D chase-cam)
        };

        // ---- ROAD BARRIER SYSTEM ----
        // Check if the car is on a road. Roads form a grid at CELL intervals.
        const roadDist = distToNearestRoad(position.x, position.y);
        const halfRoad = ROAD_W / 2;
        let offRoad = false;

        if (roadDist > halfRoad) {
          offRoad = true;
          const overshoot = roadDist - halfRoad;

          if (overshoot <= SHOULDER) {
            // On the shoulder/curb: moderate grass drag
            const grassDrag = 35 + overshoot * 6;
            if (speed > 0) speed = Math.max(0, speed - grassDrag * dt);
            else if (speed < 0) speed = Math.min(0, speed + grassDrag * dt);
          } else {
            // Hard barrier: past the shoulder — extreme drag, car crawls to a stop
            // Allow reversing so the player can back out
            const barrierDrag = 200;
            if (speed > 0) speed = Math.max(0, speed - barrierDrag * dt);
            else if (speed < 0) speed = Math.min(0, speed + barrierDrag * dt);

            // If the car is basically stopped, prevent further forward drift
            // by clamping position to just inside the barrier
            if (Math.abs(speed) < 1) {
              speed = 0;
              // Snap back to just inside the hard barrier edge
              position = { ...prev.position };
            }
          }
        }

        return { speed, steering, heading, position, gas, brake, handbrake, offRoad };
      });

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
