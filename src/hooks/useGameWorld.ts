import { useEffect, useRef, useState } from "react";
import type { DrivingState } from "./useDriving";

export type TimeOfDay = "dawn" | "day" | "dusk" | "night";

export type NPC = {
  id: number;
  x: number;        // world position
  y: number;
  heading: number;  // degrees
  speed: number;    // km/h
  color: string;
  lane: number;     // 0 = right lane, 1 = left lane
};

export type Zone = {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  emoji: string;
  description: string;
};

export type GameWorldState = {
  timeOfDay: TimeOfDay;
  clockMinutes: number;     // 0-1439 (minutes since midnight)
  npcs: NPC[];
  currentZone: Zone | null;
  nearbyZones: Zone[];
  weather: "clear" | "cloudy" | "rain";
};

const ZONES: Zone[] = [
  { id: "beach", name: "Sunset Beach", x: 0, y: 200, radius: 60, emoji: "🏖️", description: "Relax by the shore" },
  { id: "downtown", name: "Downtown", x: 0, y: 0, radius: 80, emoji: "🏙️", description: "The city center" },
  { id: "park", name: "Central Park", x: -150, y: 50, radius: 50, emoji: "🌳", description: "Greenery and fresh air" },
  { id: "skatepark", name: "Skate Park", x: 120, y: -80, radius: 40, emoji: "🛹", description: "Tricks and vibes" },
  { id: "ferris", name: "Ferris Wheel", x: 200, y: 120, radius: 45, emoji: "🎡", description: "The boardwalk" },
  { id: "suburbs", name: "Quiet Suburbs", x: -200, y: -150, radius: 70, emoji: "🏠", description: "Peaceful streets" },
  { id: "tunnel", name: "City Tunnel", x: 80, y: 250, radius: 30, emoji: "🚇", description: "Under the river" },
  { id: "bridge", name: "Harbor Bridge", x: -100, y: 180, radius: 35, emoji: "🌉", description: "Cross the water" },
];

const NPC_COLORS = [
  "oklch(0.78 0.14 25)", "oklch(0.82 0.12 95)", "oklch(0.75 0.12 280)",
  "oklch(0.8 0.12 160)", "oklch(0.72 0.15 200)", "oklch(0.85 0.1 350)",
  "oklch(0.7 0.18 30)", "oklch(0.8 0.13 145)",
];

function spawnNPC(id: number, nearX: number, nearY: number): NPC {
  const lane = Math.random() > 0.5 ? 0 : 1;
  const offset = lane === 0 ? 30 : -30;
  const angle = Math.random() * 360;
  const dist = 100 + Math.random() * 200;
  return {
    id,
    x: nearX + Math.cos((angle * Math.PI) / 180) * dist + offset,
    y: nearY + Math.sin((angle * Math.PI) / 180) * dist,
    heading: Math.random() * 360,
    speed: 20 + Math.random() * 40,
    color: NPC_COLORS[id % NPC_COLORS.length] ?? "oklch(0.78 0.14 25)",
    lane,
  };
}

function getTimeOfDay(minutes: number): TimeOfDay {
  if (minutes >= 300 && minutes < 420) return "dawn";    // 5:00-7:00
  if (minutes >= 420 && minutes < 1020) return "day";   // 7:00-17:00
  if (minutes >= 1020 && minutes < 1140) return "dusk"; // 17:00-19:00
  return "night";                                        // 19:00-5:00
}

export function useGameWorld(driving: DrivingState) {
  const [state, setState] = useState<GameWorldState>({
    timeOfDay: "day",
    clockMinutes: 600, // 10:00 AM
    npcs: [],
    currentZone: null,
    nearbyZones: [],
    weather: "clear",
  });

  const npcIdRef = useRef(0);
  const drivingRef = useRef(driving);
  drivingRef.current = driving;

  // Day/night cycle — 1 in-game hour = 30 real seconds (full day = 12 min)
  useEffect(() => {
    const id = setInterval(() => {
      setState((prev) => {
        const mins = (prev.clockMinutes + 2) % 1440; // 2 min per tick = 30s per hour
        return { ...prev, clockMinutes: mins, timeOfDay: getTimeOfDay(mins) };
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // NPC simulation
  useEffect(() => {
    const id = setInterval(() => {
      setState((prev) => {
        const player = drivingRef.current.position;
        let npcs = [...prev.npcs];

        // Despawn NPCs that are too far
        npcs = npcs.filter((n) => {
          const dx = n.x - player.x;
          const dy = n.y - player.y;
          return Math.sqrt(dx * dx + dy * dy) < 350;
        });

        // Spawn new NPCs if we need more (max 8)
        while (npcs.length < 6) {
          npcs.push(spawnNPC(npcIdRef.current++, player.x, player.y));
        }

        // Update NPC positions
        npcs = npcs.map((n) => {
          const rad = (n.heading * Math.PI) / 180;
          const dist = (n.speed / 3.6) * 0.5; // same scale as player
          let newX = n.x + Math.sin(rad) * dist;
          let newY = n.y + Math.cos(rad) * dist;

          // Simple wander: randomly adjust heading slightly
          let newHeading = (n.heading + (Math.random() - 0.5) * 20) % 360;
          if (newHeading < 0) newHeading += 360;

          return { ...n, x: newX, y: newY, heading: newHeading };
        });

        return { ...prev, npcs };
      });
    }, 100); // 10 fps for NPC sim
    return () => clearInterval(id);
  }, []);

  // Zone detection
  useEffect(() => {
    const player = driving.position;
    let current: Zone | null = null;
    const nearby: Zone[] = [];

    for (const zone of ZONES) {
      const dx = zone.x - player.x;
      const dy = zone.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= zone.radius) current = zone;
      if (dist <= zone.radius + 100) nearby.push(zone);
    }

    setState((prev) => {
      const sameCurrent = (prev.currentZone?.id ?? null) === (current?.id ?? null);
      const sameNearby =
        prev.nearbyZones.length === nearby.length &&
        prev.nearbyZones.every((z, i) => z.id === nearby[i]?.id);
      if (sameCurrent && sameNearby) return prev;
      return { ...prev, currentZone: current, nearbyZones: nearby };
    });

  }, [driving.position.x, driving.position.y]);

  return { state, zones: ZONES };
}
