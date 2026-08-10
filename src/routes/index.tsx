import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { World } from "@/components/game/World";
import { Phone } from "@/components/game/Phone";
import { SeatbeltWarning } from "@/components/game/SeatbeltWarning";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Freeride City — Multiplayer Cruise & Chat" },
      {
        name: "description",
        content:
          "A friendly multiplayer freeride world: self-driving cars, an in-game phone with calls, maps and car invites. No missions, just exploring together.",
      },
      { property: "og:title", content: "Freeride City — Multiplayer Cruise & Chat" },
      {
        property: "og:description",
        content:
          "Cruise a safe, auto-driving city with friends. Call, navigate and invite riders from your in-game smartphone.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [buckled, setBuckled] = useState(false);
  const [passengers, setPassengers] = useState<string[]>([]);
  const [destination, setDestination] = useState<string | null>(null);
  const [speed, setSpeed] = useState(0);
  const [comfort, setComfort] = useState(100);
  const [bumped, setBumped] = useState(false);

  // Cars always auto-drive — the seatbelt never stops the car.
  const moving = true;

  useEffect(() => {
    const id = setInterval(() => {
      setSpeed((s) => {
        const target = destination ? 52 : 34;
        if (s === target) return s;
        return s < target ? Math.min(target, s + 3) : Math.max(target, s - 6);
      });
    }, 220);
    return () => clearInterval(id);
  }, [destination]);

  // Bumps happen while driving. Unbuckled = you get shaken and lose comfort.
  useEffect(() => {
    const id = setInterval(() => {
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
  }, [buckled]);

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
                Explore, cruise and hang out — no missions, ever.
              </p>
            </div>
          </div>
          <div className="glass-card flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-accent animate-soft-pulse" />
            12 players online
          </div>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
          <div className="relative min-h-[520px] flex-1 lg:min-h-[600px]">
            <World moving={moving} speed={speed} passengers={passengers} />
            {!buckled && <SeatbeltWarning onBuckle={() => setBuckled(true)} />}
            {buckled && (
              <button
                onClick={() => setBuckled(false)}
                className="absolute right-4 top-4 rounded-full bg-card px-4 py-2 text-xs font-semibold shadow-[var(--shadow-soft)] transition-transform duration-200 hover:scale-105"
              >
                Seatbelt: on
              </button>
            )}
          </div>

          <div className="flex justify-center lg:justify-start">
            <Phone
              passengers={passengers}
              onInvite={toggleInvite}
              destination={destination}
              onNavigate={setDestination}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
