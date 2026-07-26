import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import ExercisePicker from "@/components/ExercisePicker";
import { Button } from "@/components/ui";
import { useExerciseLibrary } from "@/hooks/useExerciseLibrary";
import type { ExerciseLibraryItem } from "@/lib/exerciseLibrary";
import { isGolfOnlyMode, isTrainingOnlyMode, type SportMode } from "@/lib/sportMode";
import { supabase } from "@/lib/supabase";
import type { OnboardingData } from "@/lib/types";

interface TrainingData {
  equipment: string;
  experience: string;
  frequency: string;
  splitStyle: string;
  hybridStyle: string;
  restDays: string[];
  preferredDays: Record<string, string>;
  includeExercises: string[];
  avoidExercises: string[];
  sessionLength: string;
  goal: string;
  golfPriority: string;
  limitation: string;
  weakLink: string;
}

type GeneratedDay = {
  day: string;
  focus: string;
  exercises: string[];
};

const generatedSplitStorageKey = "athletigolf.generatedSplitDraft";
const generatedSplitSourceKey = "athletigolf.generatedSplitSource";
const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type QuizStepKey = keyof TrainingData | "dayPreferences" | "exercisePreferences";

type QuizStep = {
  key: QuizStepKey;
  eyebrow: string;
  title: string;
  detail: string;
  options: string[];
  multi?: boolean;
  custom?: "dayPreferences" | "exercisePreferences";
};

const steps: QuizStep[] = [
  {
    key: "equipment",
    eyebrow: "Training Setup",
    title: "What can you train with most weeks?",
    detail: "This controls whether the split uses machines, barbells, dumbbells, bands or bodyweight swaps.",
    options: ["Full gym", "Home weights", "Bands / dumbbells", "Bodyweight only"],
  },
  {
    key: "experience",
    eyebrow: "Training Age",
    title: "How long have you trained consistently?",
    detail: "Newer lifters need simpler progression. Experienced lifters can handle more specific work.",
    options: ["New starter", "Under 1 year", "1-2 years", "2+ years"],
  },
  {
    key: "frequency",
    eyebrow: "Weekly Slots",
    title: "How many sessions can you realistically hit?",
    detail: "The best split is the one that fits your actual week, not a perfect week that never happens.",
    options: ["2 days", "3 days", "4 days", "5 days"],
  },
  {
    key: "splitStyle",
    eyebrow: "Split Style",
    title: "Do you already know the kind of split you want?",
    detail: "Pick a familiar structure if you like one, or let AthletiGolf build the week from your goals.",
    options: ["Auto-build for me", "Full body", "Upper / lower", "Push / pull / legs", "Arnold split", "Bro split", "Hybrid split"],
  },
  {
    key: "hybridStyle",
    eyebrow: "Hybrid Style",
    title: "Which mixed split sounds closest?",
    detail: "Hybrid splits combine popular structures so you can train more like you already think.",
    options: ["PPL + upper/lower", "PPL + Arnold", "Upper/lower + full body", "Strength + hypertrophy", "Athletic performance mix"],
  },
  {
    key: "restDays",
    eyebrow: "Rest Days",
    title: "Are there any days you need to keep free?",
    detail: "Pick any days that should stay as rest days. The split will work around these where possible.",
    options: weekDays,
    multi: true,
  },
  {
    key: "dayPreferences",
    eyebrow: "Day Layout",
    title: "Any specific days you want for key sessions?",
    detail: "Optional. If you pick PPL, for example, you can put Push on Monday. If a day is protected as rest, it stays protected.",
    options: [],
    custom: "dayPreferences",
  },
  {
    key: "sessionLength",
    eyebrow: "Session Length",
    title: "How long can each session usually be?",
    detail: "Short sessions get fewer lifts and cleaner priorities. Longer sessions can add accessories.",
    options: ["30 minutes", "45 minutes", "60 minutes", "75+ minutes"],
  },
  {
    key: "goal",
    eyebrow: "Main Goal",
    title: "What should the plan prioritise?",
    detail: "This decides whether the board leans strength, muscle, power, movement quality or body composition.",
    options: ["Strength", "Muscle", "Speed / power", "Mobility", "Fat loss"],
  },
  {
    key: "exercisePreferences",
    eyebrow: "Exercise Preferences",
    title: "Any exercises you want included or avoided?",
    detail: "Search the exercise database to nudge the generator. Custom names still work if the library does not have it yet.",
    options: [],
    custom: "exercisePreferences",
  },
  {
    key: "golfPriority",
    eyebrow: "Performance Carryover",
    title: "Where should training improve performance most?",
    detail: "This gives the split its AthletiGolf edge instead of becoming a generic gym plan.",
    options: ["Speed / distance", "Rotation speed", "Stability", "Injury prevention", "Endurance"],
  },
  {
    key: "limitation",
    eyebrow: "Protection",
    title: "Anything the plan should respect?",
    detail: "The split will avoid being reckless around the area you choose.",
    options: ["Lower back", "Shoulder", "Knee", "Wrist / elbow", "No issue"],
  },
  {
    key: "weakLink",
    eyebrow: "Weak Link",
    title: "What area needs the most development?",
    detail: "This adds targeted accessory work so the split has a point of view.",
    options: ["Chest / push", "Back / pull", "Legs", "Core / rotation", "Mobility"],
  },
];

export default function GymQuiz({ onComplete }: { onComplete: () => void }) {
  const [, navigate] = useLocation();
  const { exercises } = useExerciseLibrary();
  const [step, setStep] = useState(0);
  const [sportMode, setSportMode] = useState<SportMode>("both");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [includeDraft, setIncludeDraft] = useState("");
  const [avoidDraft, setAvoidDraft] = useState("");
  const [data, setData] = useState<TrainingData>({
    equipment: "",
    experience: "",
    frequency: "",
    splitStyle: "",
    hybridStyle: "",
    restDays: [],
    preferredDays: {},
    includeExercises: [],
    avoidExercises: [],
    sessionLength: "",
    goal: "",
    golfPriority: "",
    limitation: "",
    weakLink: "",
  });

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("profiles")
      .select("onboarding_data")
      .maybeSingle()
      .then(({ data: profile }) => {
        if (cancelled) return;
        const onboarding = (profile?.onboarding_data as OnboardingData | null) || null;
        setSportMode(onboarding?.mainSport || "both");
        setLoadingProfile(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const gymOnly = isTrainingOnlyMode(sportMode);
  const golfOnly = isGolfOnlyMode(sportMode);
  const activeSteps = steps.filter((quizStep) => {
    if (gymOnly && quizStep.key === "golfPriority") return false;
    if (quizStep.key === "hybridStyle" && data.splitStyle !== "Hybrid split") return false;
    return true;
  });
  const current = activeSteps[step];
  const complete = step >= activeSteps.length;
  const plan = buildTrainingPlan(data, gymOnly ? "gym" : "athletic");
  const returnToWorkouts =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("return") === "workouts";

  const choose = (value: string) => {
    if (!current) return;
    if (current.multi || current.custom) return;
    setData((prev) => ({ ...prev, [current.key as keyof TrainingData]: value }));
    setStep((prev) => prev + 1);
  };

  const toggleRestDay = (day: string) => {
    setData((prev) => {
      const selected = prev.restDays.includes(day);
      return {
        ...prev,
        restDays: selected ? prev.restDays.filter((restDay) => restDay !== day) : [...prev.restDays, day],
      };
    });
  };

  const continueFromMultiStep = () => {
    setStep((prev) => prev + 1);
  };

  const goBack = () => {
    if (complete) {
      setStep(Math.max(activeSteps.length - 1, 0));
      return;
    }

    if (step > 0) {
      setStep((prev) => prev - 1);
      return;
    }

    navigate(returnToWorkouts ? "/workouts" : "/dashboard");
  };

  const setPreferredDay = (focus: string, day: string) => {
    setData((prev) => ({
      ...prev,
      preferredDays: day
        ? { ...prev.preferredDays, [focus]: day }
        : Object.fromEntries(Object.entries(prev.preferredDays).filter(([key]) => key !== focus)),
    }));
  };

  const [prefConflict, setPrefConflict] = useState("");

  const toggleExercisePreference = (type: "includeExercises" | "avoidExercises", value: string) => {
    const exercise = value.trim();
    if (!exercise) return;
    const other = type === "includeExercises" ? "avoidExercises" : "includeExercises";
    setPrefConflict("");
    setData((prev) => {
      const normalised = normaliseExerciseName(exercise);
      if (prev[other].some((item) => normaliseExerciseName(item) === normalised)) {
        setPrefConflict(`"${exercise}" is already in the ${other === "avoidExercises" ? "Avoid" : "Add"} list. Remove it from there first.`);
        return prev;
      }
      const currentList = prev[type];
      const exists = currentList.some((item) => normaliseExerciseName(item) === normalised);
      return { ...prev, [type]: exists ? currentList.filter((i) => normaliseExerciseName(i) !== normalised) : [...currentList, exercise] };
    });
  };

  const addExercisePreference = (type: "includeExercises" | "avoidExercises", value: string) => {
    toggleExercisePreference(type, value);
    if (type === "includeExercises") setIncludeDraft("");
    if (type === "avoidExercises") setAvoidDraft("");
  };

  const removeExercisePreference = (type: "includeExercises" | "avoidExercises", value: string) => {
    setData((prev) => ({
      ...prev,
      [type]: prev[type].filter((item) => item !== value),
    }));
  };

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream p-6 text-muted">
        Loading split builder...
      </div>
    );
  }

  if (golfOnly) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream p-6 text-ink">
        <div className="w-full max-w-2xl rounded-xl border border-line bg-panel p-8 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-golf">Golf Focus</p>
          <h1 className="mt-3 text-3xl font-semibold text-dark">No generated gym split needed</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Your setup is golf-only, so AthletiGolf will focus on rounds, practice, competitions and golf analytics. You can still build a training board manually whenever you want.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button type="button" variant="golf" onClick={() => navigate("/golf")}>
              Open Golf
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/workouts")}>
              Open Training Board
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const saveGeneratedSplit = async () => {
    setSaving(true);
    setSaveError("");

    const archivedAt = new Date().toISOString();
    const archiveResult = await supabase
      .from("split_days")
      .update({ archived_at: archivedAt })
      .is("archived_at", null);

    if (archiveResult.error) {
      setSaveError(archiveResult.error.message);
      setSaving(false);
      return;
    }

    const rows = plan.days.map((day) => ({
      day_name: day.day,
      split_name: day.focus,
      exercises: day.exercises,
      archived_at: null,
    }));

    const { error } = await supabase.from("split_days").insert(rows);
    setSaving(false);

    if (error) {
      setSaveError(error.message);
      return;
    }

    window.localStorage.removeItem(generatedSplitStorageKey);
    window.localStorage.removeItem(generatedSplitSourceKey);

    if (returnToWorkouts) {
      navigate("/workouts");
      return;
    }

    onComplete();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-6 text-ink">
      <div className="w-full max-w-5xl rounded-xl border border-line bg-panel p-6 shadow-sm md:p-8">
        <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pulse">
              Performance Lab Setup
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-dark">
              {gymOnly ? "Build a gym split that fits your week" : "Build an athletic performance split"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              {gymOnly
                ? "Answer a few practical questions, preview the generated week, then save it as your active Training Board."
                : "Build strength, speed, mobility and stability without turning every session into a generic gym plan."}
            </p>
          </div>
          <div className="rounded-full border border-line px-3 py-1 text-sm font-semibold text-muted">
            {Math.min(step + 1, activeSteps.length)} / {activeSteps.length}
          </div>
        </div>

        {!complete ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
            <div className="rounded-xl border border-pulse/20 bg-pulse/10 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-pulse">
                {current.eyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-dark">{current.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{current.detail}</p>
            </div>

            <div className="space-y-3">
              {current.custom === "dayPreferences" ? (
                <>
                  <DayPreferenceStep data={data} gymOnly={gymOnly} onChange={setPreferredDay} />
                  <Button type="button" variant="primary" onClick={continueFromMultiStep}>
                    Continue
                  </Button>
                </>
              ) : current.custom === "exercisePreferences" ? (
                <>
                  <FullExerciseSelector
                    exercises={exercises}
                    allowGolfSpecific={!gymOnly}
                    includeList={data.includeExercises}
                    avoidList={data.avoidExercises}
                    onToggle={toggleExercisePreference}
                  />
                  {prefConflict && (
                    <p className="mt-2 rounded-lg border border-danger/20 bg-danger/10 p-2 text-sm font-semibold text-danger" data-testid="pref-conflict">
                      {prefConflict}
                    </p>
                  )}
                  <Button type="button" variant="primary" onClick={continueFromMultiStep}>
                    Continue
                  </Button>
                </>
              ) : current.multi ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {current.options.map((option) => {
                      const selected = data.restDays.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => toggleRestDay(option)}
                          className={`flex w-full items-center justify-between rounded-xl border p-4 text-left font-semibold transition ${
                            selected
                              ? "border-pulse bg-pulse/15 text-dark"
                              : "border-line bg-white/70 text-dark hover:border-pulse hover:bg-pulse/10"
                          }`}
                        >
                          {option}
                          <span className="text-sm text-muted">{selected ? "Rest" : "Available"}</span>
                        </button>
                      );
                    })}
                  </div>
                  <Button type="button" variant="primary" onClick={continueFromMultiStep}>
                    Continue
                  </Button>
                </>
              ) : (
                current.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => choose(option)}
                    className="flex w-full items-center justify-between rounded-xl border border-line bg-white/70 p-4 text-left font-semibold text-dark transition hover:border-pulse hover:bg-pulse/10"
                  >
                    {option}
                    <span className="text-sm text-muted">Select</span>
                  </button>
                ))
              )}
              <div className="border-t border-line pt-3">
                <Button type="button" variant="ghost" onClick={goBack}>
                  {step === 0 ? "Exit Builder" : "Back"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="rounded-xl border border-lab/20 bg-lab/10 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-pulse">
                Generated Training Board
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-dark">{plan.title}</h2>
              <p className="mt-3 text-muted">{plan.summary} Save it to make it your active split for Training Console.</p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {plan.notes.map((note) => (
                <div key={note.title} className="rounded-xl border border-line bg-white/60 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{note.label}</p>
                  <h3 className="mt-2 font-semibold text-dark">{note.title}</h3>
                  <p className="mt-2 text-sm text-muted">{note.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {plan.days.map((day) => (
                <div key={day.day} className="rounded-xl border border-line bg-panel p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-pulse">{day.day}</p>
                  <h3 className="mt-2 text-lg font-semibold text-dark">{day.focus}</h3>
                  <div className="mt-3 space-y-2">
                    {day.exercises.map((exercise) => (
                      <div key={exercise} className="rounded-lg border border-line bg-white/55 px-3 py-2 text-sm font-medium text-ink">
                        {exercise}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {saveError && (
              <div className="mt-5 rounded-lg border border-danger/25 bg-danger/10 p-4 text-sm font-semibold text-danger">
                {saveError}
              </div>
            )}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="primary" onClick={saveGeneratedSplit} disabled={saving}>
                {saving ? "Saving Split..." : "Save Split"}
              </Button>
              <Button type="button" variant="secondary" onClick={goBack} disabled={saving}>
                Back to Questions
              </Button>
              <Button type="button" variant="secondary" onClick={() => setStep(0)} disabled={saving}>
                Retake Quiz
              </Button>
              <Button type="button" variant="ghost" onClick={() => navigate("/workouts")} disabled={saving}>
                Back to Board
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DayPreferenceStep({
  data,
  gymOnly,
  onChange,
}: {
  data: TrainingData;
  gymOnly: boolean;
  onChange: (focus: string, day: string) => void;
}) {
  const focuses = getStyledFocuses(data, gymOnly ? "gym" : "athletic");

  if (data.splitStyle === "Auto-build for me" || data.splitStyle === "") {
    return (
      <div className="rounded-xl border border-line bg-white/70 p-4 text-sm leading-relaxed text-muted">
        Auto-build will place sessions around your protected rest days. Pick a named split style if you want to choose exact days for Push, Pull, Upper, Lower, and similar sessions.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {focuses.map((focus) => (
        <label key={focus} className="grid gap-2 rounded-xl border border-line bg-white/70 p-4">
          <span className="text-sm font-semibold text-dark">{focus}</span>
          <select
            value={data.preferredDays[focus] || ""}
            onChange={(event) => onChange(focus, event.target.value)}
            className="rounded-lg border border-line bg-panel px-3 py-2 text-sm font-semibold text-dark outline-none transition focus:border-pulse focus:ring-2 focus:ring-pulse/20"
          >
            <option value="">Let AthletiGolf place it</option>
            {weekDays.map((day) => (
              <option key={day} value={day} disabled={data.restDays.includes(day)}>
                {day}{data.restDays.includes(day) ? " (rest)" : ""}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

function ExercisePreferenceBlock(_props: {
  title: string;
  value: string;
  setValue: (value: string) => void;
  selected: string[];
  exercises: ExerciseLibraryItem[];
  allowGolfSpecific: boolean;
  onAdd: () => void;
  onRemove: (value: string) => void;
}) {
  // Kept for backward compat - the flow now uses FullExerciseSelector.
  return null;
}

function FullExerciseSelector({
  exercises,
  allowGolfSpecific,
  includeList,
  avoidList,
  onToggle,
}: {
  exercises: ExerciseLibraryItem[];
  allowGolfSpecific: boolean;
  includeList: string[];
  avoidList: string[];
  onToggle: (type: "includeExercises" | "avoidExercises", value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = exercises
    .filter((e) => allowGolfSpecific || e.category !== "Golf-Specific")
    .filter((e) => {
      if (!q) return true;
      const hay = `${e.name} ${e.primaryMuscle} ${e.equipment} ${(e.secondaryMuscles || []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  const includeSet = new Set(includeList.map((v) => v.toLowerCase()));
  const avoidSet = new Set(avoidList.map((v) => v.toLowerCase()));

  return (
    <div className="rounded-xl border border-line bg-white/70 p-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search exercises..."
        className="mb-3 w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-pulse"
        data-testid="exercise-search"
      />
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-pulse/10 px-2 py-1 font-semibold text-pulse">Add: {includeList.length}</span>
        <span className="rounded-full bg-danger/10 px-2 py-1 font-semibold text-danger">Avoid: {avoidList.length}</span>
        <span className="text-muted">Tap Add or Avoid on each exercise</span>
      </div>
      <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1" data-testid="exercise-selector-list">
        {visible.map((e) => {
          const inInclude = includeSet.has(e.name.toLowerCase());
          const inAvoid = avoidSet.has(e.name.toLowerCase());
          return (
            <div key={e.slug || e.name} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-dark">{e.name}</p>
                <p className="truncate text-xs text-muted">{e.primaryMuscle} - {e.equipment}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onToggle("includeExercises", e.name)}
                  disabled={inAvoid}
                  data-testid={`add-btn-${e.name}`}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    inInclude ? "border-pulse bg-pulse text-white" : "border-pulse/40 text-pulse hover:bg-pulse/10"
                  } ${inAvoid ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  {inInclude ? "Added" : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => onToggle("avoidExercises", e.name)}
                  disabled={inInclude}
                  data-testid={`avoid-btn-${e.name}`}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    inAvoid ? "border-danger bg-danger text-white" : "border-danger/40 text-danger hover:bg-danger/10"
                  } ${inInclude ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  {inAvoid ? "Avoiding" : "Avoid"}
                </button>
              </div>
            </div>
          );
        })}
        {visible.length === 0 && <p className="text-sm text-muted">No exercises match that search.</p>}
      </div>
    </div>
  );
}

type SplitBuilderMode = "gym" | "athletic";

function buildTrainingPlan(data: TrainingData, mode: SplitBuilderMode) {
  const days = buildSplitDays(data, mode);
  const trainingDays = days.filter((day) => day.focus !== "Rest");
  const modeLabel = mode === "gym" ? "gym" : "athletic performance";

  return {
    title: `${trainingDays.length}-day ${data.goal || modeLabel} split`,
    summary:
      mode === "gym"
        ? `${data.goal || "Strength"} focus built for ${data.equipment || "your equipment"} and ${data.sessionLength || "realistic"} sessions.`
        : `${data.goal || "Strength"} focus with performance carryover for ${data.golfPriority || "rotation, stability and speed"}. Built for ${data.equipment || "your equipment"} and ${data.sessionLength || "realistic"} sessions.`,
    notes: [
      {
        label: "Structure",
        title: `${trainingDays.length} training days`,
        detail:
          mode === "gym"
            ? `${data.experience || "Your level"} training age with enough recovery to keep the week repeatable.`
            : `${data.experience || "Your level"} training age with recovery kept visible around sport practice and rounds.`,
      },
      {
        label: "Protected Rest",
        title: data.restDays.length ? data.restDays.join(", ") : "Flexible",
        detail: data.restDays.length
          ? "The generated week avoids these days where the session count allows it."
          : "No fixed rest days selected, so the split uses the strongest training rhythm.",
      },
      mode === "gym"
        ? {
            label: "Training Bias",
            title: data.goal || "General progression",
            detail: getGymTrainingNote(data.goal),
          }
        : {
            label: "Performance Carryover",
            title: data.golfPriority || "Athletic carryover",
            detail: getGolfTransferNote(data.golfPriority),
          },
      {
        label: "Protection",
        title: data.limitation || "Recovery",
        detail: getProtectionNote(data.limitation),
      },
    ],
    days,
  };
}

function buildSplitDays(data: TrainingData, mode: SplitBuilderMode): GeneratedDay[] {
  const frequency = data.frequency || "3 days";
  const exerciseCount = data.sessionLength === "30 minutes" ? 4 : data.sessionLength === "45 minutes" ? 5 : 6;
  let trainingDays: GeneratedDay[];
  const styledDays = buildStyledSplitDays(data, mode, exerciseCount);

  if (styledDays.length) {
    trainingDays = styledDays;
    return fillWeek(applyProtectedRestDays(applyPreferredTrainingDays(trainingDays, data.preferredDays), data.restDays));
  }

  if (frequency === "2 days") {
    trainingDays = [
      trainingDay("Monday", "Full Body Strength", pickExercises(data, ["Lower", "Push", "Pull", "Core"], exerciseCount, mode)),
      trainingDay("Thursday", mode === "gym" ? "Full Body Hypertrophy" : "Full Body Power", pickExercises(data, ["Hinge", "Push", "Pull", mode === "gym" ? "Core" : "Rotation"], exerciseCount, mode)),
    ];
  } else if (frequency === "4 days") {
    trainingDays = [
      trainingDay("Monday", "Upper Strength", pickExercises(data, ["Push", "Pull", "Shoulder", "Core"], exerciseCount, mode)),
      trainingDay("Tuesday", "Lower Strength", pickExercises(data, ["Lower", "Hinge", "Single Leg", "Mobility"], exerciseCount, mode)),
      trainingDay("Thursday", mode === "gym" ? "Upper Volume" : "Upper Speed", pickExercises(data, ["Power", "Push", "Pull", mode === "gym" ? "Shoulder" : "Rotation"], exerciseCount, mode)),
      trainingDay("Saturday", mode === "gym" ? "Lower Volume" : "Lower Athletic", pickExercises(data, ["Power", "Lower", "Hinge", "Core"], exerciseCount, mode)),
    ];
  } else if (frequency === "5 days") {
    trainingDays = [
      trainingDay("Monday", "Push Strength", pickExercises(data, ["Push", "Shoulder", "Core"], exerciseCount, mode)),
      trainingDay("Tuesday", "Lower Strength", pickExercises(data, ["Lower", "Hinge", "Single Leg"], exerciseCount, mode)),
      trainingDay("Wednesday", "Pull Strength", pickExercises(data, ["Pull", "Shoulder", "Core"], exerciseCount, mode)),
      trainingDay("Friday", mode === "gym" ? "Power + Conditioning" : "Power + Rotation", pickExercises(data, ["Power", mode === "gym" ? "Core" : "Rotation", "Core", "Mobility"], exerciseCount, mode)),
      trainingDay("Saturday", mode === "gym" ? "Accessories + Conditioning" : "Athletic Conditioning", pickExercises(data, ["Carry", "Single Leg", "Mobility", "Core"], exerciseCount, mode)),
    ];
  } else {
    trainingDays = [
      trainingDay("Monday", "Strength Base", pickExercises(data, ["Lower", "Push", "Pull"], exerciseCount, mode)),
      trainingDay("Wednesday", mode === "gym" ? "Upper + Core" : "Athletic Upper", pickExercises(data, ["Push", "Pull", mode === "gym" ? "Core" : "Rotation", "Core"], exerciseCount, mode)),
      trainingDay("Friday", "Lower + Power", pickExercises(data, ["Power", "Hinge", "Single Leg", "Mobility"], exerciseCount, mode)),
    ];
  }

  // Even for auto-build, still honour any preferred-day picks the user provided.
  return fillWeek(applyProtectedRestDays(applyPreferredTrainingDays(trainingDays, data.preferredDays), data.restDays, data.preferredDays));
}

function buildStyledSplitDays(data: TrainingData, mode: SplitBuilderMode, exerciseCount: number): GeneratedDay[] {
  const focuses = getStyledFocuses(data, mode);
  if (!focuses.length) return [];

  const frequency = getFrequencyNumber(data.frequency);
  const pickedFocuses = focuses.slice(0, frequency);

  return pickedFocuses.map((focus, index) =>
    trainingDay(defaultTrainingDay(index, frequency), focus, pickExercises(data, getBlocksForFocus(focus, mode), exerciseCount, mode))
  );
}

function getStyledFocuses(data: TrainingData, mode: SplitBuilderMode): string[] {
  const splitStyle = data.splitStyle;
  if (!splitStyle || splitStyle === "Auto-build for me") return [];

  if (splitStyle === "Full body") return ["Full Body A", "Full Body B", "Full Body C", "Full Body Volume", "Full Body Conditioning"];
  if (splitStyle === "Upper / lower") return ["Upper Strength", "Lower Strength", "Upper Volume", "Lower Volume", "Athletic Accessories"];
  if (splitStyle === "Push / pull / legs") return ["Push", "Pull", "Legs", "Push Volume", "Pull Volume"];
  if (splitStyle === "Arnold split") return ["Chest + Back", "Shoulders + Arms", "Legs", "Chest + Back Volume", "Shoulders + Arms Volume"];
  if (splitStyle === "Bro split") return ["Chest", "Back", "Legs", "Shoulders", "Arms"];

  if (data.hybridStyle === "PPL + upper/lower") return ["Push", "Pull", "Legs", "Upper", "Lower"];
  if (data.hybridStyle === "PPL + Arnold") return ["Push", "Pull", "Legs", "Chest + Back", "Shoulders + Arms"];
  if (data.hybridStyle === "Upper/lower + full body") return ["Upper Strength", "Lower Strength", "Full Body Volume", "Full Body Conditioning"];
  if (data.hybridStyle === "Strength + hypertrophy") return ["Strength Base", "Upper Volume", "Lower Volume", "Power + Conditioning"];
  if (data.hybridStyle === "Athletic performance mix") {
    return mode === "gym"
      ? ["Strength Base", "Upper Volume", "Lower Volume", "Conditioning + Core"]
      : ["Strength Base", "Athletic Upper", "Lower + Power", "Power + Rotation", "Mobility + Core"];
  }

  return [];
}

function getBlocksForFocus(focus: string, mode: SplitBuilderMode): string[] {
  if (focus.includes("Chest + Back")) return ["Chest Compound", "Vertical Pull", "Incline Chest", "Horizontal Row", "Rear Delt", "Core"];
  if (focus.includes("Shoulders + Arms")) return ["Shoulder Press", "Lateral Delt", "Rear Delt", "Biceps", "Triceps", "Core"];
  if (focus === "Upper Strength" || focus === "Upper") return ["Chest Compound", "Vertical Pull", "Shoulder Press", "Horizontal Row", "Core"];
  if (focus === "Upper Volume" || focus === "Athletic Upper") return ["Incline Chest", "Horizontal Row", "Lateral Delt", "Vertical Pull", mode === "gym" ? "Triceps" : "Rotation"];
  if (focus.includes("Lower") || focus === "Legs") return ["Squat Pattern", "Hinge Pattern", "Single Leg", "Hamstrings", "Calves", "Core"];
  if (focus.includes("Full Body") || focus === "Strength Base") return ["Squat Pattern", "Chest Compound", "Horizontal Row", mode === "gym" ? "Core" : "Rotation", "Hinge Pattern"];
  if (focus === "Push") return ["Chest Compound", "Shoulder Press", "Incline Chest", "Lateral Delt", "Triceps"];
  if (focus === "Push Volume") return ["Incline Chest", "Machine Chest", "Chest Fly", "Lateral Delt", "Triceps"];
  if (focus === "Pull") return ["Vertical Pull", "Horizontal Row", "Rear Delt", "Biceps", "Core"];
  if (focus === "Pull Volume") return ["Horizontal Row", "Vertical Pull", "Rear Delt", "Biceps", "Core"];
  if (focus === "Chest") return ["Chest Compound", "Incline Chest", "Machine Chest", "Chest Fly", "Triceps"];
  if (focus === "Back") return ["Vertical Pull", "Horizontal Row", "Horizontal Row", "Rear Delt", "Biceps"];
  if (focus === "Shoulders") return ["Shoulder Press", "Lateral Delt", "Rear Delt", "Lateral Delt", "Triceps"];
  if (focus === "Arms") return ["Biceps", "Triceps", "Biceps", "Triceps", "Forearms"];
  if (focus.includes("Power") || focus.includes("Athletic")) return ["Power", mode === "gym" ? "Carry" : "Rotation", "Single Leg", "Core", "Mobility"];
  if (focus.includes("Conditioning")) return ["Carry", "Power", "Core", "Mobility"];
  if (focus.includes("Mobility")) return ["Mobility", "Rotation", "Core", "Single Leg"];
  return ["Chest Compound", "Horizontal Row", "Squat Pattern", "Core"];
}

function getFrequencyNumber(frequency: string) {
  const match = frequency.match(/\d+/);
  return match ? Math.min(Number(match[0]), 5) : 3;
}

function defaultTrainingDay(index: number, frequency: number) {
  if (frequency === 2) return ["Monday", "Thursday"][index] || weekDays[index];
  if (frequency === 3) return ["Monday", "Wednesday", "Friday"][index] || weekDays[index];
  if (frequency === 4) return ["Monday", "Tuesday", "Thursday", "Saturday"][index] || weekDays[index];
  return ["Monday", "Tuesday", "Wednesday", "Friday", "Saturday"][index] || weekDays[index];
}

function applyPreferredTrainingDays(trainingDays: GeneratedDay[], preferredDays: Record<string, string>): GeneratedDay[] {
  // Two-pass placement so user preferences ALWAYS win. Pass 1: honour every
  // preferred day (order matters for tie-breaks between conflicting focuses).
  // Pass 2: fill remaining focuses into whatever days are still free.
  const result: GeneratedDay[] = trainingDays.map((d) => ({ ...d, day: "" }));
  const usedDays = new Set<string>();

  // Pass 1 - preferred days (first come, first served if two focuses collide)
  trainingDays.forEach((day, idx) => {
    const preferred = preferredDays[day.focus];
    if (preferred && !usedDays.has(preferred)) {
      result[idx].day = preferred;
      usedDays.add(preferred);
    }
  });

  // Pass 2 - fill in the rest from their originally suggested day, else next open day
  trainingDays.forEach((day, idx) => {
    if (result[idx].day) return;
    if (day.day && !usedDays.has(day.day)) {
      result[idx].day = day.day;
      usedDays.add(day.day);
      return;
    }
    const openDay = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].find((d) => !usedDays.has(d));
    if (openDay) {
      result[idx].day = openDay;
      usedDays.add(openDay);
    } else {
      result[idx].day = day.day;
    }
  });

  return result;
}

function trainingDay(day: string, focus: string, exercises: string[]): GeneratedDay {
  return { day, focus, exercises };
}

function fillWeek(trainingDays: GeneratedDay[]): GeneratedDay[] {
  const byDay = new Map(trainingDays.map((day) => [day.day, day]));
  return weekDays.map(
    (day) => byDay.get(day) || { day, focus: "Rest", exercises: ["Mobility", "Walk", "Recovery"] }
  );
}

function applyProtectedRestDays(trainingDays: GeneratedDay[], restDays: string[], preferredDays: Record<string, string> = {}): GeneratedDay[] {
  if (restDays.length === 0) return trainingDays;

  const protectedDays = new Set(restDays);
  const preferredSet = new Set(Object.values(preferredDays).filter(Boolean));
  const usedDays = new Set(trainingDays.map((day) => day.day));
  const availableDays = weekDays.filter((day) => !protectedDays.has(day));

  return trainingDays.map((trainingDay) => {
    if (!protectedDays.has(trainingDay.day)) return trainingDay;
    // Never move a day the user explicitly asked for. Their choice > rest protection.
    if (preferredSet.has(trainingDay.day) && preferredDays[trainingDay.focus] === trainingDay.day) return trainingDay;

    const replacementDay = availableDays.find((day) => !usedDays.has(day));
    if (!replacementDay) return trainingDay;

    usedDays.delete(trainingDay.day);
    usedDays.add(replacementDay);
    return { ...trainingDay, day: replacementDay };
  });
}

function pickExercises(data: TrainingData, blocks: string[], count: number, mode: SplitBuilderMode) {
  const library = getExerciseLibrary(data, mode);
  const picked: string[] = [];
  const avoided = new Set(data.avoidExercises.map(normaliseExerciseName));
  const included = data.includeExercises.filter((exercise) => !avoided.has(normaliseExerciseName(exercise)));
  const addExercise = (exercise: string) => {
    const normalised = normaliseExerciseName(exercise);
    if (picked.length < count && !avoided.has(normalised) && !picked.some((item) => normaliseExerciseName(item) === normalised)) {
      picked.push(exercise);
    }
  };

  included.forEach(addExercise);

  blocks.forEach((block) => {
    const options = (library[block] || []).filter((exercise) => !avoided.has(normaliseExerciseName(exercise)));
    const next = options.find((exercise) => !picked.some((item) => normaliseExerciseName(item) === normaliseExerciseName(exercise)));
    if (next) addExercise(next);
  });

  getPriorityExercises(data, mode, blocks, library).forEach(addExercise);

  blocks.flatMap((block) => library[block] || []).forEach(addExercise);
  ["Core", "Mobility"].flatMap((block) => library[block] || []).forEach(addExercise);

  return picked.slice(0, count);
}

function getExerciseLibrary(data: TrainingData, mode: SplitBuilderMode): Record<string, string[]> {
  if (data.equipment === "Bodyweight only") {
    return {
      Push: ["Push Ups", "Pike Push Ups", "Close-Grip Push Ups"],
      Pull: ["Towel Rows", "Reverse Snow Angels", "Prone Y Raises"],
      Lower: ["Split Squats", "Squats", "Step Ups"],
      Hinge: ["Single-Leg RDL", "Glute Bridge", "Hip Hinge Drill"],
      "Chest Compound": ["Push Ups", "Deficit Push Ups", "Tempo Push Ups"],
      "Incline Chest": ["Feet-Elevated Push Ups", "Diamond Push Ups", "Archer Push Ups"],
      "Machine Chest": ["Tempo Push Ups", "Deficit Push Ups", "Push Ups"],
      "Chest Fly": ["Wide Push Ups", "Sliding Push Ups", "Push Up Plus"],
      "Shoulder Press": ["Pike Push Ups", "Wall Walks", "Handstand Hold"],
      "Lateral Delt": ["Wall Slides", "Prone Y Raises", "Side Plank Reach"],
      "Rear Delt": ["Reverse Snow Angels", "Prone Y Raises", "Prone T Raises"],
      Triceps: ["Close-Grip Push Ups", "Bench Dips", "Plank Triceps Extension"],
      "Vertical Pull": ["Towel Rows", "Doorway Rows", "Prone Lat Pulls"],
      "Horizontal Row": ["Towel Rows", "Inverted Rows", "Reverse Snow Angels"],
      Biceps: ["Towel Curls", "Isometric Curl Hold", "Doorframe Row Hold"],
      Forearms: ["Dead Hang", "Suitcase Hold", "Wrist Plank"],
      "Squat Pattern": ["Squats", "Split Squats", "Tempo Squats"],
      "Leg Press Pattern": ["Wall Sit", "Step Ups", "Cyclist Squats"],
      "Hinge Pattern": ["Single-Leg RDL", "Glute Bridge", "Hip Hinge Drill"],
      Hamstrings: ["Hamstring Walkout", "Single-Leg Glute Bridge", "Slider Hamstring Curl"],
      Glutes: ["Glute Bridge", "Single-Leg Glute Bridge", "Hip Thrust"],
      Calves: ["Single-Leg Calf Raise", "Calf Raise", "Wall Calf Raise"],
      "Single Leg": ["Reverse Lunges", "Step Ups", "Single-Leg Glute Bridge"],
      Shoulder: ["Pike Push Ups", "Wall Slides", "Prone Y Raises"],
      Core: ["Plank", "Side Plank", "Dead Bug"],
      Rotation: mode === "gym" ? ["Dead Bug Rotation", "Plank Shoulder Taps", "Side Plank Reach"] : ["Open Books", "Plank Shoulder Taps", "Rotational Dead Bug"],
      Power: ["Squat Jumps", "Skater Bounds", "Fast Push Ups"],
      Mobility: ["Hip Flow", "Thoracic Rotations", "90/90 Switches"],
      Carry: ["Suitcase Hold", "Marching Plank", "Bear Crawl"],
    };
  }

  if (data.equipment === "Bands / dumbbells" || data.equipment === "Home weights") {
    return {
      Push: ["DB Bench Press", "DB Incline Press", "DB Shoulder Press"],
      Pull: ["1-Arm DB Row", "Band Pulldown", "Rear Delt Fly"],
      Lower: ["Goblet Squat", "DB Split Squat", "DB Step Up"],
      Hinge: ["DB RDL", "Hip Thrust", "Hamstring Walkout"],
      "Chest Compound": ["DB Bench Press", "Floor Press", "Push Ups"],
      "Incline Chest": ["DB Incline Press", "Feet-Elevated Push Ups", "DB Squeeze Press"],
      "Machine Chest": ["DB Floor Press", "Band Chest Press", "DB Squeeze Press"],
      "Chest Fly": ["DB Fly", "Band Fly", "Slider Fly"],
      "Shoulder Press": ["DB Shoulder Press", "Arnold Press", "Pike Push Ups"],
      "Lateral Delt": ["DB Lateral Raise", "Lean-Away Lateral Raise", "Band Lateral Raise"],
      "Rear Delt": ["Rear Delt Fly", "Band Face Pull", "Band Pull Apart"],
      Triceps: ["DB Skullcrusher", "Band Pressdown", "Close-Grip Push Ups"],
      "Vertical Pull": ["Band Pulldown", "Assisted Pull Up", "DB Pullover"],
      "Horizontal Row": ["1-Arm DB Row", "Band Row", "Chest-Supported DB Row"],
      Biceps: ["DB Curl", "Hammer Curl", "Band Curl"],
      Forearms: ["Farmer Carry", "Suitcase Carry", "Wrist Curl"],
      "Squat Pattern": ["Goblet Squat", "DB Front Squat", "Tempo Squat"],
      "Leg Press Pattern": ["DB Step Up", "Goblet Squat", "Cyclist Squat"],
      "Hinge Pattern": ["DB RDL", "Hip Thrust", "Single-Leg RDL"],
      Hamstrings: ["Hamstring Walkout", "Slider Hamstring Curl", "DB RDL"],
      Glutes: ["Hip Thrust", "Glute Bridge", "Band Lateral Walk"],
      Calves: ["DB Calf Raise", "Single-Leg Calf Raise", "Seated DB Calf Raise"],
      "Single Leg": ["DB Reverse Lunge", "DB Step Up", "Split Squat"],
      Shoulder: ["DB Lateral Raise", "DB Shoulder Press", "Band Face Pull"],
      Core: ["Pallof Press", "Dead Bug", "Side Plank"],
      Rotation: mode === "gym" ? ["Band Core Rotation", "Pallof Press", "Cable-Style Chop"] : ["Band Rotations", "Pallof Press", "Cable-Style Chop"],
      Power: mode === "gym" ? ["DB Jump Squat", "Med Ball Slam", "Fast DB Press"] : ["DB Jump Squat", "Med Ball Slam", "Band Speed Rotation"],
      Mobility: ["Hip Flow", "Thoracic Rotations", "Couch Stretch"],
      Carry: ["Suitcase Carry", "Farmer Carry", "Front Rack Carry"],
    };
  }

  return {
    Push: ["Bench Press", "Incline DB Press", "Machine Chest Press"],
    Pull: ["Lat Pulldown", "Seated Row", "Chest-Supported Row"],
    Lower: ["Squat", "Leg Press", "Hack Squat"],
    Hinge: ["RDL", "Hip Thrust", "Hamstring Curl"],
    "Chest Compound": ["Bench Press", "Machine Chest Press", "Chest Press"],
    "Incline Chest": ["Incline DB Press", "Incline Bench Press", "Low-Incline DB Press"],
    "Machine Chest": ["Machine Chest Press", "Cable Press", "Smith Machine Press"],
    "Chest Fly": ["Cable Fly", "Pec Deck", "DB Fly"],
    "Shoulder Press": ["Shoulder Press", "Seated DB Press", "Machine Shoulder Press"],
    "Lateral Delt": ["Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise"],
    "Rear Delt": ["Face Pull", "Rear Delt Fly", "Reverse Pec Deck"],
    Triceps: ["Rope Pressdown", "Overhead Triceps Extension", "Close-Grip Press"],
    "Vertical Pull": ["Lat Pulldown", "Pull Up", "Assisted Pull Up"],
    "Horizontal Row": ["Seated Row", "Chest-Supported Row", "Cable Row"],
    Biceps: ["DB Curl", "Cable Curl", "Preacher Curl"],
    Forearms: ["Farmer Carry", "Wrist Curl", "Dead Hang"],
    "Squat Pattern": ["Squat", "Hack Squat", "Front Squat"],
    "Leg Press Pattern": ["Leg Press", "Hack Squat", "Belt Squat"],
    "Hinge Pattern": ["RDL", "Hip Thrust", "Back Extension"],
    Hamstrings: ["Hamstring Curl", "Seated Hamstring Curl", "Nordic Curl"],
    Glutes: ["Hip Thrust", "Cable Kickback", "Glute Bridge"],
    Calves: ["Standing Calf Raise", "Seated Calf Raise", "Leg Press Calf Raise"],
    "Single Leg": ["Bulgarian Split Squat", "Walking Lunge", "Step Up"],
    Shoulder: ["Shoulder Press", "Lateral Raise", "Face Pull"],
    Core: ["Cable Crunch", "Pallof Press", "Side Plank"],
    Rotation: mode === "gym" ? ["Cable Core Rotation", "Pallof Press", "Dead Bug"] : ["Cable Wood Chop", "Landmine Rotation", "Pallof Press"],
    Power: mode === "gym" ? ["Kettlebell Swing", "Trap Bar Jump", "Sled Push"] : ["Med Ball Rotational Throw", "Trap Bar Jump", "Kettlebell Swing"],
    Mobility: ["Thoracic Rotations", "Hip Airplanes", "Couch Stretch"],
    Carry: ["Farmer Carry", "Suitcase Carry", "Sled Push"],
  };
}

function getPriorityExercises(data: TrainingData, mode: SplitBuilderMode, blocks: string[], library: Record<string, string[]>) {
  const priorities: string[] = [];
  const hasBlock = (...patterns: string[]) =>
    blocks.some((block) => patterns.some((pattern) => block.toLowerCase().includes(pattern.toLowerCase())));
  const addFirstFrom = (...blockNames: string[]) => {
    blockNames.forEach((blockName) => {
      const exercise = library[blockName]?.[0];
      if (exercise) priorities.push(exercise);
    });
  };

  if (data.goal === "Strength") {
    if (hasBlock("Chest", "Push", "Upper")) addFirstFrom("Chest Compound");
    if (hasBlock("Pull", "Back", "Row", "Upper")) addFirstFrom("Vertical Pull", "Horizontal Row");
    if (hasBlock("Squat", "Lower", "Legs")) addFirstFrom("Squat Pattern");
    if (hasBlock("Hinge", "Lower", "Legs")) addFirstFrom("Hinge Pattern");
  }
  if (data.goal === "Muscle") {
    if (hasBlock("Chest", "Push", "Upper")) addFirstFrom("Incline Chest");
    if (hasBlock("Pull", "Back", "Row", "Upper")) addFirstFrom("Horizontal Row");
    if (hasBlock("Lower", "Legs", "Squat")) addFirstFrom("Leg Press Pattern", "Hamstrings");
    if (hasBlock("Shoulder")) addFirstFrom("Lateral Delt");
    if (hasBlock("Biceps", "Arms")) addFirstFrom("Biceps");
    if (hasBlock("Triceps", "Arms")) addFirstFrom("Triceps");
  }
  if (data.goal === "Speed / power" && hasBlock("Power", "Athletic", "Full", "Lower", "Rotation")) {
    addFirstFrom("Power");
    if (mode === "athletic") addFirstFrom("Rotation");
  }
  if (data.goal === "Mobility" && hasBlock("Mobility", "Core", "Rotation")) addFirstFrom("Mobility", "Core");
  if (mode === "athletic") {
    if ((data.golfPriority === "Speed / distance" || data.golfPriority === "Driving distance") && hasBlock("Power", "Rotation", "Hinge", "Lower")) addFirstFrom("Power", "Hinge Pattern");
    if (data.golfPriority === "Rotation speed" && hasBlock("Power", "Rotation", "Core")) addFirstFrom("Rotation");
    if (data.golfPriority === "Stability" && hasBlock("Core", "Carry", "Single Leg")) addFirstFrom("Core", "Carry");
  }
  if (data.weakLink === "Core / rotation" && hasBlock("Core", "Rotation")) addFirstFrom(mode === "gym" ? "Core" : "Rotation", "Core");
  if (data.weakLink === "Mobility" && hasBlock("Mobility", "Rotation")) addFirstFrom("Mobility");
  return priorities;
}

function normaliseExerciseName(value: string) {
  return value.trim().toLowerCase();
}

function getGymTrainingNote(goal: string) {
  if (goal === "Strength") return "Main lifts stay first, then accessories fill gaps without golf-specific work.";
  if (goal === "Muscle") return "Volume and balanced muscle coverage take priority over sport carryover.";
  if (goal === "Speed / power") return "Power stays general: jumps, swings, sleds and fast controlled lifts.";
  if (goal === "Mobility") return "Mobility supports better lifting positions and recovery, not a golf swing model.";
  if (goal === "Fat loss") return "Repeatable sessions and conditioning matter more than complex exercise selection.";
  return "The split stays focused on normal gym progression.";
}

function getGolfTransferNote(priority: string) {
  if (priority === "Speed / distance" || priority === "Driving distance") return "Bias power, hinge strength and rotation work so speed changes can be compared with performance stats.";
  if (priority === "Rotation speed") return "Use rotational power and anti-rotation control so speed comes with stability.";
  if (priority === "Stability") return "Single-leg, carry and core work should make your swing base less noisy.";
  if (priority === "Injury prevention") return "Keep the plan balanced with mobility, posterior-chain work and controlled volume.";
  if (priority === "Endurance" || priority === "Late-round energy") return "Conditioning and carries help you keep output quality late in sessions and rounds.";
  return "Track lifts consistently so the app can connect training changes with performance outcomes.";
}

function getProtectionNote(limitation: string) {
  if (!limitation || limitation === "No issue") return "No major limitation selected. Keep warm-ups consistent and progress gradually.";
  return `The plan avoids being reckless around your ${limitation.toLowerCase()}. Use pain-free range and keep notes if anything flares up.`;
}
