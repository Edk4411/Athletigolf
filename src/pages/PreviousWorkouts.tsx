import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Edit3, Plus, Trash2, X } from "lucide-react";
import { Button, FieldLabel, PageHeader, StatCard, Surface, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { ExerciseLog, Workout } from "@/lib/types";

const emptyExercise: ExerciseLog = {
  name: "",
  weight: "",
  sets: "",
  reps: "",
  notes: "",
};

export default function PreviousWorkouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSplit, setSelectedSplit] = useState("All");
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editExercises, setEditExercises] = useState<ExerciseLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("workouts")
      .select("*")
      .order("created_at", { ascending: false });
    setWorkouts((data as Workout[]) || []);
    setLoading(false);
  };

  const openEditor = (workout: Workout) => {
    setError("");
    setEditingWorkout(workout);
    setEditName(workout.workout_name || "");
    setEditDate(workout.date || "");
    setEditExercises(workout.exercises?.length ? workout.exercises : [{ ...emptyExercise }]);
  };

  const updateExercise = (index: number, field: keyof ExerciseLog, value: string) => {
    setEditExercises((prev) =>
      prev.map((exercise, i) => (i === index ? { ...exercise, [field]: value } : exercise))
    );
  };

  const saveWorkout = async () => {
    if (!editingWorkout) return;

    const exercises = editExercises
      .map((exercise) => ({
        ...exercise,
        name: exercise.name.trim(),
        weight: exercise.weight.trim(),
        sets: exercise.sets.trim(),
        reps: exercise.reps.trim(),
        notes: exercise.notes.trim(),
      }))
      .filter((exercise) => exercise.name);

    setSaving(true);
    setError("");

    const { error } = await supabase
      .from("workouts")
      .update({
        workout_name: editName || null,
        date: editDate || null,
        exercises,
      })
      .eq("id", editingWorkout.id);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setEditingWorkout(null);
    await loadWorkouts();
  };

  const deleteWorkout = async (workout: Workout) => {
    const confirmed = window.confirm(
      `Delete ${workout.workout_name || "this workout"}? This cannot be undone.`
    );
    if (!confirmed) return;

    const { error } = await supabase.from("workouts").delete().eq("id", workout.id);

    if (error) {
      setError(error.message);
      return;
    }

    setEditingWorkout(null);
    setWorkouts((prev) => prev.filter((item) => item.id !== workout.id));
  };

  const splitOptions = [
    "All",
    ...new Set(workouts.map((w) => w.workout_name).filter(Boolean) as string[]),
  ];

  const filteredWorkouts =
    selectedSplit === "All"
      ? workouts
      : workouts.filter((w) => w.workout_name === selectedSplit);

  const totalExercises = workouts.reduce(
    (total, workout) => total + (workout.exercises?.length || 0),
    0
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-lg text-muted">Loading your training logbook...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-5 text-ink md:px-8 md:py-7">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <PageHeader
            eyebrow="Performance Lab"
            title="Training Logbook"
            description="Review, edit and clean up the strength sessions feeding your golf performance."
            tone="text-lab"
          />

          <Link href="/workouts/submit">
            <a className="inline-flex items-center justify-center gap-2 rounded-lg bg-pulse px-5 py-3 font-semibold text-dark shadow-sm transition hover:-translate-y-0.5 hover:bg-pulse/85">
              <Plus className="mr-2 h-4 w-4" />
              Log Session
            </a>
          </Link>
        </div>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <StatCard label="Total Sessions" value={workouts.length} tone="bg-white" />
          <StatCard label="Total Exercises" value={totalExercises} tone="bg-white" />
          <StatCard label="Split Types" value={splitOptions.length - 1} tone="bg-white" />
        </section>

        <div className="mb-6 flex flex-wrap gap-2">
          {splitOptions.map((split) => (
            <button
              key={split}
              onClick={() => setSelectedSplit(split)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedSplit === split
                  ? "bg-dark text-white"
                  : "border border-line bg-white text-muted hover:border-lab/30"
              }`}
            >
              {split}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {error}
          </div>
        )}

        {filteredWorkouts.length === 0 ? (
          <Surface className="p-10 text-center">
            <h2 className="mb-2 text-2xl font-bold text-dark">No sessions yet</h2>
            <p className="mb-5 text-muted">
              Log a training session and it'll appear here.
            </p>
            <Link href="/workouts/submit">
              <a className="inline-flex items-center justify-center rounded-lg bg-pulse px-5 py-3 font-semibold text-dark transition hover:bg-pulse/85">
                Log First Session
              </a>
            </Link>
          </Surface>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-sm">
            <div className="hidden grid-cols-[1fr_120px_120px_110px] gap-4 border-b border-line bg-steel/5 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-muted md:grid">
              <span>Session</span>
              <span>Date</span>
              <span>Exercises</span>
              <span />
            </div>
            {filteredWorkouts.map((workout, index) => (
              <article
                key={workout.id || index}
                className="border-b border-line p-5 last:border-b-0 hover:bg-steel/5"
              >
                <div className="grid gap-4 md:grid-cols-[1fr_120px_120px_110px] md:items-center">
                  <div>
                    <h2 className="text-xl font-bold text-dark">
                      {workout.workout_name || "Workout"}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      {(workout.exercises || []).slice(0, 3).map((exercise) => exercise.name).join(", ") || "No exercises recorded"}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-muted">{workout.date || "-"}</p>
                  <div className="w-fit rounded-full bg-lab/10 px-3 py-1.5 text-sm font-semibold text-lab">
                    {workout.exercises?.length || 0} exercises
                  </div>
                  <Button variant="secondary" onClick={() => openEditor(workout)}>
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {editingWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <button
            onClick={() => setEditingWorkout(null)}
            className="absolute inset-0 bg-black/50"
            aria-label="Close workout editor"
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-panel p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-lab">Edit Session</p>
                <h2 className="text-3xl font-semibold text-dark">{editName || "Training Session"}</h2>
              </div>
              <button
                onClick={() => setEditingWorkout(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-steel/10 hover:text-dark"
                aria-label="Close workout editor"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-2">
              <Field label="Workout name" value={editName} onChange={setEditName} />
              <Field label="Date" value={editDate} onChange={setEditDate} />
            </div>

            <div className="space-y-4">
              {editExercises.map((exercise, index) => (
                <Surface key={index} className="bg-steel/5 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-semibold text-lab">Exercise {index + 1}</p>
                    <button
                      onClick={() =>
                        setEditExercises((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-5">
                    <Field
                      label="Name"
                      value={exercise.name}
                      onChange={(value) => updateExercise(index, "name", value)}
                    />
                    <Field
                      label="Weight"
                      value={exercise.weight}
                      onChange={(value) => updateExercise(index, "weight", value)}
                    />
                    <Field
                      label="Sets"
                      value={exercise.sets}
                      onChange={(value) => updateExercise(index, "sets", value)}
                    />
                    <Field
                      label="Reps"
                      value={exercise.reps}
                      onChange={(value) => updateExercise(index, "reps", value)}
                    />
                    <Field
                      label="Notes"
                      value={exercise.notes}
                      onChange={(value) => updateExercise(index, "notes", value)}
                    />
                  </div>
                </Surface>
              ))}
            </div>

            <Button
              variant="secondary"
              onClick={() => setEditExercises((prev) => [...prev, { ...emptyExercise }])}
              className="mt-4"
            >
              <Plus className="h-4 w-4" />
              Add Exercise
            </Button>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button variant="danger" onClick={() => deleteWorkout(editingWorkout)}>
                <Trash2 className="h-4 w-4" />
                Delete Workout
              </Button>
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button variant="secondary" onClick={() => setEditingWorkout(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={saveWorkout}
                  disabled={saving}
                  variant="pulse"
                >
                  {saving ? "Saving..." : "Save Session"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <TextInput
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
