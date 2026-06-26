import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Edit3, Plus, Trash2, X } from "lucide-react";
import { Button, Card, PageHeader, StatCard } from "@/components/ui";
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
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-black/40 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream px-6 py-8 text-[#171717]">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <PageHeader
            eyebrow="Gym History"
            title="Previous Workouts"
            description="Review, edit and clean up your recent gym sessions."
            tone="text-[#7A1F1F]"
          />

          <Link href="/workouts/submit">
            <a className="inline-flex items-center justify-center rounded-2xl bg-[#7A1F1F] px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-[#651919]">
              <Plus className="mr-2 h-4 w-4" />
              Submit Session
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
                  ? "bg-[#7A1F1F] text-white"
                  : "border border-black/10 bg-white text-black/60 hover:border-[#7A1F1F]/30"
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
          <Card className="p-10 text-center">
            <h2 className="mb-2 text-2xl font-bold text-[#7A1F1F]">
              No workouts yet
            </h2>
            <p className="mb-5 text-black/50">
              Submit a gym session and it'll appear here.
            </p>
            <Link href="/workouts/submit">
              <a className="inline-flex items-center justify-center rounded-2xl bg-[#7A1F1F] px-5 py-3 font-semibold text-white transition hover:bg-[#651919]">
                Submit First Session
              </a>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-5">
            {filteredWorkouts.map((workout, index) => (
              <Card
                key={workout.id || index}
                className="transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-[#7A1F1F]">
                      {workout.workout_name || "Workout"}
                    </h2>
                    <p className="text-black/50">{workout.date || "-"}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="w-fit rounded-full bg-[#7A1F1F]/10 px-4 py-2 text-sm font-semibold text-[#7A1F1F]">
                      {workout.exercises?.length || 0} exercises
                    </div>
                    <Button variant="secondary" onClick={() => openEditor(workout)}>
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3">
                  {(workout.exercises || []).map((exercise, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-1 items-center gap-3 rounded-2xl border border-black/5 bg-cream p-4 md:grid-cols-3"
                    >
                      <p className="font-semibold">{exercise.name}</p>
                      <p className="text-black/60">
                        {exercise.sets ? `${exercise.sets} sets` : "-"} x{" "}
                        {exercise.reps ? `${exercise.reps} reps` : "-"}
                      </p>
                      <p className="font-semibold text-[#7A1F1F] md:text-right">
                        {exercise.weight || "-"}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
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
          <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm uppercase tracking-[0.25em] text-[#7A1F1F]/70">
                  Edit Workout
                </p>
                <h2 className="text-4xl font-semibold text-[#7A1F1F]">
                  {editName || "Workout"}
                </h2>
              </div>
              <button
                onClick={() => setEditingWorkout(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-black/50 transition hover:bg-black/5 hover:text-black"
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
                <Card key={index} className="bg-cream p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-semibold text-[#7A1F1F]">Exercise {index + 1}</p>
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
                </Card>
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
                  className="bg-[#7A1F1F] hover:bg-[#651919]"
                >
                  {saving ? "Saving..." : "Save Workout"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
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
      <label className="mb-2 block text-sm text-black/50">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none focus:border-[#7A1F1F]"
      />
    </div>
  );
}
