import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Activity, Dumbbell, Plus, Trash2 } from "lucide-react";
import ExercisePicker from "@/components/ExercisePicker";
import { Button, EmptyState, FieldLabel, PageHeader, StatusPill, Surface, TextInput } from "@/components/ui";
import { findExerciseFromList, inferExerciseMuscle, type ExerciseLibraryItem } from "@/lib/exerciseLibrary";
import { useExerciseLibrary } from "@/hooks/useExerciseLibrary";
import { isTrainingOnlyMode } from "@/lib/sportMode";
import { supabase } from "@/lib/supabase";
import type { OnboardingData, SplitDay } from "@/lib/types";

type ExerciseLog = {
  name: string;
  weight: string;
  sets: string;
  reps: string;
  notes: string;
};

type WorkoutOption = {
  id: string;
  name: string;
  exercises: string[];
};

export default function SubmitSession() {
  const [, navigate] = useLocation();
  const { exercises: libraryExercises } = useExerciseLibrary();
  const [workoutOptions, setWorkoutOptions] = useState<WorkoutOption[]>([]);
  const [loadingSplit, setLoadingSplit] = useState(true);
  const [selectedDay, setSelectedDay] = useState("");
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [allowGolfSpecific, setAllowGolfSpecific] = useState(true);

  useEffect(() => {
    const loadSplit = async () => {
      const [{ data, error }, { data: profile }] = await Promise.all([
        supabase
          .from("split_days")
          .select("*")
          .is("archived_at", null)
          .order("created_at", { ascending: true }),
        supabase.from("profiles").select("weight_unit, onboarding_data").maybeSingle(),
      ]);

      setWeightUnit(profile?.weight_unit === "lbs" ? "lbs" : "kg");
      const onboarding = (profile?.onboarding_data as OnboardingData | null) || null;
      setAllowGolfSpecific(!isTrainingOnlyMode(onboarding?.mainSport));

      if (!error && data && data.length > 0) {
        const savedOptions = (data as SplitDay[])
          .filter((day) => day.split_name && day.exercises?.length)
          .map((day) => ({
            id: day.id,
            name: `${day.day_name} - ${day.split_name}`,
            exercises: day.exercises,
          }));

        if (savedOptions.length > 0) setWorkoutOptions(savedOptions);
      } else {
        setWorkoutOptions([]);
      }

      setLoadingSplit(false);
    };

    loadSplit();
  }, []);

  const selectDay = (day: string) => {
    const selectedWorkout = workoutOptions.find((workout) => workout.name === day);
    if (!selectedWorkout) return;

    setSelectedDay(day);
    setSubmitted(false);
    setExercises(
      selectedWorkout.exercises.map((exercise) => ({
        name: exercise,
        weight: "",
        sets: "",
        reps: "",
        notes: "",
      }))
    );
  };

  const updateExercise = (index: number, field: keyof ExerciseLog, value: string) => {
    setExercises((prev) =>
      prev.map((exercise, i) => (i === index ? { ...exercise, [field]: value } : exercise))
    );
  };

  const addExercise = () => {
    setExercises((prev) => [...prev, { name: "", weight: "", sets: "", reps: "", notes: "" }]);
  };

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const submitSession = async () => {
    setSaving(true);
    setSaveError("");
    const { error } = await supabase.from("workouts").insert({
      date: new Date().toLocaleDateString("en-GB"),
      workout_name: selectedDay,
      exercises: exercises
        .filter((e) => e.name.trim() !== "")
        .map((exercise) => structureExerciseLog(exercise, libraryExercises)),
      notes: null,
    });
    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setSubmitted(true);
  };

  if (loadingSplit) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-lg text-muted">Loading your training board...</div>
      </div>
    );
  }

  const completedRows = exercises.filter((exercise) => exercise.name.trim() && (exercise.weight || exercise.sets || exercise.reps)).length;

  return (
    <main className="min-h-screen bg-cream px-4 py-5 md:px-8 md:py-7">
      <PageHeader
        eyebrow="Performance Lab"
        title="Training Console"
        description="Choose the planned session, log the work fast, and keep training load connected to golf performance."
        tone="text-lab"
        actions={<Button onClick={addExercise} variant="pulse"><Plus className="h-4 w-4" />Add Exercise</Button>}
      />

      <section className="grid gap-5 xl:grid-cols-[330px_1fr]">
        <Surface className="h-fit">
          <div className="mb-5 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-lab/10 text-lab">
              <Dumbbell className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-lab">Plan</p>
              <h2 className="text-xl font-semibold text-dark">Session select</h2>
            </div>
          </div>

          <div className="space-y-2">
            {workoutOptions.length > 0 ? workoutOptions.map((workout) => (
              <button
                key={workout.id}
                onClick={() => selectDay(workout.name)}
                className={`w-full rounded-lg border p-4 text-left transition ${
                  selectedDay === workout.name
                    ? "border-lab bg-lab text-white"
                    : "border-line bg-white hover:border-lab/30"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{workout.name}</h3>
                  <span className={selectedDay === workout.name ? "text-white/65" : "text-muted"}>
                    {workout.exercises.length}
                  </span>
                </div>
                <p className={selectedDay === workout.name ? "mt-2 text-sm text-white/65" : "mt-2 text-sm text-muted"}>
                  exercises loaded
                </p>
              </button>
            )) : (
              <EmptyState
                title="No saved split yet"
                description="Save a Training Board split first, then the planned days will appear here for fast workout logging."
                action={<Button type="button" variant="pulse" onClick={() => navigate("/workouts")}>Open Training Board</Button>}
              />
            )}
          </div>
        </Surface>

        <div className="space-y-5">
          <Surface className="bg-dark text-white">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <StatusPill tone="pulse">Live Session</StatusPill>
                <h2 className="mt-3 text-3xl font-semibold">
                  {selectedDay || "Select a session"}
                </h2>
                <p className="mt-2 text-sm text-white/58">
                  {selectedDay
                    ? `${completedRows}/${exercises.length} rows have performance data.`
                    : "Choose a training day from the board to start logging."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ConsoleMetric label="Exercises" value={exercises.length || "-"} />
                <ConsoleMetric label="Logged" value={completedRows || "-"} />
              </div>
            </div>
          </Surface>

          {selectedDay && (
            <Surface>
              <div className="mb-4 hidden grid-cols-[1.3fr_0.7fr_0.55fr_0.55fr_1fr_44px] gap-3 px-2 text-xs font-bold uppercase tracking-[0.16em] text-muted lg:grid">
                <span>Exercise</span>
                <span>Load</span>
                <span>Sets</span>
                <span>Reps</span>
                <span>Notes</span>
                <span />
              </div>

              <div className="space-y-3">
                {exercises.map((exercise, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-white p-3 lg:grid-cols-[1.3fr_0.7fr_0.55fr_0.55fr_1fr_44px] lg:items-end"
                  >
                    <div className="col-span-2 lg:col-span-1">
                      <ExercisePicker value={exercise.name} exercises={libraryExercises} allowGolfSpecific={allowGolfSpecific} onChange={(value) => updateExercise(index, "name", value)} placeholder="Exercise name" />
                    </div>
                    {findExerciseFromList(exercise.name, libraryExercises) && (
                      <p className="col-span-2 text-xs font-medium text-muted lg:hidden">
                        {findExerciseFromList(exercise.name, libraryExercises)?.primaryMuscle} | {findExerciseFromList(exercise.name, libraryExercises)?.equipment}
                      </p>
                    )}
                    <LogField label={`Load (${weightUnit})`} value={exercise.weight} onChange={(value) => updateExercise(index, "weight", value)} placeholder="75" />
                    <LogField label="Sets" value={exercise.sets} onChange={(value) => updateExercise(index, "sets", value)} placeholder="3" />
                    <LogField label="Reps" value={exercise.reps} onChange={(value) => updateExercise(index, "reps", value)} placeholder="8" />
                    <LogField className="col-span-2 lg:col-span-1" label="Notes" value={exercise.notes} onChange={(value) => updateExercise(index, "notes", value)} placeholder="RPE, tempo..." />
                    <button
                      onClick={() => removeExercise(index)}
                      className="col-span-2 inline-flex h-10 w-full items-center justify-center rounded-lg border border-line text-muted transition hover:border-danger hover:text-danger lg:col-span-1 lg:w-10"
                      aria-label="Remove exercise"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button onClick={addExercise} variant="secondary">
                  <Plus className="h-4 w-4" />Add Row
                </Button>
                <Button onClick={submitSession} disabled={saving} variant="pulse">
                  <Activity className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Training Session"}
                </Button>
              </div>

              {saveError && (
                <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                  {saveError}
                </div>
              )}

              {submitted && (
                <div className="mt-5 rounded-lg border border-pulse/20 bg-pulse/10 p-4">
                  <p className="font-semibold text-dark">Training session saved</p>
                  <p className="mt-1 text-sm text-muted">{selectedDay} has been added to your logbook.</p>
                </div>
              )}
            </Surface>
          )}
        </div>
      </section>
    </main>
  );
}

function structureExerciseLog(exercise: ExerciseLog, libraryExercises: ExerciseLibraryItem[]) {
  const weightValue = parseTrainingNumber(exercise.weight);
  const setsValue = parseTrainingNumber(exercise.sets);
  const repsValue = parseTrainingNumber(exercise.reps);
  const volume =
    weightValue !== null && setsValue !== null && repsValue !== null
      ? weightValue * setsValue * repsValue
      : null;

  return {
    ...exercise,
    name: exercise.name.trim(),
    weight: exercise.weight.trim(),
    sets: exercise.sets.trim(),
    reps: exercise.reps.trim(),
    notes: exercise.notes.trim(),
    weight_value: weightValue,
    sets_value: setsValue,
    reps_value: repsValue,
    volume,
    muscle_group: inferExerciseMuscle(exercise.name),
    library_match: findExerciseFromList(exercise.name, libraryExercises),
  };
}

function parseTrainingNumber(value: string) {
  const match = value.match(/[\d.]+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function ConsoleMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/8 p-4 text-center">
      <p className="text-xs uppercase tracking-[0.16em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function LogField({
  label,
  value,
  onChange,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <FieldLabel>{label}</FieldLabel>
      <TextInput value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}
