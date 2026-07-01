import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { applyTheme, type AppTheme } from "@/lib/theme";

type SaveState = "idle" | "saving" | "success" | "error";

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function Settings() {
  const [, navigate] = useLocation();

  const [email, setEmail] = useState("");
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
    theme: "light",
    notifications_enabled: false,
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

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      const theme = data.theme === "dark" ? "dark" : "light";
      setProfile({
        full_name: data.full_name || "",
        golf_handicap: data.golf_handicap?.toString() || "",
        height: data.height?.toString() || "",
        weight: data.weight?.toString() || "",
        main_goal: data.main_goal || "",
        distance_unit: data.distance_unit || "yards",
        weight_unit: data.weight_unit || "kg",
        theme,
        notifications_enabled: data.notifications_enabled ?? false,
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
