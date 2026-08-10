import { useEffect, useState } from "react";
import {
  Phone as PhoneIcon,
  Map as MapIcon,
  UserPlus,
  Wifi,
  BatteryFull,
  Signal,
  ChevronLeft,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Navigation,
  MapPin,
  Check,
  Clock,
} from "lucide-react";

export type Friend = { id: string; name: string; emoji: string; distance: string };

const FRIENDS: Friend[] = [
  { id: "1", name: "Mika", emoji: "🦊", distance: "120 m" },
  { id: "2", name: "Sam", emoji: "🐼", distance: "340 m" },
  { id: "3", name: "Lena", emoji: "🐬", distance: "1.1 km" },
  { id: "4", name: "Theo", emoji: "🐨", distance: "2.4 km" },
];

const PLACES = [
  { name: "Sunset Beach", eta: "4 min", dist: "1.2 km" },
  { name: "Skate Park", eta: "6 min", dist: "2.0 km" },
  { name: "Ferris Wheel", eta: "9 min", dist: "3.4 km" },
];

type Screen = "home" | "calls" | "maps" | "invite";

type PhoneProps = {
  passengers: string[];
  onInvite: (name: string) => void;
  destination: string | null;
  onNavigate: (place: string | null) => void;
};

export function Phone({ passengers, onInvite, destination, onNavigate }: PhoneProps) {
  const [screen, setScreen] = useState<Screen>("home");
  const [inCall, setInCall] = useState<Friend | null>(null);

  return (
    <div className="relative w-[320px] shrink-0">
      <div
        className="rounded-[2.6rem] border-8 border-foreground/85 p-1 shadow-[var(--shadow-phone)]"
        style={{ background: "var(--gradient-phone)" }}
      >
        <div className="relative h-[600px] overflow-hidden rounded-[2.1rem] bg-background">
          <StatusBar />
          <div key={screen + (inCall?.id ?? "")} className="h-[calc(100%-2rem)] animate-pop-in">
            {screen === "home" && <HomeScreen onOpen={setScreen} passengers={passengers} />}
            {screen === "calls" &&
              (inCall ? (
                <CallScreen friend={inCall} onHangUp={() => setInCall(null)} />
              ) : (
                <CallsScreen onBack={() => setScreen("home")} onCall={setInCall} />
              ))}
            {screen === "maps" && (
              <MapsScreen
                onBack={() => setScreen("home")}
                destination={destination}
                onNavigate={onNavigate}
              />
            )}
            {screen === "invite" && (
              <InviteScreen
                onBack={() => setScreen("home")}
                passengers={passengers}
                onInvite={onInvite}
              />
            )}
          </div>
          <button
            onClick={() => {
              setInCall(null);
              setScreen("home");
            }}
            aria-label="Home"
            className="absolute bottom-2 left-1/2 h-1.5 w-24 -translate-x-1/2 rounded-full bg-foreground/25 transition-colors hover:bg-foreground/50"
          />
        </div>
      </div>
    </div>
  );
}

function StatusBar() {
  const [time, setTime] = useState("12:00");
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex h-8 items-center justify-between px-5 pt-1 text-[11px] font-semibold text-muted-foreground">
      <span>{time}</span>
      <span className="flex items-center gap-1.5">
        <Signal className="h-3 w-3" />
        <Wifi className="h-3 w-3" />
        <BatteryFull className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}

function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 px-4 pb-3 pt-1">
      <button
        onClick={onBack}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted transition-transform duration-200 hover:scale-110"
        aria-label="Back"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h2 className="truncate font-display text-lg font-bold">{title}</h2>
    </div>
  );
}

function HomeScreen({
  onOpen,
  passengers,
}: {
  onOpen: (s: Screen) => void;
  passengers: string[];
}) {
  const apps = [
    { key: "calls" as const, label: "Calls", icon: PhoneIcon, bg: "bg-accent" },
    { key: "maps" as const, label: "Maps", icon: MapIcon, bg: "bg-primary" },
    { key: "invite" as const, label: "Invite", icon: UserPlus, bg: "bg-warn" },
  ];
  return (
    <div className="flex h-full flex-col px-5 pt-4">
      <p className="font-display text-3xl font-extrabold leading-tight">Hey, rider</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {passengers.length ? `${passengers.length} friend(s) riding with you` : "Freeriding solo"}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {apps.map((a) => (
          <button
            key={a.key}
            onClick={() => onOpen(a.key)}
            className="group flex flex-col items-center gap-2"
          >
            <span
              className={`grid h-16 w-16 place-items-center rounded-[1.3rem] ${a.bg} shadow-[var(--shadow-soft)] transition-transform duration-200 group-hover:scale-110 group-active:scale-95`}
            >
              <a.icon className="h-7 w-7 text-card" />
            </span>
            <span className="text-xs font-semibold">{a.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-auto mb-8 space-y-3">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Free roam
          </p>
          <p className="mt-1 text-sm">
            No missions here — just drive, explore and hang out with friends.
          </p>
        </div>
      </div>
    </div>
  );
}

function CallsScreen({ onBack, onCall }: { onBack: () => void; onCall: (f: Friend) => void }) {
  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Calls" onBack={onBack} />
      <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-10">
        {FRIENDS.map((f) => (
          <button
            key={f.id}
            onClick={() => onCall(f)}
            className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left shadow-[var(--shadow-soft)] transition-transform duration-200 hover:scale-[1.02]"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-xl">
              {f.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{f.name}</span>
              <span className="block text-xs text-muted-foreground">{f.distance} away</span>
            </span>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent">
              <PhoneIcon className="h-4 w-4 text-card" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CallScreen({ friend, onHangUp }: { friend: Friend; onHangUp: () => void }) {
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="flex h-full flex-col items-center justify-between px-6 py-8 text-center">
      <div className="mt-6 flex flex-col items-center">
        <div className="relative">
          <span className="absolute -inset-3 rounded-full bg-accent/40 animate-ring-ping" />
          <span className="relative grid h-28 w-28 place-items-center rounded-full bg-secondary text-5xl">
            {friend.emoji}
          </span>
        </div>
        <h2 className="mt-5 font-display text-2xl font-bold">{friend.name}</h2>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {mm}:{ss}
        </p>
      </div>

      <div className="mb-6 w-full">
        <div className="mb-6 flex justify-center gap-4">
          <RoundBtn
            active={muted}
            onClick={() => setMuted((m) => !m)}
            label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </RoundBtn>
          <RoundBtn label="Speaker">
            <Volume2 className="h-5 w-5" />
          </RoundBtn>
        </div>
        <button
          onClick={onHangUp}
          className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive shadow-[var(--shadow-soft)] transition-transform duration-200 hover:scale-110 active:scale-95"
          aria-label="Hang up"
        >
          <PhoneOff className="h-6 w-6 text-destructive-foreground" />
        </button>
      </div>
    </div>
  );
}

function RoundBtn({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`grid h-12 w-12 place-items-center rounded-full transition-transform duration-200 hover:scale-110 ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function MapsScreen({
  onBack,
  destination,
  onNavigate,
}: {
  onBack: () => void;
  destination: string | null;
  onNavigate: (p: string | null) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Maps" onBack={onBack} />
      <div className="relative mx-4 h-44 overflow-hidden rounded-2xl bg-grass">
        <div className="absolute inset-y-0 left-1/3 w-6 bg-road" />
        <div className="absolute inset-x-0 top-1/2 h-6 bg-road" />
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 road-dashes" />
        <div className="absolute left-[31%] top-[45%] h-3 w-3 rounded-full bg-primary ring-4 ring-primary/30" />
        <MapPin className="absolute right-6 top-6 h-6 w-6 text-destructive" />
        {destination && (
          <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-xl bg-card/90 px-3 py-2 text-xs font-semibold shadow-[var(--shadow-soft)]">
            <Navigation className="h-4 w-4 text-primary" />
            <span className="truncate">Auto-driving to {destination}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex-1 space-y-2 overflow-y-auto px-4 pb-10">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Nearby spots
        </p>
        {PLACES.map((p) => {
          const active = destination === p.name;
          return (
            <button
              key={p.name}
              onClick={() => onNavigate(active ? null : p.name)}
              className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left shadow-[var(--shadow-soft)] transition-transform duration-200 hover:scale-[1.02] ${
                active ? "bg-primary text-primary-foreground" : "bg-card"
              }`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary">
                <MapPin className="h-4 w-4 text-secondary-foreground" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{p.name}</span>
                <span
                  className={`block text-xs ${active ? "opacity-80" : "text-muted-foreground"}`}
                >
                  {p.dist} · {p.eta}
                </span>
              </span>
              <span className="shrink-0 text-xs font-semibold">{active ? "Stop" : "Go"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InviteScreen({
  onBack,
  passengers,
  onInvite,
}: {
  onBack: () => void;
  passengers: string[];
  onInvite: (name: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <ScreenHeader title="Invite to car" onBack={onBack} />
      <p className="px-5 pb-3 text-sm text-muted-foreground">
        {passengers.length}/3 seats filled. Friends hop in automatically when they accept.
      </p>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-10">
        {FRIENDS.map((f) => {
          const joined = passengers.includes(f.name);
          const full = passengers.length >= 3 && !joined;
          return (
            <div
              key={f.id}
              className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-[var(--shadow-soft)]"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-xl">
                {f.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{f.name}</span>
                <span className="block text-xs text-muted-foreground">{f.distance} away</span>
              </span>
              <button
                disabled={full}
                onClick={() => onInvite(f.name)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-transform duration-200 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100 ${
                  joined ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
                }`}
              >
                {joined ? (
                  <span className="flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" /> Riding
                  </span>
                ) : (
                  "Invite"
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
