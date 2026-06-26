import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart3,
  ChevronDown,
  CreditCard,
  Dumbbell,
  Flag,
  History,
  Instagram,
  LayoutDashboard,
  Mail,
  Menu,
  NotebookPen,
  PlusCircle,
  Search,
  Settings,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { Button, StatusPill } from "@/components/ui";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "golf" | "gym" | "gold";
};

const mainLinks: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3, tone: "gold" },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/memberships", label: "Memberships", icon: CreditCard },
];

const trainingLinks: NavItem[] = [
  { href: "/workouts/submit", label: "Training Console", icon: PlusCircle, tone: "gym" },
  { href: "/workouts", label: "Training Board", icon: Dumbbell, tone: "gym" },
  { href: "/gym/history", label: "Training Logbook", icon: History, tone: "gym" },
];

const golfLinks: NavItem[] = [
  { href: "/golf/submit", label: "Round Scorecard", icon: PlusCircle, tone: "golf" },
  { href: "/golf", label: "Round History", icon: Flag, tone: "golf" },
  { href: "/golf/practice", label: "Log Practice", icon: NotebookPen, tone: "golf" },
  { href: "/golf/practice-history", label: "Practice History", icon: History, tone: "golf" },
];

const supportLinks: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/contact", label: "Contact", icon: Mail },
  { href: "/follow", label: "Follow", icon: Instagram },
];

const titles: Record<string, { title: string; section: string }> = {
  "/dashboard": { title: "Command Center", section: "Today" },
  "/analytics": { title: "Performance Report", section: "Analysis" },
  "/profile": { title: "Athlete Profile", section: "Account" },
  "/memberships": { title: "Memberships", section: "Billing" },
  "/workouts": { title: "Training Board", section: "Performance Lab" },
  "/workouts/submit": { title: "Training Console", section: "Performance Lab" },
  "/gym/history": { title: "Training Logbook", section: "Performance Lab" },
  "/golf": { title: "Round History", section: "Golf" },
  "/golf/submit": { title: "Round Scorecard", section: "Golf" },
  "/golf/practice": { title: "Practice Log", section: "Golf" },
  "/golf/practice-history": { title: "Practice History", section: "Golf" },
  "/settings": { title: "Settings", section: "System" },
  "/contact": { title: "Contact", section: "Support" },
  "/follow": { title: "Follow", section: "Community" },
};

export default function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const [trainingOpen, setTrainingOpen] = useState(true);
  const [golfOpen, setGolfOpen] = useState(true);
  const [location] = useLocation();
  const meta = titles[location] ?? { title: "AthletiGolf", section: "Performance" };
  const today = useMemo(
    () =>
      new Date().toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    []
  );

  const closeMenu = () => setOpen(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-white/10 bg-dark text-white lg:flex">
        <NavContent
          trainingOpen={trainingOpen}
          setTrainingOpen={setTrainingOpen}
          golfOpen={golfOpen}
          setGolfOpen={setGolfOpen}
          onClick={() => undefined}
        />
      </aside>

      <header className="fixed left-0 right-0 top-0 z-30 border-b border-line bg-cream/82 backdrop-blur-xl lg:left-72">
        <div className="flex h-20 items-center justify-between gap-4 px-4 md:px-8">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">{meta.section}</p>
              <StatusPill tone="pulse">{today}</StatusPill>
            </div>
            <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-dark md:text-2xl">
              {meta.title}
            </h1>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <div className="hidden items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-sm text-muted xl:flex">
              <Search className="h-4 w-4" />
              <span>AthletiGolf OS</span>
            </div>
            <Link href="/workouts/submit">
              <a><Button variant="pulse">Training</Button></a>
            </Link>
            <Link href="/golf/submit">
              <a><Button variant="golf">Round</Button></a>
            </Link>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-dark text-white shadow-sm lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            onClick={closeMenu}
            className="absolute inset-0 bg-black/50"
            aria-label="Close navigation"
          />
          <aside className="relative ml-auto flex h-full w-80 max-w-[90vw] flex-col bg-dark text-white shadow-2xl">
            <NavContent
              trainingOpen={trainingOpen}
              setTrainingOpen={setTrainingOpen}
              golfOpen={golfOpen}
              setGolfOpen={setGolfOpen}
              onClick={closeMenu}
              closeButton={
                <button
                  onClick={closeMenu}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" />
                </button>
              }
            />
          </aside>
        </div>
      )}
    </>
  );
}

function NavContent({
  trainingOpen,
  setTrainingOpen,
  golfOpen,
  setGolfOpen,
  onClick,
  closeButton,
}: {
  trainingOpen: boolean;
  setTrainingOpen: (value: boolean) => void;
  golfOpen: boolean;
  setGolfOpen: (value: boolean) => void;
  onClick: () => void;
  closeButton?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col p-5">
      <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-pulse" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pulse">AthletiGolf</p>
          </div>
          <h2 className="mt-2 text-xl font-semibold">Performance OS</h2>
        </div>
        {closeButton}
      </div>

      <nav className="flex min-h-0 flex-1 flex-col justify-between overflow-y-auto">
        <div className="space-y-5">
          <NavGroup items={mainLinks} onClick={onClick} />
          <Dropdown title="Golf" open={golfOpen} setOpen={setGolfOpen}>
            <NavGroup items={golfLinks} onClick={onClick} compact />
          </Dropdown>
          <Dropdown title="Training" open={trainingOpen} setOpen={setTrainingOpen}>
            <NavGroup items={trainingLinks} onClick={onClick} compact />
          </Dropdown>
        </div>

        <div className="mt-6 space-y-4 border-t border-white/10 pt-4">
          <div className="rounded-2xl border border-pulse/20 bg-pulse/10 p-4">
            <p className="text-sm font-semibold text-pulse">Build the week</p>
            <p className="mt-1 text-sm leading-relaxed text-white/65">
              Log rounds and sessions consistently to make the insights sharper.
            </p>
          </div>
          <NavGroup items={supportLinks} onClick={onClick} compact />
        </div>
      </nav>
    </div>
  );
}

function NavGroup({
  items,
  onClick,
  compact = false,
}: {
  items: NavItem[];
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      {items.map((item) => (
        <MenuLink key={item.href} item={item} onClick={onClick} compact={compact} />
      ))}
    </div>
  );
}

function MenuLink({
  item,
  onClick,
  compact,
}: {
  item: NavItem;
  onClick: () => void;
  compact?: boolean;
}) {
  const [location] = useLocation();
  const isActive = location === item.href;
  const Icon = item.icon;
  const toneClass =
    item.tone === "golf"
      ? "text-emerald-200"
      : item.tone === "gym"
      ? "text-sky-200"
      : item.tone === "gold"
      ? "text-gold"
      : "text-white/75";

  return (
    <Link href={item.href}>
      <a
        onClick={onClick}
        className={`flex items-center gap-3 rounded-lg px-3 transition ${
          compact ? "py-2.5 text-sm" : "py-3 text-sm font-semibold"
        } ${
          isActive
            ? "bg-white text-dark shadow-sm"
            : `${toneClass} hover:bg-white/10 hover:text-white`
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span>{item.label}</span>
      </a>
    </Link>
  );
}

function Dropdown({
  title,
  open,
  setOpen,
  children,
}: {
  title: string;
  open: boolean;
  setOpen: (value: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
      >
        <span>{title}</span>
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && <div className="mt-1 space-y-1">{children}</div>}
    </div>
  );
}
