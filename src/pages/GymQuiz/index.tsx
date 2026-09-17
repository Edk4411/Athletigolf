import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui";
import { useExerciseLibrary } from "@/hooks/useExerciseLibrary";
import { isGolfOnlyMode, isTrainingOnlyMode, type SportMode } from "@/lib/sportMode";
import { supabase } from "@/lib/supabase";
import type { OnboardingData } from "@/lib/types";
import { 
  buildTrainingPlan, 
  normaliseExerciseName, 
  weekDays, 
  type TrainingData 
} from "@/lib/matching/splitGenerator";
import StepCard from "./components/StepCard";
import DayLayoutSelector from "./components/DayLayoutSelector";
import ExerciseSelector from "./components/ExerciseSelector";

const generatedSplitStorageKey = "athletigolf.generatedSplitDraft";
const generatedSplitSourceKey = "athletigolf.generatedSplitSource";

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
  const [prefConflict, setPrefConflict] = useState("");
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

    return () => { cancelled = true; };
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
  const returnToWorkouts = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("return") === "workouts";

  const choose = (value: string) => {
    if (!current || current.multi || current.custom) return;
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

  const continueFromMultiStep = () => setStep((prev) => prev + 1);
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
    setPrefConflict("");
    setData((prev) => {
      const alreadyUsedBy = Object.entries(prev.preferredDays).find(([otherFocus, otherDay]) => otherFocus !== focus && otherDay === day);
      if (day && alreadyUsedBy) {
        setPrefConflict(`${day} is already assigned to ${alreadyUsedBy[0]}. Choose a different day before continuing.`);
        return prev;
      }
      return {
        ...prev,
        preferredDays: day ? { ...prev.preferredDays, [focus]: day } : Object.fromEntries(Object.entries(prev.preferredDays).filter(([key]) => key !== focus)),
      };
    });
  };

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
            <Button type="button" variant="golf" onClick={() => navigate("/golf")}>Open Golf</Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/workouts")}>Open Training Board</Button>
          </div>
        </div>
      </div>
    );
  }

  const saveGeneratedSplit = async () => {
    const trainingDays = plan.days.filter((day) => day.focus !== "Rest");
    if (new Set(trainingDays.map((day) => day.day)).size !== trainingDays.length) {
      setSaveError("Each training session must be on a unique day. Adjust the day layout and try again.");
      return;
    }
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
    <div className="min-h-screen bg-cream px-3 py-4 text-ink sm:flex sm:items-center sm:justify-center sm:p-6">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-line bg-panel p-4 shadow-sm sm:p-6 md:p-8">
        <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-pulse">Performance Lab Setup</p>
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
          <div className="space-y-4">
            <StepCard
              eyebrow={current.eyebrow}
              title={current.title}
              detail={current.detail}
            >
              {current.custom === "dayPreferences" ? (
                <>
                  <DayLayoutSelector data={data} gymOnly={gymOnly} onChange={setPreferredDay} />
                  {prefConflict && <p className="rounded-lg border border-danger/20 bg-danger/10 p-2 text-sm font-semibold text-danger">{prefConflict}</p>}
                  <Button type="button" variant="primary" onClick={continueFromMultiStep}>Continue</Button>
                </>
              ) : current.custom === "exercisePreferences" ? (
                <>
                  <ExerciseSelector
                    exercises={exercises}
                    allowGolfSpecific={!gymOnly}
                    includeList={data.includeExercises}
                    avoidList={data.avoidExercises}
                    onToggle={toggleExercisePreference}
                  />
                  {prefConflict && (
                    <p className="mt-2 rounded-lg border border-danger/20 bg-danger/10 p-2 text-sm font-semibold text-danger">
                      {prefConflict}
                    </p>
                  )}
                  <Button type="button" variant="primary" onClick={continueFromMultiStep}>Continue</Button>
                </>
              ) : current.multi ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {current.options.map((option) => {
                      const selected = data.restDays.includes(option);
                      return (
                        <button key={option} type="button" onClick={() => toggleRestDay(option)}
                          className={`flex w-full items-center justify-between rounded-xl border p-4 text-left font-semibold transition ${
                            selected ? "border-pulse bg-pulse/15 text-dark" : "border-line bg-white/70 text-dark hover:border-pulse hover:bg-pulse/10"
                          }`}>
                          {option}
                          <span className="text-sm text-muted">{selected ? "Rest" : "Available"}</span>
                        </button>
                      );
                    })}
                  </div>
                  <Button type="button" variant="primary" onClick={continueFromMultiStep}>Continue</Button>
                </>
              ) : (
                current.options.map((option) => (
                  <button key={option} type="button" onClick={() => choose(option)}
                    className="flex w-full items-center justify-between rounded-xl border border-line bg-white/70 p-4 text-left font-semibold text-dark transition hover:border-pulse hover:bg-pulse/10">
                    {option}
                    <span className="text-sm text-muted">Select</span>
                  </button>
                ))
              )}
            </StepCard>
            <div className="border-t border-line pt-3">
              <Button type="button" variant="ghost" onClick={goBack}>
                {step === 0 ? "Exit Builder" : "Back"}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="rounded-xl border border-lab/20 bg-lab/10 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-pulse">Generated Training Board</p>
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
              <div className="mt-5 rounded-lg border border-danger/25 bg-danger/10 p-4 text-sm font-semibold text-danger">{saveError}</div>
            )}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="primary" onClick={saveGeneratedSplit} disabled={saving}>{saving ? "Saving Split..." : "Save Split"}</Button>
              <Button type="button" variant="secondary" onClick={goBack} disabled={saving}>Back to Questions</Button>
              <Button type="button" variant="secondary" onClick={() => setStep(0)} disabled={saving}>Retake Quiz</Button>
              <Button type="button" variant="ghost" onClick={() => navigate("/workouts")} disabled={saving}>Back to Board</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
