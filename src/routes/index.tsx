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

  // Bumps happen while driving. Unbuckled = you get shaken and lose comfort.
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
    <main className="min-h-screen bg-background p-4 lg:p-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 pb-5 sm:flex sm:flex-wrap sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-extrabold sm:text-2xl">
                Freeride City
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                Open-world cruiser — you're in control.
              </p>
            </div>
          </div>
          <div className="glass-card flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-accent animate-soft-pulse" />
            {gameWorld.npcs.length + 1} cars nearby
          </div>
        </header>

        <div className="flex flex-col gap-6">
          <div
            className="relative min-h-[520px] flex-1 lg:min-h-[600px]"
            style={{ animation: bumped ? "world-bump 0.4s ease-in-out" : undefined }}
          >
            <World
              driving={driving}
              passengers={passengers}
              moving={moving}
              gameWorld={gameWorld}
              zones={zones}
            />
            {!buckled && (
              <SeatbeltWarning
                onBuckle={() => setBuckled(true)}
                comfort={comfort}
                bumped={bumped}
              />
            )}
            {buckled && (
              <button
                onClick={() => setBuckled(false)}
                className="absolute right-4 top-16 z-30 rounded-full bg-card px-4 py-2 text-xs font-semibold shadow-[var(--shadow-soft)] transition-transform duration-200 hover:scale-105"
              >
                Seatbelt: on · comfort {comfort}%
              </button>
            )}

            {/* Mobile touch controls */}
            <TouchControls setTouch={setTouch} />

            <style>{`
              @keyframes world-bump {
                0%,100% { transform: translate(0,0) }
                30% { transform: translate(-6px, 4px) }
                70% { transform: translate(6px, -4px) }
              }
            `}</style>
          </div>
        </div>
      </div>

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

function TouchControls({
  setTouch,
}: {
  setTouch: (control: "gas" | "brake" | "left" | "right" | "handbrake", active: boolean) => void;
}) {
  const btn = (control: "gas" | "brake" | "left" | "right" | "handbrake", label: string, cls: string) => (
    <button
      className={`flex h-14 w-14 items-center justify-center rounded-2xl glass-card text-sm font-bold transition-transform active:scale-90 ${cls}`}
      onPointerDown={(e) => { e.preventDefault(); setTouch(control, true); }}
      onPointerUp={() => setTouch(control, false)}
      onPointerLeave={() => setTouch(control, false)}
      onPointerCancel={() => setTouch(control, false)}
    >
      {label}
    </button>
  );

  return (
    <div className="absolute bottom-20 right-4 z-30 flex gap-2 lg:hidden">
      <div className="flex flex-col gap-2">
        {btn("gas", "▲", "bg-primary/20")}
        {btn("brake", "▼", "bg-destructive/20")}
      </div>
      <div className="flex flex-col gap-2">
        {btn("left", "◀", "")}
        {btn("right", "▶", "")}
      </div>
    </div>
  );
}
