import { useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import AppNotificationBell from "@/components/AppNotificationBell";

const appRouteHistoryKey = "athletigolf-app-route-history";
const blockedBackRoutes = new Set(["/", "/auth", "/onboarding"]);

const pageLabels: Array<{ match: RegExp; title: string; eyebrow: string }> = [
  { match: /^\/dashboard$/, title: "Dashboard", eyebrow: "Today" },
  { match: /^\/analytics$/, title: "Analytics", eyebrow: "Activity" },
  { match: /^\/athletiai$/, title: "AthletiAI", eyebrow: "Coach" },
  { match: /^\/wellness$/, title: "Wellness", eyebrow: "Recovery" },
  { match: /^\/fitness\/cardio$/, title: "Cardio", eyebrow: "Activity" },
  { match: /^\/social/, title: "Social", eyebrow: "Community" },
  { match: /^\/activity\/golf$/, title: "Golf", eyebrow: "Activity" },
  { match: /^\/activity\/gym$/, title: "Gym", eyebrow: "Activity" },
  { match: /^\/golf\/submit$/, title: "Start Round", eyebrow: "Quick Add" },
  { match: /^\/golf\/competitions$/, title: "Competitions", eyebrow: "Golf" },
  { match: /^\/golf\/practice$/, title: "Practice", eyebrow: "Golf" },
  { match: /^\/golf\/practice-plan$/, title: "Practice Plan", eyebrow: "Golf" },
  { match: /^\/golf\/practice-history$/, title: "Practice History", eyebrow: "Golf" },
  { match: /^\/golf\/rounds\//, title: "Live Round", eyebrow: "Golf" },
  { match: /^\/golf$/, title: "Round History", eyebrow: "Golf" },
  { match: /^\/workouts\/submit$/, title: "Start Workout", eyebrow: "Quick Add" },
  { match: /^\/workouts\/archive$/, title: "Archived Splits", eyebrow: "Gym" },
  { match: /^\/workouts$/, title: "Training Board", eyebrow: "Gym" },
  { match: /^\/gym\/history$/, title: "Logbook", eyebrow: "Gym" },
  { match: /^\/exercises$/, title: "Exercise Library", eyebrow: "Gym" },
  { match: /^\/exercises\//, title: "Exercise Guide", eyebrow: "Library" },
  { match: /^\/profile$/, title: "Profile", eyebrow: "Account" },
  { match: /^\/settings$/, title: "Settings", eyebrow: "Account" },
  { match: /^\/more$/, title: "More", eyebrow: "Account" },
  { match: /^\/memberships$/, title: "Memberships", eyebrow: "Access" },
  { match: /^\/contact$/, title: "Contact", eyebrow: "Support" },
  { match: /^\/follow$/, title: "Follow", eyebrow: "Community" },
  { match: /^\/privacy$/, title: "Privacy", eyebrow: "Policy" },
  { match: /^\/terms$/, title: "Terms", eyebrow: "Policy" },
  { match: /^\/admin\/feedback$/, title: "Admin Notes", eyebrow: "Admin" },
];

export default function AppHeader() {
  const [location, navigate] = useLocation();
  const label = pageLabels.find((page) => page.match.test(location)) || {
    title: "AthletiGolf",
    eyebrow: "App",
  };

  useEffect(() => {
    if (typeof window === "undefined" || blockedBackRoutes.has(location)) return;

    const storedHistory = readAppRouteHistory();
    const nextHistory = storedHistory[storedHistory.length - 1] === location
      ? storedHistory
      : [...storedHistory, location].slice(-12);

    window.sessionStorage.setItem(appRouteHistoryKey, JSON.stringify(nextHistory));
  }, [location]);

  function handleBack() {
    if (typeof window !== "undefined") {
      const storedHistory = readAppRouteHistory();
      const withoutCurrent = storedHistory.filter((route, index) => {
        const isLastCurrent = index === storedHistory.length - 1 && route === location;
        return !isLastCurrent && !blockedBackRoutes.has(route);
      });
      const previousRoute = [...withoutCurrent].reverse().find((route) => route !== location);

      if (previousRoute) {
        window.sessionStorage.setItem(appRouteHistoryKey, JSON.stringify([...withoutCurrent.filter((route) => route !== previousRoute), previousRoute].slice(-12)));
        navigate(previousRoute);
        return;
      }
    }

    navigate("/dashboard");
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#07111f]/92 px-4 pb-3 pt-[calc(0.8rem+env(safe-area-inset-top))] text-white shadow-[0_16px_42px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-white/86 active:scale-95"
          aria-label="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-pulse">{label.eyebrow}</p>
          <h1 className="truncate text-xl font-semibold tracking-tight">{label.title}</h1>
        </div>
        <AppNotificationBell />
      </div>
    </header>
  );
}

function readAppRouteHistory() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(appRouteHistoryKey) || "[]");
    return Array.isArray(parsed) ? parsed.filter((route): route is string => typeof route === "string") : [];
  } catch {
    return [];
  }
}
