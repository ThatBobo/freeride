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
 */

export type DrivingState = {
  speed: number;        // km/h, can be negative for reverse
  steering: number;     // -1 (full left) to 1 (full right)
  heading: number;      // degrees, 0 = north, clockwise
  position: { x: number; y: number }; // world coordinates
  gas: boolean;
  brake: boolean;
  handbrake: boolean;
};

const MAX_SPEED = 180;       // km/h top speed
const REVERSE_MAX = -25;     // km/h max reverse
const ACCEL_RATE = 45;       // km/h per second when accelerating
const BRAKE_RATE = 90;       // km/h per second when braking
const COAST_DRAG = 18;       // km/h per second natural deceleration
const STEER_RATE = 2.2;      // how fast steering input ramps
const STEER_RETURN = 3.5;    // how fast steering returns to center
const TURN_FACTOR = 0.55;    // how much steering affects heading at speed
const HANDBRAKE_RATE = 120;  // km/h per second handbrake

export function useDriving() {
  const [state, setState] = useState<DrivingState>({
    speed: 0,
    steering: 0,
    heading: 0,
    position: { x: 0, y: 0 },
    gas: false,
    brake: false,
    handbrake: false,
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
        const position = {
          x: prev.position.x + Math.sin(rad) * dist,
          y: prev.position.y - Math.cos(rad) * dist, // negative because screen y goes down
        };

        return { speed, steering, heading, position, gas, brake, handbrake };
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
