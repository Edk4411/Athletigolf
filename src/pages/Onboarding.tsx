import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Check, Dumbbell, Flag, Target } from "lucide-react";
import { Button, FieldLabel, Surface, TextArea, TextInput } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { OnboardingData } from "@/lib/types";

const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const defaultData: OnboardingData = {
  mainSport: "both",
  fullName: "",
  mainGoal: "",
  golf: {
    homeCourse: "",
    handicap: "",
    scoringGoal: "Break 80",
    biggestWeakness: "Approach play",
    practiceAvailability: "2 sessions per week",
    upcomingCompetition: "",
  },
  training: {
    experience: "Under 1 year",
    daysAvailable: "3 days",
    sessionLength: "45 minutes",
    equipment: "Full gym",
    goal: "Strength",
    injuries: "",
    restDays: [],
  },
};

export default function Onboarding() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadExistingProfile();
  }, []);

  async function loadExistingProfile() {
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const existing = profile?.onboarding_data as OnboardingData | null | undefined;

    setData({
      ...defaultData,
      ...existing,
      fullName: existing?.fullName || profile?.full_name || user.user_metadata?.username || "",
      mainGoal: existing?.mainGoal || profile?.main_goal || "",
      golf: {
        ...defaultData.golf,
        ...(existing?.golf || {}),
        handicap: existing?.golf?.handicap || profile?.golf_handicap?.toString() || "",
      },
      training: {
        ...defaultData.training,
        ...(existing?.training || {}),
      },
    });
    setLoading(false);
  }

  const recommendation = useMemo(() => buildRecommendation(data), [data]);
  const progress = Math.round(((step + 1) / 4) * 100);

  function update<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setError("");
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function updateGolf<K extends keyof OnboardingData["golf"]>(key: K, value: OnboardingData["golf"][K]) {
    setError("");
    setData((prev) => ({ ...prev, golf: { ...prev.golf, [key]: value } }));
  }

  function updateTraining<K extends keyof OnboardingData["training"]>(
    key: K,
    value: OnboardingData["training"][K]
  ) {
    setError("");
    setData((prev) => ({ ...prev, training: { ...prev.training, [key]: value } }));
  }

  function toggleRestDay(day: string) {
    const selected = data.training.restDays.includes(day);
    updateTraining(
      "restDays",
      selected
        ? data.training.restDays.filter((restDay) => restDay !== day)
        : [...data.training.restDays, day]
    );
  }

  async function saveOnboarding() {
    if (!user) {
      navigate("/auth");
      return;
    }

    setSaving(true);
    setError("");

    const { error: saveError } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: data.fullName || null,
      golf_handicap: data.golf.handicap ? Number(data.golf.handicap) : null,
      main_goal: data.mainGoal || `${data.golf.scoringGoal} + ${data.training.goal}`,
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
      onboarding_data: data,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    navigate("/dashboard");
  }

  async function skipOnboarding() {
    if (!user) {
      navigate("/auth");
      return;
    }

    setSaving(true);
    setError("");

    const { error: saveError } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: data.fullName || user.user_metadata?.username || null,
      golf_handicap: data.golf.handicap ? Number(data.golf.handicap) : null,
      main_goal: data.mainGoal || null,
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
      onboarding_data: data,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    navigate("/dashboard");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-muted">
        Loading setup...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-6 text-ink md:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="mb-5 overflow-hidden rounded-2xl border border-white/10 bg-dark text-white">
          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_280px] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-pulse">AthletiGolf Setup</p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
                Build your performance profile.
              </h1>
              <p className="mt-4 max-w-2xl leading-relaxed text-white/64">
                Give AthletiGolf enough context to make the dashboard, training board and practice recommendations feel personal from day one.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/8 p-4">
              <div className="mb-3 flex items-center justify-between text-sm font-semibold text-white/70">
                <span>Setup progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-pulse" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[260px_1fr]">
          <Surface className="h-fit">
            <div className="space-y-2">
              {["Profile", "Golf", "Training", "Review"].map((label, index) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setStep(index)}
                  className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${
                    step === index ? "bg-dark text-white" : "text-muted hover:bg-steel/10 hover:text-dark"
                  }`}
                >
                  {label}
                  {index < step && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </Surface>

          <Surface>
            {step === 0 && (
              <SetupStep
                icon={<Target className="h-5 w-5" />}
                eyebrow="Profile"
                title="What are we building around?"
                detail="This gives the app a clear point of view before it starts recommending practice and training."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Name" value={data.fullName} onChange={(value) => update("fullName", value)} placeholder="Edward King" />
                  <Field label="Main goal" value={data.mainGoal} onChange={(value) => update("mainGoal", value)} placeholder="Break 75 and gain clubhead speed" />
                  <ChoiceGroup
                    label="Primary use"
                    value={data.mainSport || "both"}
                    options={["both", "golf", "training", "other"]}
                    onChange={(value) => update("mainSport", value as OnboardingData["mainSport"])}
                  />
                </div>
              </SetupStep>
            )}

            {step === 1 && (
              <SetupStep
                icon={<Flag className="h-5 w-5" />}
                eyebrow="Golf Baseline"
                title="Set the golf context."
                detail="The goal is not a perfect profile. It is enough signal for better dashboard priorities."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Home course" value={data.golf.homeCourse} onChange={(value) => updateGolf("homeCourse", value)} placeholder="Sundridge Park" />
                  <Field label="Current handicap" type="number" value={data.golf.handicap} onChange={(value) => updateGolf("handicap", value)} placeholder="6.9" />
                  <ChoiceGroup
                    label="Scoring goal"
                    value={data.golf.scoringGoal}
                    options={["Break 90", "Break 80", "Break 75", "Scratch push", "Tournament prep"]}
                    onChange={(value) => updateGolf("scoringGoal", value)}
                  />
                  <ChoiceGroup
                    label="Biggest weakness"
                    value={data.golf.biggestWeakness}
                    options={["Driving accuracy", "Approach play", "Short game", "Putting", "Penalties / decisions"]}
                    onChange={(value) => updateGolf("biggestWeakness", value)}
                  />
                  <ChoiceGroup
                    label="Practice availability"
                    value={data.golf.practiceAvailability}
                    options={["1 session per week", "2 sessions per week", "3+ sessions per week", "Mostly on-course"]}
                    onChange={(value) => updateGolf("practiceAvailability", value)}
                  />
                  <Field label="Upcoming competition" value={data.golf.upcomingCompetition} onChange={(value) => updateGolf("upcomingCompetition", value)} placeholder="Club medal in 3 weeks" />
                </div>
              </SetupStep>
            )}

            {step === 2 && (
              <SetupStep
                icon={<Dumbbell className="h-5 w-5" />}
                eyebrow="Training Baseline"
                title="Set the performance lab rules."
                detail="This keeps training useful for golf rather than becoming a random list of exercises."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <ChoiceGroup
                    label="Training experience"
                    value={data.training.experience}
                    options={["New starter", "Under 1 year", "1-2 years", "2+ years"]}
                    onChange={(value) => updateTraining("experience", value)}
                  />
                  <ChoiceGroup
                    label="Days available"
                    value={data.training.daysAvailable}
                    options={["2 days", "3 days", "4 days", "5 days"]}
                    onChange={(value) => updateTraining("daysAvailable", value)}
                  />
                  <ChoiceGroup
                    label="Session length"
                    value={data.training.sessionLength}
                    options={["30 minutes", "45 minutes", "60 minutes", "75+ minutes"]}
                    onChange={(value) => updateTraining("sessionLength", value)}
                  />
                  <ChoiceGroup
                    label="Equipment"
                    value={data.training.equipment}
                    options={["Full gym", "Home weights", "Bands / dumbbells", "Bodyweight only"]}
                    onChange={(value) => updateTraining("equipment", value)}
                  />
                  <ChoiceGroup
                    label="Training goal"
                    value={data.training.goal}
                    options={["Strength", "Muscle", "Speed / power", "Mobility", "Fat loss"]}
                    onChange={(value) => updateTraining("goal", value)}
                  />
                  <div>
                    <FieldLabel>Protected rest days</FieldLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {weekDays.map((day) => {
                        const selected = data.training.restDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleRestDay(day)}
                            className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                              selected ? "border-pulse bg-pulse/15 text-dark" : "border-line bg-white/70 text-muted hover:text-dark"
                            }`}
                          >
                            {day.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <FieldLabel>Injuries or things to respect</FieldLabel>
                    <TextArea
                      rows={3}
                      value={data.training.injuries}
                      onChange={(event) => updateTraining("injuries", event.target.value)}
                      placeholder="Lower back can get tight, avoid reckless volume..."
                    />
                  </div>
                </div>
              </SetupStep>
            )}

            {step === 3 && (
              <SetupStep
                icon={<Check className="h-5 w-5" />}
                eyebrow="Starting Plan"
                title="Your first AthletiGolf direction."
                detail="This is not locked in. It gives the app enough context to start acting useful."
              >
                <div className="grid gap-4 md:grid-cols-3">
                  {recommendation.map((item) => (
                    <div key={item.label} className="rounded-xl border border-line bg-white/70 p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{item.label}</p>
                      <h3 className="mt-2 font-semibold text-dark">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </SetupStep>
            )}

            {error && (
              <div className="mt-5 rounded-xl border border-danger/25 bg-danger/10 p-4 text-sm font-semibold text-danger">
                {error}
              </div>
            )}

            <div className="mt-7 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:justify-between">
              <Button type="button" variant="ghost" onClick={skipOnboarding} disabled={saving}>
                Skip for now
              </Button>
              <div className="flex flex-col gap-3 sm:flex-row">
                {step > 0 && (
                  <Button type="button" variant="secondary" onClick={() => setStep((current) => current - 1)}>
                    Back
                  </Button>
                )}
                {step < 3 ? (
                  <Button type="button" variant="pulse" onClick={() => setStep((current) => current + 1)}>
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" variant="golf" onClick={saveOnboarding} disabled={saving}>
                    {saving ? "Saving..." : "Finish Setup"}
                  </Button>
                )}
              </div>
            </div>
          </Surface>
        </section>
      </div>
    </main>
  );
}

function SetupStep({
  icon,
  eyebrow,
  title,
  detail,
  children,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-6 flex items-start gap-4">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-pulse/10 text-pulse">
          {icon}
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-pulse">{eyebrow}</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight text-dark">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{detail}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <TextInput type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function ChoiceGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="grid gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-semibold transition ${
              value === option
                ? "border-dark bg-dark text-white"
                : "border-line bg-white/70 text-dark hover:border-pulse/40 hover:bg-pulse/8"
            }`}
          >
            {option}
            {value === option && <Check className="h-4 w-4" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function buildRecommendation(data: OnboardingData) {
  if (data.mainSport === "training") {
    return [
      {
        label: "Training Focus",
        title: `${data.training.daysAvailable} / ${data.training.goal}`,
        detail: `${data.training.sessionLength} sessions using ${data.training.equipment.toLowerCase()}. The product will still work even if you never log golf.`,
      },
      {
        label: "Data Signal",
        title: "Strength progression first",
        detail: "Log load, sets and reps consistently so the app can spot PRs, stalls and muscle balance.",
      },
      {
        label: "Future Sports",
        title: data.mainGoal || "Performance profile",
        detail: "Your setup is stored as a flexible profile, so future sport modules can build on the same athlete record.",
      },
    ];
  }

  return [
    {
      label: "Golf Focus",
      title: data.golf.biggestWeakness || "Build a baseline",
      detail: getGolfRecommendation(data.golf.biggestWeakness, data.golf.practiceAvailability),
    },
    {
      label: "Training Direction",
      title: `${data.training.daysAvailable} / ${data.training.goal}`,
      detail: `${data.training.sessionLength} sessions using ${data.training.equipment.toLowerCase()}, with golf transfer kept visible in the Training Board.`,
    },
    {
      label: "Dashboard Signal",
      title: data.mainGoal || data.golf.scoringGoal,
      detail: "Once you log rounds, practice and workouts, AthletiGolf can start connecting what changed with why it changed.",
    },
  ];
}

function getGolfRecommendation(weakness: string, availability: string) {
  if (weakness === "Driving accuracy") return `Use ${availability.toLowerCase()} to track start line, penalties and fairway misses before chasing more speed.`;
  if (weakness === "Approach play") return `Make approach distance control the first practice theme. GIR and proximity-style notes should become the key signals.`;
  if (weakness === "Short game") return `Prioritise up-and-down and sand-save tracking so missed greens become recoverable instead of automatic bogeys.`;
  if (weakness === "Putting") return `Track putts, three-putts and pressure notes. The first win is controlling avoidable dropped shots.`;
  if (weakness === "Penalties / decisions") return `Treat penalty control as a scoring skill. AthletiGolf will flag this as a bad-side metric.`;
  return "Log one round and one focused practice session so the first useful signal appears.";
}
