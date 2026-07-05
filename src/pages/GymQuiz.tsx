import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui";
import { isGolfOnlyMode, isTrainingOnlyMode, type SportMode } from "@/lib/sportMode";
import { supabase } from "@/lib/supabase";
import type { OnboardingData } from "@/lib/types";

interface TrainingData {
  equipment: string;
  experience: string;
  frequency: string;
  restDays: string[];
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

type QuizStep = {
  key: keyof TrainingData;
  eyebrow: string;
  title: string;
  detail: string;
  options: string[];
  multi?: boolean;
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
    key: "restDays",
    eyebrow: "Rest Days",
    title: "Are there any days you need to keep free?",
    detail: "Pick any days that should stay as rest days. The split will work around these where possible.",
    options: weekDays,
    multi: true,
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
  const [step, setStep] = useState(0);
  const [sportMode, setSportMode] = useState<SportMode>("both");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [data, setData] = useState<TrainingData>({
    equipment: "",
    experience: "",
    frequency: "",
    restDays: [],
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
  const activeSteps = gymOnly ? steps.filter((quizStep) => quizStep.key !== "golfPriority") : steps;
  const current = activeSteps[step];
  const complete = step >= activeSteps.length;
  const plan = buildTrainingPlan(data, gymOnly ? "gym" : "athletic");
  const returnToWorkouts =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("return") === "workouts";

  const choose = (value: string) => {
    if (!current) return;
    if (current.multi) return;
    setData((prev) => ({ ...prev, [current.key]: value }));
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
              {current.multi ? (
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

  return fillWeek(applyProtectedRestDays(trainingDays, data.restDays));
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

function applyProtectedRestDays(trainingDays: GeneratedDay[], restDays: string[]): GeneratedDay[] {
  if (restDays.length === 0) return trainingDays;

  const protectedDays = new Set(restDays);
  const usedDays = new Set(trainingDays.map((day) => day.day));
  const availableDays = weekDays.filter((day) => !protectedDays.has(day));

  return trainingDays.map((trainingDay) => {
    if (!protectedDays.has(trainingDay.day)) return trainingDay;

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

  blocks.forEach((block) => {
    const options = library[block] || [];
    const next = options.find((exercise) => !picked.includes(exercise));
    if (next) picked.push(next);
  });

  getPriorityExercises(data, mode).forEach((exercise) => {
    if (picked.length < count && !picked.includes(exercise)) picked.push(exercise);
  });

  Object.values(library).flat().forEach((exercise) => {
    if (picked.length < count && !picked.includes(exercise)) picked.push(exercise);
  });

  return picked.slice(0, count);
}

function getExerciseLibrary(data: TrainingData, mode: SplitBuilderMode): Record<string, string[]> {
  if (data.equipment === "Bodyweight only") {
    return {
      Push: ["Push Ups", "Pike Push Ups", "Close-Grip Push Ups"],
      Pull: ["Towel Rows", "Reverse Snow Angels", "Prone Y Raises"],
      Lower: ["Split Squats", "Squats", "Step Ups"],
      Hinge: ["Single-Leg RDL", "Glute Bridge", "Hip Hinge Drill"],
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
    "Single Leg": ["Bulgarian Split Squat", "Walking Lunge", "Step Up"],
    Shoulder: ["Shoulder Press", "Lateral Raise", "Face Pull"],
    Core: ["Cable Crunch", "Pallof Press", "Side Plank"],
    Rotation: mode === "gym" ? ["Cable Core Rotation", "Pallof Press", "Dead Bug"] : ["Cable Wood Chop", "Landmine Rotation", "Pallof Press"],
    Power: mode === "gym" ? ["Kettlebell Swing", "Trap Bar Jump", "Sled Push"] : ["Med Ball Rotational Throw", "Trap Bar Jump", "Kettlebell Swing"],
    Mobility: ["Thoracic Rotations", "Hip Airplanes", "Couch Stretch"],
    Carry: ["Farmer Carry", "Suitcase Carry", "Sled Push"],
  };
}

function getPriorityExercises(data: TrainingData, mode: SplitBuilderMode) {
  const priorities: string[] = [];
  if (data.goal === "Strength") priorities.push("Bench Press", "Squat", "RDL");
  if (data.goal === "Muscle") priorities.push("Incline DB Press", "Lat Pulldown", "Leg Press");
  if (data.goal === "Speed / power") priorities.push(mode === "gym" ? "Kettlebell Swing" : "Med Ball Rotational Throw", "Kettlebell Swing", "Trap Bar Jump");
  if (data.goal === "Mobility") priorities.push("Thoracic Rotations", "Hip Airplanes", "Pallof Press");
  if (mode === "athletic") {
    if (data.golfPriority === "Speed / distance" || data.golfPriority === "Driving distance") priorities.push("Med Ball Rotational Throw", "RDL", "Cable Wood Chop");
    if (data.golfPriority === "Rotation speed") priorities.push("Landmine Rotation", "Cable Wood Chop", "Pallof Press");
    if (data.golfPriority === "Stability") priorities.push("Pallof Press", "Suitcase Carry", "Side Plank");
  }
  if (data.weakLink === "Core / rotation") priorities.push(mode === "gym" ? "Cable Core Rotation" : "Cable Wood Chop", "Pallof Press", "Side Plank");
  if (data.weakLink === "Mobility") priorities.push("Thoracic Rotations", "Hip Flow", "90/90 Switches");
  return priorities;
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
