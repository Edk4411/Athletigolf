import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Copy, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { sportModeLabels, type SportMode } from "@/lib/sportMode";
import { applyTheme, type AppTheme } from "@/lib/theme";
import type { OnboardingData } from "@/lib/types";

type SaveState = "idle" | "saving" | "success" | "error";

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function Settings() {
  const [, navigate] = useLocation();

  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const [profile, setProfile] = useState({
    full_name: "",
    golf_handicap: "",
    height: "",
    weight: "",
    main_goal: "",
    distance_unit: "yards",
    weight_unit: "kg",
    primary_sport: "both" as SportMode,
    theme: "light",
    notifications_enabled: false,
    default_live_visibility: "friends" as "friends" | "private",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      navigate("/auth");
      return;
    }

    setEmail(user.email || "");
    setUserId(user.id);

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      const theme = data.theme === "dark" ? "dark" : "light";
      const existingOnboarding = (data.onboarding_data as OnboardingData | null) || null;
      setOnboardingData(existingOnboarding);
      setProfile({
        full_name: data.full_name || "",
        golf_handicap: data.golf_handicap?.toString() || "",
        height: data.height?.toString() || "",
        weight: data.weight?.toString() || "",
        main_goal: data.main_goal || "",
        distance_unit: data.distance_unit || "yards",
        weight_unit: data.weight_unit || "kg",
        primary_sport: existingOnboarding?.mainSport || "both",
        theme,
        notifications_enabled: data.notifications_enabled ?? false,
        default_live_visibility: existingOnboarding?.privacy?.defaultLiveVisibility || "friends",
      });
      applyTheme(theme);
    }

    setLoading(false);
  }

  async function saveSettings() {
    setSaveState("saving");
    setErrorMessage("");

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      navigate("/auth");
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: profile.full_name || null,
      golf_handicap: profile.golf_handicap ? Number(profile.golf_handicap) : null,
      height: profile.height || null,
      weight: profile.weight || null,
      main_goal: profile.main_goal || null,
      distance_unit: profile.distance_unit,
      weight_unit: profile.weight_unit,
      theme: profile.theme,
      notifications_enabled: profile.notifications_enabled,
      onboarding_data: {
        ...(onboardingData || {}),
        mainSport: profile.primary_sport,
        privacy: {
          ...((onboardingData as OnboardingData | null)?.privacy || {}),
          defaultLiveVisibility: profile.default_live_visibility,
        },
      },
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setSaveState("error");
      setErrorMessage(error.message || "Could not save settings. Please try again.");
    } else {
      setSaveState("success");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/auth");
  }

  function set<K extends keyof typeof profile>(key: K, value: (typeof profile)[K]) {
    setSaveState("idle");
    setProfile((prev) => ({ ...prev, [key]: value }));
    if (key === "theme") applyTheme(value as AppTheme);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream p-8 md:p-12">
        <p className="text-muted">Loading settings...</p>
      </div>
    );
  }

  async function endAllLiveCheckIns() {
    setSaveState("saving");
    setErrorMessage("");
    const { error } = await supabase
      .from("live_activities")
      .update({ ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .is("ended_at", null);

    if (error) {
      setSaveState("error");
      setErrorMessage(error.message || "Could not end live check-ins.");
      return;
    }

    setSaveState("success");
    setTimeout(() => setSaveState("idle"), 3000);
  }

  return (
    <div className="min-h-screen bg-cream p-8 text-ink md:p-12">
      <div className="mx-auto max-w-6xl">

        {/* PAGE HEADER */}
        <div className="mb-12 max-w-3xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-muted">
            Settings
          </p>
          <h1 className="mb-4 text-5xl font-semibold text-dark">
            Manage your AthletiGolf account
          </h1>
          <p className="text-lg leading-relaxed text-muted">
            Control your account, preferences and app experience from one place.
          </p>
        </div>

        <section className="grid gap-6">

          {/* PROFILE */}
          <div className="rounded-xl border border-line bg-panel p-6 shadow-sm">
            <h2 className="mb-2 text-2xl font-semibold text-dark">Profile</h2>
            <p className="mb-6 text-muted">
              Update your name, handicap, goals and personal details.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-muted">Full name</label>
                <input
                  className="rounded-lg border border-line bg-white p-4 text-ink outline-none transition focus:border-pulse/50 focus:ring-4 focus:ring-pulse/10"
                  placeholder="e.g. Jamie Wilson"
                  value={profile.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-muted">Golf handicap</label>
                <input
                  className="rounded-lg border border-line bg-white p-4 text-ink outline-none transition focus:border-pulse/50 focus:ring-4 focus:ring-pulse/10"
                  placeholder="e.g. 12.4"
                  type="number"
                  step="0.1"
                  value={profile.golf_handicap}
                  onChange={(e) => set("golf_handicap", e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-muted">Height</label>
                <input
                  className="rounded-lg border border-line bg-white p-4 text-ink outline-none transition focus:border-pulse/50 focus:ring-4 focus:ring-pulse/10"
                  placeholder="e.g. 180cm"
                  value={profile.height}
                  onChange={(e) => set("height", e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-muted">Weight</label>
                <input
                  className="rounded-lg border border-line bg-white p-4 text-ink outline-none transition focus:border-pulse/50 focus:ring-4 focus:ring-pulse/10"
                  placeholder="e.g. 80kg"
                  value={profile.weight}
                  onChange={(e) => set("weight", e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-sm text-muted">Main goal</label>
                <input
                  className="rounded-lg border border-line bg-white p-4 text-ink outline-none transition focus:border-pulse/50 focus:ring-4 focus:ring-pulse/10"
                  placeholder="e.g. Break 80, Improve strength, Lose 5kg"
                  value={profile.main_goal}
                  onChange={(e) => set("main_goal", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* UNITS */}
          <div className="rounded-xl border border-line bg-panel p-6 shadow-sm">
            <h2 className="mb-2 text-2xl font-semibold text-dark">Units</h2>
            <p className="mb-6 text-muted">
              Switch between yards/metres and kg/lbs.
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-muted">Distance unit</label>
                <select
                  className="rounded-lg border border-line bg-white p-4 text-ink outline-none transition focus:border-pulse/50 focus:ring-4 focus:ring-pulse/10"
                  value={profile.distance_unit}
                  onChange={(e) => set("distance_unit", e.target.value)}
                >
                  <option value="yards">Yards</option>
                  <option value="metres">Metres</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-muted">Weight unit</label>
                <select
                  className="rounded-lg border border-line bg-white p-4 text-ink outline-none transition focus:border-pulse/50 focus:ring-4 focus:ring-pulse/10"
                  value={profile.weight_unit}
                  onChange={(e) => set("weight_unit", e.target.value)}
                >
                  <option value="kg">KG</option>
                  <option value="lbs">LBS</option>
                </select>
              </div>
            </div>
          </div>

          {/* SPORT MODE */}
          <div className="rounded-xl border border-line bg-panel p-6 shadow-sm">
            <h2 className="mb-2 text-2xl font-semibold text-dark">Sport mode</h2>
            <p className="mb-6 text-muted">
              Choose whether AthletiGolf should behave like a golf platform, fitness tracking platform, or full combined setup.
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              {(Object.entries(sportModeLabels) as [SportMode, string][]).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("primary_sport", value)}
                  className={`rounded-xl border p-4 text-left transition ${
                    profile.primary_sport === value
                      ? "border-pulse bg-pulse/10 text-dark"
                      : "border-line bg-white/70 text-muted hover:border-pulse/40 hover:text-dark"
                  }`}
                >
                  <span className="block font-semibold">{label}</span>
                  <span className="mt-1 block text-sm leading-relaxed">
                    {getSportModeDetail(value)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* THEME */}
          <div className="rounded-xl border border-line bg-panel p-6 shadow-sm">
            <h2 className="mb-2 text-2xl font-semibold text-dark">Theme</h2>
            <p className="mb-6 text-muted">
              Customise the look of AthletiGolf.
            </p>

            <div className="flex flex-wrap gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => set("theme", t.value as AppTheme)}
                  className={`rounded-lg border px-5 py-3 text-sm font-semibold transition ${
                    profile.theme === t.value
                      ? "border-dark bg-dark text-white"
                      : "border-line bg-cream text-muted hover:border-pulse/40 hover:text-dark"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* NOTIFICATIONS */}
          <div className="rounded-xl border border-line bg-panel p-6 shadow-sm">
            <h2 className="mb-2 text-2xl font-semibold text-dark">Notifications</h2>
            <p className="mb-6 text-muted">
              Choose whether to receive app reminders and updates.
            </p>

            <label className="flex cursor-pointer items-center gap-4">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={profile.notifications_enabled}
                  onChange={(e) => set("notifications_enabled", e.target.checked)}
                />
                <div
                  className={`h-7 w-12 rounded-full transition-colors duration-200 ${
                    profile.notifications_enabled ? "bg-pulse" : "bg-steel/20"
                  }`}
                />
                <div
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                    profile.notifications_enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </div>
              <span className="font-medium text-dark">
                {profile.notifications_enabled ? "Notifications on" : "Notifications off"}
              </span>
            </label>
          </div>

          {/* PRIVACY */}
          <div className="rounded-xl border border-line bg-panel p-6 shadow-sm">
            <div className="mb-6 flex items-start gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pulse/10 text-pulse">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold text-dark">Privacy & Safety</h2>
                <p className="mt-2 text-muted">
                  Control what friends can see and keep the alpha social features easy to understand.
                </p>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm text-muted">Default live check-in visibility</label>
                  <select
                    className="w-full rounded-lg border border-line bg-white p-4 text-ink outline-none transition focus:border-pulse/50 focus:ring-4 focus:ring-pulse/10"
                    value={profile.default_live_visibility}
                    onChange={(e) => set("default_live_visibility", e.target.value as "friends" | "private")}
                  >
                    <option value="friends">Friends only</option>
                    <option value="private">Private by default</option>
                  </select>
                </div>

                <div className="rounded-xl border border-pulse/20 bg-pulse/8 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Your friend code</p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold text-dark">
                      {userId || "Loading..."}
                    </code>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(userId)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white text-dark transition hover:border-pulse/40"
                      disabled={!userId}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-muted">Only share this with people you want to add.</p>
                </div>

                <button
                  type="button"
                  onClick={endAllLiveCheckIns}
                  className="w-full rounded-lg border border-danger/25 bg-danger/10 px-5 py-3 text-sm font-semibold text-danger transition hover:bg-danger/15"
                >
                  End all live check-ins
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <PrivacyNote title="Golf rounds" detail="Private to your account." />
                <PrivacyNote title="Training logs" detail="Private to your account." />
                <PrivacyNote title="Wellness logs" detail="Private to your account." />
                <PrivacyNote title="Live check-ins" detail="Private or accepted friends only." />
                <div className="rounded-xl border border-line bg-white/70 p-4 md:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Alpha privacy notice</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    AthletiGolf stores your golf, training, wellness and social activity data to power your dashboard.
                    Private logs are not shown to other users. Friends-only live check-ins are visible only to accepted friends.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ONBOARDING */}
          <div className="rounded-xl border border-line bg-panel p-6 shadow-sm">
            <h2 className="mb-2 text-2xl font-semibold text-dark">Setup Profile</h2>
            <p className="mb-6 text-muted">
              Revisit your golf baseline, training setup and starting recommendations.
            </p>

            <button
              type="button"
              onClick={() => navigate("/onboarding")}
              className="rounded-lg bg-pulse px-5 py-3 text-sm font-semibold text-white transition hover:bg-pulse/90"
            >
              Edit Setup Answers
            </button>
          </div>

          {/* ALPHA FEEDBACK */}
          <div className="rounded-xl border border-pulse/20 bg-pulse/8 p-6 shadow-sm">
            <div className="mb-4 flex items-start gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pulse/10 text-pulse">
                <Mail className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold text-dark">Alpha feedback</h2>
                <p className="mt-2 text-muted">
                  Found a bug, confusing screen, or missing feature? Send it while it is fresh.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <p className="text-sm leading-relaxed text-muted">
                Ask testers to include what they were trying to do, what happened, and whether they were on mobile or laptop.
              </p>
              <button
                type="button"
                onClick={() => navigate("/contact")}
                className="rounded-lg bg-pulse px-5 py-3 text-sm font-semibold text-white transition hover:bg-pulse/90"
              >
                Send Feedback
              </button>
            </div>
          </div>

        </section>

        {/* ACCOUNT CONTROLS */}
        <section className="mt-10 rounded-xl bg-dark p-8 text-white shadow-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#D4AF37]">
            Account
          </p>

          <h2 className="mb-4 text-3xl font-semibold">Account controls</h2>

          <p className="mb-1 text-white/60">Signed in as:</p>
          <p className="mb-6 font-semibold">{email}</p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={saveSettings}
              disabled={saveState === "saving"}
              className="min-w-[152px] rounded-lg bg-white px-6 py-4 font-semibold text-slate-950 transition hover:bg-white/90 disabled:opacity-50"
            >
              {saveState === "saving" ? "Saving..." : "Save Settings"}
            </button>

            <button
              onClick={handleLogout}
              className="rounded-lg bg-white/10 px-6 py-4 font-semibold text-white transition hover:bg-white/15"
            >
              Log Out
            </button>
          </div>

          {saveState === "success" && (
            <p className="mt-5 flex items-center gap-2 text-sm font-medium text-emerald-400">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              Settings saved successfully.
            </p>
          )}

          {saveState === "error" && (
            <p className="mt-5 flex items-center gap-2 text-sm font-medium text-red-400">
              <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
              {errorMessage}
            </p>
          )}
        </section>

      </div>
    </div>
  );
}

function PrivacyNote({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/70 p-4">
      <h3 className="font-semibold text-dark">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{detail}</p>
    </div>
  );
}

function getSportModeDetail(mode: SportMode) {
  if (mode === "training") return "Hide golf clutter and focus the app around fitness tracking, wellness, nutrition and social performance.";
  if (mode === "golf") return "Prioritise golf tracking, practice, competitions and golf-specific reports.";
  if (mode === "other") return "Use AthletiGolf as a general athletic performance platform while future sport modules grow.";
  return "Use the full golf, fitness tracking, wellness and AthletiAI relationship view.";
}
