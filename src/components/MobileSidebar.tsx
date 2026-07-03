import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart3,
  Bell,
  Brain,
  CalendarDays,
  ChevronDown,
  CreditCard,
  Droplets,
  Dumbbell,
  Flag,
  Footprints,
  FileText,
  History,
  Instagram,
  LayoutDashboard,
  Mail,
  Menu,
  NotebookPen,
  PlusCircle,
  Settings,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import { Button, StatusPill } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { getSportModeLabel, isGolfEnabledMode, isTrainingOnlyMode } from "@/lib/sportMode";
import type { AppNotification, OnboardingData } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "golf" | "gym" | "gold" | "pulse";
  adminOnly?: boolean;
};

const mainLinks: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3, tone: "gold" },
  { href: "/athletiai", label: "AthletiAI", icon: Brain, tone: "pulse" },
  { href: "/wellness", label: "Wellness", icon: Droplets, tone: "pulse" },
  { href: "/social", label: "Social", icon: Users, tone: "pulse" },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/memberships", label: "Memberships", icon: CreditCard },
];

const trainingLinks: NavItem[] = [
  { href: "/workouts/submit", label: "Training Console", icon: PlusCircle, tone: "gym" },
  { href: "/fitness/cardio", label: "Cardio", icon: Footprints, tone: "gym" },
  { href: "/workouts", label: "Training Board", icon: Dumbbell, tone: "gym" },
  { href: "/gym/history", label: "Training Logbook", icon: History, tone: "gym" },
];

const golfLinks: NavItem[] = [
  { href: "/golf/submit", label: "Round Scorecard", icon: PlusCircle, tone: "golf" },
  { href: "/golf", label: "Round History", icon: Flag, tone: "golf" },
  { href: "/golf/competitions", label: "Competitions", icon: CalendarDays, tone: "golf" },
  { href: "/golf/practice-plan", label: "Practice Plan", icon: Brain, tone: "golf" },
  { href: "/golf/practice", label: "Log Practice", icon: NotebookPen, tone: "golf" },
  { href: "/golf/practice-history", label: "Practice History", icon: History, tone: "golf" },
];

const supportLinks: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/contact", label: "Contact", icon: Mail },
  { href: "/privacy", label: "Privacy", icon: ShieldCheck },
  { href: "/terms", label: "Terms", icon: FileText },
  { href: "/admin/feedback", label: "Admin Feedback", icon: ShieldCheck, adminOnly: true },
  { href: "/follow", label: "Follow", icon: Instagram },
];

const titles: Record<string, { title: string; section: string }> = {
  "/dashboard": { title: "Command Center", section: "Today" },
  "/analytics": { title: "Performance Report", section: "Analysis" },
  "/athletiai": { title: "AthletiAI", section: "Insight Engine" },
  "/wellness": { title: "Wellness", section: "Recovery" },
  "/social": { title: "Social", section: "Live Activity" },
  "/profile": { title: "Athlete Profile", section: "Account" },
  "/memberships": { title: "Memberships", section: "Billing" },
  "/workouts": { title: "Training Board", section: "Performance Lab" },
  "/workouts/archive": { title: "Archived Splits", section: "Performance Lab" },
  "/workouts/submit": { title: "Training Console", section: "Performance Lab" },
  "/fitness/cardio": { title: "Cardio", section: "Performance Lab" },
  "/gym/history": { title: "Training Logbook", section: "Performance Lab" },
  "/golf": { title: "Round History", section: "Golf" },
  "/golf/submit": { title: "Round Scorecard", section: "Golf" },
  "/golf/competitions": { title: "Competition Planner", section: "Golf Calendar" },
  "/golf/practice-plan": { title: "Practice Plan", section: "AthletiAI" },
  "/golf/practice": { title: "Practice Log", section: "Golf" },
  "/golf/practice-history": { title: "Practice History", section: "Golf" },
  "/settings": { title: "Settings", section: "System" },
  "/contact": { title: "Contact", section: "Support" },
  "/privacy": { title: "Privacy", section: "Trust" },
  "/terms": { title: "Terms", section: "Trust" },
  "/follow": { title: "Follow", section: "Community" },
};

export default function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const [trainingOpen, setTrainingOpen] = useState(true);
  const [golfOpen, setGolfOpen] = useState(true);
  const [sportMode, setSportMode] = useState<OnboardingData["mainSport"]>("both");
  const [role, setRole] = useState("user");
  const [location, navigate] = useLocation();
  const meta = titles[location] ?? { title: "AthletiGolf", section: "Performance" };
  const trainingOnly = isTrainingOnlyMode(sportMode);
  const golfEnabled = isGolfEnabledMode(sportMode);
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

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-white/10 bg-dark text-white lg:flex">
        <NavContent
          trainingOpen={trainingOpen}
          setTrainingOpen={setTrainingOpen}
          golfOpen={golfOpen}
          setGolfOpen={setGolfOpen}
          onClick={() => undefined}
          sportMode={sportMode}
          trainingOnly={trainingOnly}
          golfEnabled={golfEnabled}
          role={role}
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
            <NotificationBell />
            <Button variant="pulse" onClick={() => navigate("/workouts/submit")}>Training</Button>
            {golfEnabled ? (
              <Button variant="golf" onClick={() => navigate("/golf/submit")}>Round</Button>
            ) : (
              <Button variant="secondary" onClick={() => navigate("/wellness")}>Wellness</Button>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <NotificationBell compact />
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
              sportMode={sportMode}
              trainingOnly={trainingOnly}
              golfEnabled={golfEnabled}
              role={role}
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
  sportMode,
  trainingOnly,
  golfEnabled,
  role,
  closeButton,
}: {
  trainingOpen: boolean;
  setTrainingOpen: (value: boolean) => void;
  golfOpen: boolean;
  setGolfOpen: (value: boolean) => void;
  onClick: () => void;
  sportMode: OnboardingData["mainSport"];
  trainingOnly: boolean;
  golfEnabled: boolean;
  role: string;
  closeButton?: React.ReactNode;
}) {
  const visibleMainLinks = trainingOnly
    ? mainLinks.filter((item) => item.href !== "/analytics")
    : mainLinks;
  const visibleSupportLinks = supportLinks.filter((item) => !item.adminOnly || role === "admin");

  return (
    <div className="flex min-h-0 flex-1 flex-col p-5">
      <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-pulse" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pulse">AthletiGolf</p>
          </div>
          <h2 className="mt-2 text-xl font-semibold">Performance Platform</h2>
          <p className="mt-1 text-xs font-semibold text-white/45">{getSportModeLabel(sportMode)}</p>
        </div>
        {closeButton}
      </div>

      <nav className="flex min-h-0 flex-1 flex-col justify-between overflow-y-auto">
        <div className="space-y-5">
          <NavGroup items={visibleMainLinks} onClick={onClick} />
          {golfEnabled && (
            <Dropdown title="Golf" open={golfOpen} setOpen={setGolfOpen}>
              <NavGroup items={golfLinks} onClick={onClick} compact />
            </Dropdown>
          )}
          <Dropdown title="Training" open={trainingOpen} setOpen={setTrainingOpen}>
            <NavGroup items={trainingLinks} onClick={onClick} compact />
          </Dropdown>
        </div>

        <div className="mt-6 space-y-4 border-t border-white/10 pt-4">
          <div className="rounded-2xl border border-pulse/20 bg-pulse/10 p-4">
            <p className="text-sm font-semibold text-pulse">Build the week</p>
            <p className="mt-1 text-sm leading-relaxed text-white/65">
              {trainingOnly
                ? "Log sessions, wellness and nutrition consistently to make training insights sharper."
                : "Log rounds and sessions consistently to make the insights sharper."}
            </p>
          </div>
          <NavGroup items={visibleSupportLinks} onClick={onClick} compact />
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
      : item.tone === "pulse"
      ? "text-cyan-200"
      : item.tone === "gold"
      ? "text-gold"
      : "text-white/75";

  return (
    <Link
      href={item.href}
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

function NotificationBell({ compact = false }: { compact?: boolean }) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;

    refreshNotificationSetting();
    const timer = window.setInterval(() => {
      if (notificationsEnabled) loadNotifications();
    }, 30000);
    const onSettingChanged = (event: Event) => {
      const enabled = (event as CustomEvent<{ enabled?: boolean }>).detail?.enabled === true;
      setNotificationsEnabled(enabled);
      if (enabled) loadNotifications(true);
      else setNotifications([]);
    };
    window.addEventListener("athletigolf:notification-setting-changed", onSettingChanged);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("athletigolf:notification-setting-changed", onSettingChanged);
    };

    async function refreshNotificationSetting() {
      const { data: profile } = await supabase
        .from("profiles")
        .select("notifications_enabled")
        .maybeSingle();
      const enabled = profile?.notifications_enabled === true;
      if (cancelled) return;
      setNotificationsEnabled(enabled);
      if (enabled) await loadNotifications(true);
      else setNotifications([]);
    }
  }, [notificationsEnabled]);

  async function loadNotifications(forceEnabled = false) {
    if (!forceEnabled && !notificationsEnabled) {
      setNotifications([]);
      return;
    }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8);
    setNotifications((data as AppNotification[]) || []);
  }

  async function refreshAndToggleOpen() {
    const nextOpen = !open;
    const { data: profile } = await supabase
      .from("profiles")
      .select("notifications_enabled")
      .maybeSingle();
    const enabled = profile?.notifications_enabled === true;
    setNotificationsEnabled(enabled);
    if (enabled) await loadNotifications(true);
    else setNotifications([]);
    setOpen(nextOpen);
  }

  async function openNotification(notification: AppNotification) {
    if (!notification.read_at) {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notification.id);
    }
    setOpen(false);
    await loadNotifications();
    if (notification.link_path) navigate(notification.link_path);
  }

  async function markAllRead() {
    const unreadIds = notifications.filter((item) => !item.read_at).map((item) => item.id);
    if (!unreadIds.length) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
    await loadNotifications();
  }

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={refreshAndToggleOpen}
        className={`relative inline-flex items-center justify-center rounded-lg border border-line bg-panel text-dark shadow-sm transition hover:border-pulse/35 hover:text-pulse ${
          compact ? "h-11 w-11" : "h-11 w-11"
        }`}
        aria-label="Open notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-panel shadow-2xl">
          <div className="flex items-center justify-between border-b border-line p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Notifications</p>
              <h3 className="font-semibold text-dark">{notificationsEnabled ? `${unreadCount} unread` : "Turned off"}</h3>
            </div>
            {notificationsEnabled ? (
              <button type="button" onClick={markAllRead} className="text-xs font-bold uppercase tracking-[0.12em] text-pulse">
                Mark read
              </button>
            ) : (
              <button type="button" onClick={() => navigate("/settings")} className="text-xs font-bold uppercase tracking-[0.12em] text-pulse">
                Settings
              </button>
            )}
          </div>

          {!notificationsEnabled ? (
            <div className="p-5 text-sm leading-relaxed text-muted">
              Notifications are turned off in Settings.
            </div>
          ) : notifications.length ? (
            <div className="max-h-[420px] overflow-y-auto">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => openNotification(notification)}
                  className={`block w-full border-b border-line p-4 text-left transition last:border-b-0 hover:bg-pulse/8 ${
                    notification.read_at ? "bg-panel" : "bg-pulse/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-dark">{notification.title}</p>
                      {notification.body && <p className="mt-1 text-sm leading-relaxed text-muted">{notification.body}</p>}
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                        {formatNotificationDate(notification.created_at)}
                      </p>
                    </div>
                    {!notification.read_at && <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-pulse" />}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-5 text-sm text-muted">No notifications yet.</div>
          )}
        </div>
      )}
    </div>
  );
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
