import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  BarChart3,
  Brain,
  CalendarDays,
  CreditCard,
  Droplets,
  Dumbbell,
  Flag,
  Footprints,
  HeartPulse,
  Home,
  Instagram,
  Mail,
  MoreHorizontal,
  NotebookPen,
  Plus,
  Settings,
  ShieldCheck,
  Trophy,
  User,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isGolfEnabledMode } from "@/lib/sportMode";
import type { OnboardingData } from "@/lib/types";

type DockMenu = "activity" | "create" | "more" | null;
type AppDockItem = {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "golf" | "gym" | "pulse" | "gold" | "danger";
  group?: "golf" | "gym";
  adminOnly?: boolean;
};

const activityItems: AppDockItem[] = [
  { label: "Golf", icon: Flag, tone: "golf", group: "golf" },
  { label: "Gym", icon: Dumbbell, tone: "gym", group: "gym" },
  { label: "Wellness", href: "/wellness", icon: Droplets, tone: "pulse" },
  { label: "Cardio", href: "/fitness/cardio", icon: Footprints, tone: "gym" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, tone: "gold" },
  { label: "AthletiAI", href: "/athletiai", icon: Brain, tone: "pulse" },
];

const golfGroupItems: AppDockItem[] = [
  { label: "Round History", href: "/golf", icon: Flag, tone: "golf" },
  { label: "Competitions", href: "/golf/competitions", icon: Trophy, tone: "golf" },
  { label: "Practice History", href: "/golf/practice-history", icon: NotebookPen, tone: "golf" },
  { label: "Practice Plan", href: "/golf/practice-plan", icon: Brain, tone: "golf" },
];

const gymGroupItems: AppDockItem[] = [
  { label: "Training Board", href: "/workouts", icon: Dumbbell, tone: "gym" },
  { label: "Logbook", href: "/gym/history", icon: CalendarDays, tone: "gym" },
  { label: "Submit Workout", href: "/workouts/submit", icon: HeartPulse, tone: "gym" },
];

const createItems: AppDockItem[] = [
  { label: "Round", href: "/golf/submit", icon: Flag, tone: "golf" },
  { label: "Workout", href: "/workouts/submit", icon: Dumbbell, tone: "gym" },
  { label: "Practice", href: "/golf/practice", icon: NotebookPen, tone: "golf" },
  { label: "Meal", href: "/wellness", icon: Droplets, tone: "pulse" },
  { label: "Cardio", href: "/fitness/cardio", icon: Footprints, tone: "gym" },
];

const moreItems: AppDockItem[] = [
  { label: "Profile", href: "/profile", icon: User, tone: "pulse" },
  { label: "Settings", href: "/settings", icon: Settings, tone: "pulse" },
  { label: "Memberships", href: "/memberships", icon: CreditCard, tone: "gold" },
  { label: "Contact", href: "/contact", icon: Mail, tone: "pulse" },
  { label: "Follow", href: "/follow", icon: Instagram, tone: "pulse" },
  { label: "Privacy", href: "/privacy", icon: ShieldCheck, tone: "pulse" },
  { label: "Terms", href: "/terms", icon: ShieldCheck, tone: "pulse" },
  { label: "Admin", href: "/admin/feedback", icon: ShieldCheck, tone: "danger", adminOnly: true },
];

export default function AppDock() {
  const [location, navigate] = useLocation();
  const [menu, setMenu] = useState<DockMenu>(null);
  const [activeGroup, setActiveGroup] = useState<"golf" | "gym" | null>(null);
  const [sportMode, setSportMode] = useState<OnboardingData["mainSport"]>("both");
  const [role, setRole] = useState("user");
  const golfEnabled = isGolfEnabledMode(sportMode);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("profiles")
      .select("onboarding_data, role")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const onboarding = (data?.onboarding_data as OnboardingData | null) || null;
        setSportMode(onboarding?.mainSport || "both");
        setRole(data?.role || "user");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const filteredActivityItems = useMemo(
    () => activityItems.filter((item) => item.group !== "golf" || golfEnabled),
    [golfEnabled]
  );

  const filteredCreateItems = useMemo(
    () => createItems.filter((item) => golfEnabled || !["Round", "Practice"].includes(item.label)),
    [golfEnabled]
  );

  const filteredMoreItems = useMemo(
    () => moreItems.filter((item) => !item.adminOnly || role === "admin"),
    [role]
  );

  function closeMenu() {
    setMenu(null);
    setActiveGroup(null);
  }

  function openMenu(nextMenu: DockMenu) {
    setActiveGroup(null);
    setMenu((current) => (current === nextMenu ? null : nextMenu));
  }

  function goTo(href: string) {
    closeMenu();
    navigate(href);
  }

  function handleArcItem(item: AppDockItem) {
    const group = item.group;
    if (group) {
      setActiveGroup((current) => (current === group ? null : group));
      return;
    }
    if (item.href) goTo(item.href);
  }

  const groupItems = activeGroup === "golf" ? golfGroupItems : activeGroup === "gym" ? gymGroupItems : [];

  return (
    <>
      {menu && (
        <div className="fixed inset-0 z-50 bg-[radial-gradient(circle_at_50%_82%,rgba(19,200,203,0.22),transparent_34%),linear-gradient(180deg,rgba(10,56,92,0.94),rgba(4,16,32,0.96))] text-white backdrop-blur-md">
          <button
            type="button"
            onClick={closeMenu}
            className="absolute right-5 top-[calc(1.25rem+env(safe-area-inset-top))] inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white shadow-xl"
            aria-label="Close app menu"
          >
            <X className="h-6 w-6" />
          </button>

          <button type="button" aria-label="Close menu backdrop" className="absolute inset-0" onClick={closeMenu} />

          <div className="pointer-events-none absolute inset-x-0 bottom-[calc(6.4rem+env(safe-area-inset-bottom))] mx-auto flex max-w-[420px] flex-col items-center px-5">
            <p className="pointer-events-auto mb-4 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/72">
              {menu === "activity" ? "Activity" : menu === "create" ? "Quick Add" : "More"}
            </p>

            {menu === "activity" && activeGroup && (
              <div className="pointer-events-auto mb-5 w-full rounded-[2rem] border border-white/15 bg-white/12 p-3 shadow-2xl backdrop-blur">
                <div className="mb-2 flex items-center justify-between px-2">
                  <p className="text-sm font-bold">{activeGroup === "golf" ? "Golf" : "Gym"}</p>
                  <button type="button" onClick={() => setActiveGroup(null)} className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">
                    Back
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {groupItems.map((item) => (
                    <StackedMenuButton key={item.label} item={item} onClick={() => item.href && goTo(item.href)} />
                  ))}
                </div>
              </div>
            )}

            <div className="pointer-events-auto relative h-[15.5rem] w-full">
              {(menu === "activity" ? filteredActivityItems : menu === "create" ? filteredCreateItems : filteredMoreItems).map((item, index, items) => (
                <ArcButton
                  key={item.label}
                  item={item}
                  index={index}
                  total={items.length}
                  active={activeGroup === item.group}
                  onClick={() => (menu === "activity" ? handleArcItem(item) : item.href && goTo(item.href))}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-3 bottom-[calc(0.7rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-[430px] rounded-[2rem] border border-white/16 bg-[#07111f]/94 px-3 py-2 text-white shadow-[0_22px_70px_rgba(0,0,0,0.36)] backdrop-blur-xl">
        <div className="grid grid-cols-5 items-center gap-1">
          <DockButton label="Dashboard" icon={Home} active={location === "/dashboard"} onClick={() => goTo("/dashboard")} />
          <DockButton label="Activity" icon={Activity} active={menu === "activity"} onClick={() => openMenu("activity")} />
          <button
            type="button"
            onClick={() => openMenu("create")}
            className="mx-auto -mt-8 flex h-16 w-16 flex-col items-center justify-center rounded-full border border-white/20 bg-pulse text-dark shadow-[0_18px_42px_rgba(19,200,203,0.36)] transition active:scale-95"
            aria-label="Open quick add"
          >
            <Plus className="h-7 w-7" />
            <span className="sr-only">Add</span>
          </button>
          <DockButton label="Social" icon={Users} active={location === "/social"} onClick={() => goTo("/social")} />
          <DockButton label="More" icon={MoreHorizontal} active={menu === "more"} onClick={() => openMenu("more")} />
        </div>
      </nav>
    </>
  );
}

function ArcButton({
  item,
  index,
  total,
  active,
  onClick,
}: {
  item: AppDockItem;
  index: number;
  total: number;
  active?: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  const angle = total === 1 ? 90 : 168 - (index * 156) / (total - 1);
  const radius = total > 6 ? 116 : 104;
  const x = Math.cos((angle * Math.PI) / 180) * radius;
  const y = -Math.sin((angle * Math.PI) / 180) * radius;

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute left-1/2 top-[11.3rem] flex w-[5.3rem] -translate-x-1/2 flex-col items-center gap-2 text-center transition active:scale-95"
      style={{ transform: `translate(calc(-50% + ${x}px), ${y}px)` }}
    >
      <span className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl border text-white shadow-xl ${toneClass(item.tone, active)}`}>
        <Icon className="h-6 w-6" />
      </span>
      <span className="text-[11px] font-bold leading-tight text-white drop-shadow">{item.label}</span>
    </button>
  );
}

function StackedMenuButton({ item, onClick }: { item: AppDockItem; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3 text-left transition active:scale-[0.98]"
    >
      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${toneClass(item.tone)}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-sm font-bold leading-tight text-white">{item.label}</span>
    </button>
  );
}

function DockButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-bold transition ${
        active ? "bg-white/12 text-pulse" : "text-white/58 active:text-white"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function toneClass(tone: AppDockItem["tone"], active = false) {
  if (active) return "border-white/40 bg-white/24 text-white";
  if (tone === "golf") return "border-emerald-200/25 bg-emerald-400/20 text-emerald-100";
  if (tone === "gym") return "border-sky-200/25 bg-sky-400/20 text-sky-100";
  if (tone === "gold") return "border-gold/30 bg-gold/20 text-gold";
  if (tone === "danger") return "border-danger/35 bg-danger/20 text-red-100";
  return "border-pulse/30 bg-pulse/20 text-cyan-100";
}
