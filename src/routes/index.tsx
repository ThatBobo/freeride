import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { World } from "@/components/game/World";
import { Phone } from "@/components/game/Phone";
import { SeatbeltWarning } from "@/components/game/SeatbeltWarning";
import { useDriving } from "@/hooks/useDriving";
import { useGameWorld } from "@/hooks/useGameWorld";
import { Sparkles, Smartphone, X } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Freeride City — Open-World Cruiser" },
      {
        name: "description",
        content:
          "An open-world cruiser: drive freely through a living city with day/night cycle, NPC traffic, and real landmarks.",
      },
      { property: "og:title", content: "Freeride City — Open-World Cruiser" },
      {
        property: "og:description",
        content:
          "Cruise a living city with real driving controls. Explore, hang out, and enjoy the ride.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { state: driving, setTouch } = useDriving();
  const { state: gameWorld, zones } = useGameWorld(driving);
  const [buckled, setBuckled] = useState(false);
  const [passengers, setPassengers] = useState<string[]>([]);
  const [destination, setDestination] = useState<string | null>(null);
  const [comfort, setComfort] = useState(100);
  const [bumped, setBumped] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);

  const moving = Math.abs(driving.speed) > 1;

  useEffect(() => {
    const id = setInterval(() => {
      if (Math.abs(driving.speed) < 5) return;
      if (Math.random() > 0.45) return;
      if (buckled) {
        setComfort((c) => Math.min(100, c + 5));
        return;
      }
      setBumped(true);
      setComfort((c) => Math.max(0, c - 8));
      setTimeout(() => setBumped(false), 450);
    }, 3000);
    return () => clearInterval(id);
  }, [buckled, driving.speed]);

  useEffect(() => {
    if (!buckled) return;
    const id = setInterval(() => setComfort((c) => Math.min(100, c + 4)), 2500);
    return () => clearInterval(id);
  }, [buckled]);

  const toggleInvite = (name: string) =>
    setPassengers((p) => (p.includes(name) ? p.filter((n) => n !== name) : [...p, name]));

  return (
    <main className="fixed inset-0 overflow-hidden bg-background">
      <div
        className="absolute inset-0"
        style={{ animation: bumped ? "world-bump 0.4s ease-in-out" : undefined }}
      >
        <World
          driving={driving}
          passengers={passengers}
          moving={moving}
          gameWorld={gameWorld}
          zones={zones}
        />
      </div>

      {/* Minimal HUD */}
      <div className="pointer-events-none absolute left-4 top-4 z-30 flex items-center gap-2">
        <span
          className="grid h-9 w-9 place-items-center rounded-xl"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </span>
        <span className="glass-card rounded-full px-3 py-1.5 text-xs font-semibold">
          {gameWorld.npcs.length + 1} cars nearby
        </span>
      </div>

      {!buckled && (
        <SeatbeltWarning onBuckle={() => setBuckled(true)} comfort={comfort} bumped={bumped} />
      )}
      {buckled && (
        <button
          onClick={() => setBuckled(false)}
          className="absolute right-4 top-4 z-30 rounded-full bg-card px-4 py-2 text-xs font-semibold shadow-[var(--shadow-soft)] transition-transform duration-200 hover:scale-105"
        >
          Seatbelt: on · comfort {comfort}%
        </button>
      )}

      {/* Touch controls removed — keyboard only. Car stays centered. */}

      <style>{`
        @keyframes world-bump {
          0%,100% { transform: translate(0,0) }
          30% { transform: translate(-6px, 4px) }
          70% { transform: translate(6px, -4px) }
        }
      `}</style>

      {/* Phone toggle button */}
      <button
        onClick={() => setPhoneOpen((o) => !o)}
        aria-label={phoneOpen ? "Close phone" : "Open phone"}
        className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-2xl text-primary-foreground shadow-[var(--shadow-soft)] transition-transform duration-200 hover:scale-110 active:scale-95"
        style={{ background: "var(--gradient-primary)" }}
      >
        {phoneOpen ? <X className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
      </button>

      {/* Sliding phone overlay */}
      <div
        onClick={() => setPhoneOpen(false)}
        className={`fixed inset-0 z-40 bg-foreground/30 backdrop-blur-[2px] transition-opacity duration-300 ${
          phoneOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-40 flex justify-center transition-transform duration-500 ease-out ${
          phoneOpen ? "translate-y-0" : "pointer-events-none translate-y-[110%]"
        }`}
      >
        <div className="pb-4">
          <Phone
            passengers={passengers}
            onInvite={toggleInvite}
            destination={destination}
            onNavigate={setDestination}
          />
        </div>
      </div>
    </main>
  );
}
