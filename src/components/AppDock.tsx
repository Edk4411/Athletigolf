import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  BarChart3,
  Brain,
  Droplets,
  Dumbbell,
  Flag,
  Footprints,
  Home,
  MoreHorizontal,
  NotebookPen,
  Plus,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isGolfEnabledMode } from "@/lib/sportMode";
import type { OnboardingData } from "@/lib/types";

type DockMenu = "activity" | "create" | null;
type AppDockItem = {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "golf" | "gym" | "pulse" | "gold" | "danger";
  adminOnly?: boolean;
};

const activityItems: AppDockItem[] = [
  { label: "Golf", href: "/activity/golf", icon: Flag, tone: "golf" },
  { label: "Gym", href: "/activity/gym", icon: Dumbbell, tone: "gym" },
  { label: "Wellness", href: "/wellness", icon: Droplets, tone: "pulse" },
  { label: "Cardio", href: "/fitness/cardio", icon: Footprints, tone: "gym" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, tone: "gold" },
  { label: "AthletiAI", href: "/athletiai", icon: Brain, tone: "pulse" },
];

const createItems: AppDockItem[] = [
  { label: "Start Round", href: "/golf/submit", icon: Flag, tone: "golf" },
  { label: "Start Workout", href: "/workouts/submit", icon: Dumbbell, tone: "gym" },
  { label: "Practice", href: "/golf/practice", icon: NotebookPen, tone: "golf" },
  { label: "Meal", href: "/wellness", icon: Droplets, tone: "pulse" },
  { label: "Cardio", href: "/fitness/cardio", icon: Footprints, tone: "gym" },
];

export default function AppDock() {
  const [location, navigate] = useLocation();
  const [menu, setMenu] = useState<DockMenu>(null);
  const [sportMode, setSportMode] = useState<OnboardingData["mainSport"]>("both");
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
    () => activityItems.filter((item) => item.label !== "Golf" || golfEnabled),
    [golfEnabled]
  );

  const filteredCreateItems = useMemo(
    () => createItems.filter((item) => golfEnabled || !["Start Round", "Practice"].includes(item.label)),
    [golfEnabled]
  );

  function closeMenu() {
    setMenu(null);
  }

  function openMenu(nextMenu: DockMenu) {
    setMenu((current) => (current === nextMenu ? null : nextMenu));
  }

  function goTo(href: string) {
    closeMenu();
    navigate(href);
  }

  return (
    <>
      {menu ? (
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

          <div className="pointer-events-none absolute inset-x-0 bottom-[calc(6.2rem+env(safe-area-inset-bottom))] mx-auto flex max-w-[390px] flex-col items-center px-4">
            <p className="pointer-events-auto mb-4 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/72">
              {menu === "activity" ? "Activity" : "Quick Add"}
            </p>

            <div className="pointer-events-auto relative mx-auto h-[15.5rem] w-20">
              {(menu === "activity" ? filteredActivityItems : filteredCreateItems).map((item, index, items) => (
                <ArcButton
                  key={item.label}
                  item={item}
                  index={index}
                  total={items.length}
                  menu={menu}
                  onClick={() => item.href && goTo(item.href)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/12 bg-[#07111f]/96 px-3 pb-[calc(0.6rem+env(safe-area-inset-bottom))] pt-2 text-white shadow-[0_-18px_60px_rgba(0,0,0,0.34)] backdrop-blur-xl">
        <div className="grid grid-cols-5 items-center gap-1">
          <DockButton label="Dashboard" icon={Home} active={location === "/dashboard"} onClick={() => goTo("/dashboard")} />
          <DockButton label="Activity" icon={Activity} active={menu === "activity" || location.startsWith("/activity")} onClick={() => openMenu("activity")} />
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
          <DockButton label="More" icon={MoreHorizontal} active={location === "/more"} onClick={() => goTo("/more")} />
        </div>
      </nav>
    </>
  );
}

function ArcButton({
  item,
  index,
  total,
  menu,
  active,
  onClick,
}: {
  item: AppDockItem;
  index: number;
  total: number;
  menu: DockMenu;
  active?: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  const spread = total <= 1 ? 0 : Math.min(menu === "activity" ? 176 : 164, Math.max(108, total * 28));
  const angle = total === 1 ? 90 : 90 + spread / 2 - (index * spread) / (total - 1);
  const radius = menu === "activity" ? 112 : 106;
  const top = "12rem";
  const x = Math.cos((angle * Math.PI) / 180) * radius;
  const y = -Math.sin((angle * Math.PI) / 180) * radius;

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute left-1/2 flex w-[4.9rem] -translate-x-1/2 flex-col items-center gap-1.5 text-center transition active:scale-95"
      style={{
  left: "50%",
  top,
  transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`
}}
    >
      <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border text-white shadow-xl ${toneClass(item.tone, active)}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-[10px] font-bold leading-tight text-white drop-shadow">{item.label}</span>
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
