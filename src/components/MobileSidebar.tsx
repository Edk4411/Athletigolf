import { useState } from "react";
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
  Settings,
  User,
  X,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "gold";
};

const mainLinks: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/analytics", label: "Analytics", icon: BarChart3, accent: "gold" },
  { href: "/memberships", label: "Memberships", icon: CreditCard },
];

const gymLinks: NavItem[] = [
  { href: "/workouts", label: "Create Split", icon: Dumbbell },
  { href: "/workouts/submit", label: "Submit Workout", icon: PlusCircle },
  { href: "/gym/history", label: "Workout History", icon: History },
];

const golfLinks: NavItem[] = [
  { href: "/golf/submit", label: "Submit Round", icon: PlusCircle },
  { href: "/golf", label: "Round History", icon: Flag },
  { href: "/golf/practice", label: "Log Practice", icon: NotebookPen },
  { href: "/golf/practice-history", label: "Practice History", icon: History },
];

const supportLinks: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/contact", label: "Contact", icon: Mail },
  { href: "/follow", label: "Follow", icon: Instagram },
];

export default function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const [gymOpen, setGymOpen] = useState(true);
  const [golfOpen, setGolfOpen] = useState(true);

  const closeMenu = () => setOpen(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-5 top-5 z-50 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg transition hover:bg-slate-800"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <button
            onClick={closeMenu}
            className="absolute inset-0 bg-black/50"
            aria-label="Close navigation"
          />

          <aside className="relative ml-auto flex h-full w-88 max-w-[90vw] flex-col bg-slate-950 p-5 text-white shadow-2xl">
            <div className="mb-6 flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[#D4AF37]">
                  AthletiGolf
                </p>
                <h2 className="mt-1 text-xl font-semibold">Performance Hub</h2>
              </div>
              <button
                onClick={closeMenu}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex min-h-0 flex-1 flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <NavGroup items={mainLinks} onClick={closeMenu} />

                <Dropdown title="Gym" open={gymOpen} setOpen={setGymOpen}>
                  <NavGroup items={gymLinks} onClick={closeMenu} compact />
                </Dropdown>

                <Dropdown title="Golf" open={golfOpen} setOpen={setGolfOpen}>
                  <NavGroup items={golfLinks} onClick={closeMenu} compact />
                </Dropdown>
              </div>

              <div className="mt-6 border-t border-white/10 pt-4">
                <NavGroup items={supportLinks} onClick={closeMenu} compact />
              </div>
            </nav>
          </aside>
        </div>
      )}
    </>
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
  const activeClass =
    item.accent === "gold"
      ? "bg-[#D4AF37]/15 text-[#D4AF37]"
      : "bg-white/10 text-white";
  const idleClass =
    item.accent === "gold"
      ? "text-[#D4AF37] hover:bg-[#D4AF37]/10"
      : "text-white/75 hover:bg-white/10 hover:text-white";

  return (
    <Link href={item.href}>
      <a
        onClick={onClick}
        className={`flex items-center gap-3 rounded-2xl px-4 transition ${
          compact ? "py-2.5 text-sm" : "py-3"
        } ${isActive ? activeClass : idleClass}`}
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
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
      >
        <span>{title}</span>
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && <div className="mt-1 space-y-1">{children}</div>}
    </div>
  );
}
