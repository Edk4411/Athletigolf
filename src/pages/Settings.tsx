import { getDisplayName } from "@/lib/nameFormatting";
import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { ChevronDown, Copy, Database, Mail, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { sportModeLabels, type SportMode } from "@/lib/sportMode";
import { applyTheme, type AppTheme } from "@/lib/theme";
import type { OnboardingData, WellnessTrackingPreferences } from "@/lib/types";
import { isValidUsername, normalizeUsername, usernameRules } from "@/lib/usernames";
import { defaultWellnessSetup, defaultWellnessTracking } from "@/lib/wellnessTargets";

type SaveState = "idle" | "saving" | "success" | "error";
type SettingsSection =
  | "account"
  | "profile"
  | "sportMode"
  | "units"
  | "appearance"
  | "notifications"
  | "privacy"
  | "connectedAccounts"
  | "about"
  | "dangerZone";

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const visibleSportModes: [SportMode, string][] = [
  ["both", sportModeLabels.both],
  ["golf", sportModeLabels.golf],
  ["training", sportModeLabels.training],
];

const wellnessTrackingOptions: Array<{ key: keyof WellnessTrackingPreferences; label: string; detail: string }> = [
  { key: "food", label: "Food", detail: "Food, meals and macro tracking." },
  { key: "water", label: "Water", detail: "Hydration targets and quick logging." },
  { key: "sleep", label: "Sleep", detail: "Sleep, energy and recovery notes." },
  { key: "body", label: "Body composition", detail: "Weight and body-composition signals." },
  { key: "heartRate", label: "Heart rate", detail: "Manual resting heart-rate tracking." },
  { key: "bloodPressure", label: "Blood pressure", detail: "Manual blood-pressure records." },
];

export default function Settings() {
  const [, navigate] = useLocation();

  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [dataRequestState, setDataRequestState] = useState<SaveState>("idle");
  const [dataRequestMessage, setDataRequestMessage] = useState("");
  const [closingAccount, setClosingAccount] = useState(false);
  const [openSection, setOpenSection] = useState<SettingsSection>("account");

  const [profile, setProfile] = useState({
    full_name: "",
    username: "",
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
    show_display_name_in_search: false,
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
        username: data.username || existingOnboarding?.social?.username || "",
        golf_handicap: data.golf_handicap?.toString() || "",
        height: data.height?.toString() || "",
        weight: data.weight?.toString() || "",
        main_goal: data.main_goal || "",
        distance_unit: data.distance_unit || "yards",
        weight_unit: data.weight_unit || "kg",
        primary_sport: existingOnboarding?.mainSport === "other" ? "both" : existingOnboarding?.mainSport || "both",
        theme,
        notifications_enabled: data.notifications_enabled ?? false,
        default_live_visibility: existingOnboarding?.privacy?.defaultLiveVisibility || "friends",
        show_display_name_in_search:
          data.show_display_name_in_search ?? existingOnboarding?.social?.showDisplayNameInSearch ?? false,
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

    const cleanUsername = normalizeUsername(profile.username);
    if (!isValidUsername(cleanUsername)) {
      setSaveState("error");
      setErrorMessage(usernameRules);
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: profile.full_name || null,
      username: cleanUsername,
      username_search: cleanUsername,
      show_display_name_in_search: profile.show_display_name_in_search,
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
          notificationsEnabled: profile.notifications_enabled,
        },
        social: {
          ...((onboardingData as OnboardingData | null)?.social || {}),
          username: cleanUsername,
          showDisplayNameInSearch: profile.show_display_name_in_search,
        },
      },
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setSaveState("error");
      setErrorMessage(error.message.includes("username") ? "That username is taken. Try another one." : error.message || "Could not save settings. Please try again.");
    } else {
      window.dispatchEvent(new CustomEvent("athletigolf:notification-setting-changed", {
        detail: { enabled: profile.notifications_enabled },
      }));
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

  const currentWellnessTracking = {
    ...defaultWellnessTracking,
    ...(onboardingData?.wellness?.tracking || {}),
  };

  function updateWellnessTracking(key: keyof WellnessTrackingPreferences, checked: boolean) {
    setSaveState("idle");
    setOnboardingData((prev) => {
      const base: OnboardingData = prev || {
        mainSport: profile.primary_sport,
        fullName: profile.full_name,
        mainGoal: profile.main_goal,
        golf: {
          homeCourse: "",
          handicap: profile.golf_handicap,
          scoringGoal: "",
          biggestWeakness: "",
          practiceAvailability: "",
          upcomingCompetition: "",
        },
        training: {
          experience: "",
          daysAvailable: "",
          sessionLength: "",
          equipment: "",
          goal: "",
          injuries: "",
          restDays: [],
        },
        privacy: {
          defaultLiveVisibility: profile.default_live_visibility,
          notificationsEnabled: profile.notifications_enabled,
        },
        social: {
          username: profile.username,
          showDisplayNameInSearch: profile.show_display_name_in_search,
        },
        wellness: defaultWellnessSetup,
      };

      return {
        ...base,
        wellness: {
          ...defaultWellnessSetup,
          ...(base.wellness || {}),
          tracking: {
            ...defaultWellnessTracking,
            ...(base.wellness?.tracking || {}),
            [key]: checked,
          },
        },
      };
    });
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

  async function requestAccountDataExport() {
    setDataRequestState("saving");
    setDataRequestMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const title = "Account data export request";
    const { error } = await supabase.from("feedback_reports").insert({
      user_id: user.id,
      category: "other",
      title,
      message: `${title} from ${user.email || "unknown email"} (${user.id}). Please verify identity before actioning.`,
      page_url: "/settings",
      device_context: navigator.userAgent,
      status: "new",
    });

    if (error) {
      setDataRequestState("error");
      setDataRequestMessage(error.message || "Could not send the request. Please use Contact instead.");
      return;
    }

    setDataRequestState("success");
    setDataRequestMessage("Export request sent.");
    setTimeout(() => setDataRequestState("idle"), 5000);
  }

  async function closeAccount() {
    const confirmed = window.confirm(
      "Close your AthletiGolf account? This removes your app data and signs you out. You can sign up again with the same email once Supabase deletes the auth account."
    );
    if (!confirmed) return;

    setClosingAccount(true);
    setDataRequestState("saving");
    setDataRequestMessage("");

    const { error } = await supabase.functions.invoke("delete-account");
    if (error) {
      setClosingAccount(false);
      setDataRequestState("error");
      setDataRequestMessage(error.message || "Could not close the account. Check the delete-account Edge Function is deployed.");
      return;
    }

    await supabase.auth.signOut();
    navigate("/auth");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-cream px-4 py-5 pb-28 text-ink sm:px-6 md:p-12 md:pb-12">
      <div className="mx-auto max-w-4xl min-w-0">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-pulse">Account</p>
          <h1 className="mt-3 text-3xl font-black text-dark sm:text-4xl">Settings</h1>
          <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
            Manage your profile, sport mode, privacy, app preferences and account controls from one clean place.
          </p>
        </div>

        <div className="space-y-4">
          <SettingsAccordionItem
            id="account"
            title="Account"
            description="Save changes, view your signed-in email and log out."
            openSection={openSection}
            onOpen={setOpenSection}
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-line bg-white/70 p-4 dark:bg-slate-950/35">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted">Signed in as</p>
                <p className="mt-2 break-words text-lg font-black text-dark">{email || "AthletiGolf user"}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={saveSettings}
                  disabled={saveState === "saving"}
                  className="rounded-2xl bg-pulse px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-pulse/90 disabled:opacity-60"
                >
                  {saveState === "saving" ? "Saving..." : "Save settings"}
                </button>
                <button
                  onClick={handleLogout}
                  className="rounded-2xl border border-line bg-white px-5 py-3 text-sm font-black text-dark transition hover:bg-cream dark:bg-slate-950/35"
                >
                  Log out
                </button>
              </div>

              {saveState === "success" && <p className="rounded-2xl border border-lab/30 bg-lab/10 px-4 py-3 text-sm font-bold text-lab">Settings saved successfully.</p>}
              {saveState === "error" && errorMessage && <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-bold text-danger">{errorMessage}</p>}
            </div>
          </SettingsAccordionItem>

          <SettingsAccordionItem
            id="profile"
            title="Profile"
            description="Your name, username, handicap, goals and wellness modules."
            openSection={openSection}
            onOpen={setOpenSection}
          >
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-bold text-dark">
                  Full name
                  <input
                    value={profile.full_name}
                    onChange={(e) => set("full_name", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-dark outline-none focus:border-pulse dark:bg-slate-950/35"
                    placeholder="Your name"
                  />
                </label>
                <label className="block text-sm font-bold text-dark">
                  Username
                  <input
                    value={profile.username}
                    onChange={(e) => set("username", normalizeUsername(e.target.value))}
                    className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-dark outline-none focus:border-pulse dark:bg-slate-950/35"
                    placeholder="yourusername"
                  />
                  <span className="mt-2 block text-xs font-medium text-muted">{usernameRules}</span>
                </label>
                <label className="block text-sm font-bold text-dark">
                  Golf handicap
                  <input
                    value={profile.golf_handicap}
                    onChange={(e) => set("golf_handicap", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-dark outline-none focus:border-pulse dark:bg-slate-950/35"
                    placeholder="e.g. 12.4"
                  />
                </label>
                <label className="block text-sm font-bold text-dark">
                  Main goal
                  <input
                    value={profile.main_goal}
                    onChange={(e) => set("main_goal", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-dark outline-none focus:border-pulse dark:bg-slate-950/35"
                    placeholder="e.g. Lower scores, get stronger"
                  />
                </label>
                <label className="block text-sm font-bold text-dark">
                  Height
                  <input
                    value={profile.height}
                    onChange={(e) => set("height", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-dark outline-none focus:border-pulse dark:bg-slate-950/35"
                    placeholder="e.g. 180cm"
                  />
                </label>
                <label className="block text-sm font-bold text-dark">
                  Weight
                  <input
                    value={profile.weight}
                    onChange={(e) => set("weight", e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-dark outline-none focus:border-pulse dark:bg-slate-950/35"
                    placeholder="e.g. 75kg"
                  />
                </label>
              </div>

              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.22em] text-muted">Wellness modules</h3>
                <p className="mt-2 text-sm leading-6 text-muted">Choose what appears in Wellness and onboarding.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {wellnessTrackingOptions.map((option) => {
                    const enabled = currentWellnessTracking[option.key];
                    return (
                      <label
                        key={option.key}
                        className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-white/70 p-4 transition hover:border-pulse/40 dark:bg-slate-950/35"
                      >
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(e) => updateWellnessTracking(option.key, e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-line text-pulse focus:ring-pulse"
                        />
                        <span>
                          <span className="block text-sm font-black text-dark">{option.label}</span>
                          <span className="mt-1 block text-xs leading-5 text-muted">{option.detail}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </SettingsAccordionItem>

          <SettingsAccordionItem
            id="sportMode"
            title="Sport Mode"
            description="Choose whether the app is golf-first, gym-first, or tracks everything."
            openSection={openSection}
            onOpen={setOpenSection}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {visibleSportModes.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set("primary_sport", value)}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    profile.primary_sport === value
                      ? "border-pulse bg-pulse text-white shadow-sm"
                      : "border-line bg-white text-dark hover:border-pulse/40 dark:bg-slate-950/35"
                  }`}
                >
                  <span className="block text-sm font-black">{label}</span>
                  <span className={`mt-2 block text-xs leading-5 ${profile.primary_sport === value ? "text-white/80" : "text-muted"}`}>
                    {getSportModeDetail(value)}
                  </span>
                </button>
              ))}
            </div>
          </SettingsAccordionItem>

          <SettingsAccordionItem
            id="units"
            title="Units"
            description="Set your preferred distance and body-weight units."
            openSection={openSection}
            onOpen={setOpenSection}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-dark">
                Distance unit
                <select
                  value={profile.distance_unit}
                  onChange={(e) => set("distance_unit", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-dark outline-none focus:border-pulse dark:bg-slate-950/35"
                >
                  <option value="yards">Yards</option>
                  <option value="metres">Metres</option>
                </select>
              </label>
              <label className="block text-sm font-bold text-dark">
                Weight unit
                <select
                  value={profile.weight_unit}
                  onChange={(e) => set("weight_unit", e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-dark outline-none focus:border-pulse dark:bg-slate-950/35"
                >
                  <option value="kg">kg</option>
                  <option value="lbs">LBS</option>
                </select>
              </label>
            </div>
          </SettingsAccordionItem>

          <SettingsAccordionItem
            id="appearance"
            title="Appearance"
            description="Switch between light and dark mode."
            openSection={openSection}
            onOpen={setOpenSection}
          >
            <div className="flex flex-wrap gap-3">
              {THEMES.map((theme) => (
                <button
                  key={theme.value}
                  type="button"
                  onClick={() => set("theme", theme.value as AppTheme)}
                  className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
                    profile.theme === theme.value
                      ? "bg-dark text-white shadow-sm"
                      : "border border-line bg-white text-dark hover:border-pulse/40 dark:bg-slate-950/35"
                  }`}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </SettingsAccordionItem>

          <SettingsAccordionItem
            id="notifications"
            title="Notifications"
            description="Control whether the bell and in-app notifications are active."
            openSection={openSection}
            onOpen={setOpenSection}
          >
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-line bg-white/70 p-4 dark:bg-slate-950/35">
              <span>
                <span className="block text-sm font-black text-dark">Enable notifications</span>
                <span className="mt-1 block text-xs leading-5 text-muted">When this is off, the bell tells you notifications are disabled.</span>
              </span>
              <input
                type="checkbox"
                checked={profile.notifications_enabled}
                onChange={(e) => set("notifications_enabled", e.target.checked)}
                className="h-5 w-5 rounded border-line text-pulse focus:ring-pulse"
              />
            </label>
          </SettingsAccordionItem>

          <SettingsAccordionItem
            id="privacy"
            title="Privacy"
            description="Live visibility, discovery, friend codes and safety controls."
            openSection={openSection}
            onOpen={setOpenSection}
          >
            <div className="space-y-5">
              <label className="block text-sm font-bold text-dark">
                Default live visibility
                <select
                  value={profile.default_live_visibility}
                  onChange={(e) => set("default_live_visibility", e.target.value as "friends" | "private")}
                  className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-dark outline-none focus:border-pulse dark:bg-slate-950/35"
                >
                  <option value="friends">Friends</option>
                  <option value="private">Private</option>
                </select>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-white/70 p-4 dark:bg-slate-950/35">
                <input
                  type="checkbox"
                  checked={profile.show_display_name_in_search}
                  onChange={(e) => set("show_display_name_in_search", e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-line text-pulse focus:ring-pulse"
                />
                <span>
                  <span className="block text-sm font-black text-dark">Show my display name in friend search</span>
                  <span className="mt-1 block text-xs leading-5 text-muted">People can still search your username either way.</span>
                </span>
              </label>

              <div className="rounded-2xl border border-line bg-white/70 p-4 dark:bg-slate-950/35">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted">Username</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold text-dark">{getDisplayName(profile as any)}</h2>
                  <p className="break-all text-sm font-medium text-muted">@{profile.username || "set-a-username"}</p>

                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(profile.username || "")}
                    className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-2 text-sm font-black text-dark transition hover:border-pulse/40 dark:bg-slate-950/35"
                  >
                    <Copy className="h-4 w-4" /> Copy
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={endAllLiveCheckIns}
                  className="rounded-2xl border border-line bg-white px-5 py-3 text-sm font-black text-dark transition hover:border-pulse/40 dark:bg-slate-950/35"
                >
                  End all live check-ins
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/privacy")}
                  className="rounded-2xl border border-line bg-white px-5 py-3 text-sm font-black text-dark transition hover:border-pulse/40 dark:bg-slate-950/35"
                >
                  Privacy policy
                </button>
              </div>

              <PrivacyNote
                icon={<ShieldCheck className="h-5 w-5 text-pulse" />}
                title="Friends-only by default"
                body="Live activity, friend search and shared round data use the privacy controls you choose here."
              />

            </div>
          </SettingsAccordionItem>

          <SettingsAccordionItem
            id="connectedAccounts"
            title="Connected Apps"
            description="Manage your connected services."
            openSection={openSection}
            onOpen={setOpenSection}
          >
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => navigate("/connected-apps")}
                className="w-full rounded-2xl border border-pulse bg-pulse px-5 py-3 text-left text-sm font-black text-white transition hover:bg-pulse/90"
              >
                Manage Connections
              </button>
              <PrivacyNote
                icon={<Database className="h-5 w-5 text-pulse" />}
                title="Food databases"
                body="USDA FoodData Central and Open Food Facts are used for nutrition search where configured. Serving sizes should be checked before saving."
              />
              <PrivacyNote
                icon={<Database className="h-5 w-5 text-pulse" />}
                title="Strava"
                body="Connected Strava activity is private to the connected user and is not used for cross-user analytics or AthletiAI training."
              />
              <PrivacyNote
                icon={<ShieldCheck className="h-5 w-5 text-pulse" />}
                title="Beta readiness"
                body="Third-party data is shown with clear source context. Full production launch should keep API keys in server-side secrets only."
              />
            </div>
          </SettingsAccordionItem>

          <SettingsAccordionItem
            id="about"
            title="About"
            description="Support, legal pages and alpha feedback."
            openSection={openSection}
            onOpen={setOpenSection}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="rounded-2xl border border-line bg-white px-5 py-3 text-left text-sm font-black text-dark transition hover:border-pulse/40 dark:bg-slate-950/35"
              >
                Setup profile
              </button>
              <button
                type="button"
                onClick={() => navigate("/feedback")}
                className="rounded-2xl border border-line bg-white px-5 py-3 text-left text-sm font-black text-dark transition hover:border-pulse/40 dark:bg-slate-950/35"
              >
                Alpha feedback
              </button>
              <button
                type="button"
                onClick={() => navigate("/terms")}
                className="rounded-2xl border border-line bg-white px-5 py-3 text-left text-sm font-black text-dark transition hover:border-pulse/40 dark:bg-slate-950/35"
              >
                Terms
              </button>
              <button
                type="button"
                onClick={() => navigate("/privacy")}
                className="rounded-2xl border border-line bg-white px-5 py-3 text-left text-sm font-black text-dark transition hover:border-pulse/40 dark:bg-slate-950/35"
              >
                Privacy policy
              </button>
              <a
                href="mailto:support@athletigolf.app"
                className="inline-flex items-center gap-2 rounded-2xl border border-line bg-white px-5 py-3 text-sm font-black text-dark transition hover:border-pulse/40 dark:bg-slate-950/35 sm:col-span-2"
              >
                <Mail className="h-4 w-4" /> Contact support
              </a>
            </div>
          </SettingsAccordionItem>

          <SettingsAccordionItem
            id="dangerZone"
            title="Danger Zone"
            description="Export your data or close your account."
            openSection={openSection}
            onOpen={setOpenSection}
          >
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={requestAccountDataExport}
                  disabled={dataRequestState === "saving"}
                  className="rounded-2xl border border-line bg-white px-5 py-3 text-sm font-black text-dark transition hover:border-pulse/40 disabled:opacity-60 dark:bg-slate-950/35"
                >
                  {dataRequestState === "saving" ? "Requesting..." : "Request data export"}
                </button>
                <button
                  type="button"
                  onClick={closeAccount}
                  disabled={dataRequestState === "saving" || closingAccount}
                  className="rounded-2xl border border-danger/30 bg-danger/10 px-5 py-3 text-sm font-black text-danger transition hover:bg-danger/15 disabled:opacity-60"
                >
                  Close account
                </button>
              </div>
              {dataRequestState === "success" && dataRequestMessage && <p className="rounded-2xl border border-lab/30 bg-lab/10 px-4 py-3 text-sm font-bold text-lab">{dataRequestMessage}</p>}
              {dataRequestState === "error" && dataRequestMessage && <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-bold text-danger">{dataRequestMessage}</p>}
            </div>
          </SettingsAccordionItem>
        </div>
      </div>
    </div>
  );
}

function SettingsAccordionItem({
  id,
  title,
  description,
  openSection,
  onOpen,
  children,
}: {
  id: SettingsSection;
  title: string;
  description: string;
  openSection: SettingsSection;
  onOpen: (section: SettingsSection) => void;
  children: ReactNode;
}) {
  const isOpen = openSection === id;

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
      <button
        type="button"
        onClick={() => onOpen(id)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-pulse/5 sm:p-6"
      >
        <span className="min-w-0">
          <span className="block text-base font-black text-dark sm:text-lg">{title}</span>
          <span className="mt-1 block text-sm leading-6 text-muted">{description}</span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-muted transition ${isOpen ? "rotate-180 text-pulse" : ""}`} />
      </button>
      {isOpen && <div className="border-t border-line p-5 sm:p-6">{children}</div>}
    </section>
  );
}
function PrivacyNote({
  title,
  detail,
  body,
  icon,
}: {
  title: string;
  detail?: string;
  body?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-white/70 p-4 dark:bg-slate-950/35">
      <div className="flex items-start gap-3">
        {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
        <div>
          <h3 className="font-semibold text-dark">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{body ?? detail ?? ""}</p>
        </div>
      </div>
    </div>
  );
}
function getSportModeDetail(mode: SportMode) {
  if (mode === "training") return "Hide golf clutter and focus the app around fitness tracking, wellness, nutrition and social performance.";
  if (mode === "golf") return "Prioritise golf tracking, practice, competitions and golf-specific reports.";
  if (mode === "other") return "Use AthletiGolf as a general athletic performance platform while future sport modules grow.";
  return "Track everything: golf, training, wellness, nutrition, social and AthletiAI relationship insights.";
}


