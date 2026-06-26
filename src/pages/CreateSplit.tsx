import { useEffect, useState } from "react";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, FieldLabel, PageHeader, Surface, TextInput } from "@/components/ui";
import type { SplitDay } from "@/lib/types";

type SplitDayState = {
  id?: string;
  day: string;
  focus: string;
  exercises: string[];
};

const defaultSplit: SplitDayState[] = [
  { day: "Monday", focus: "Push", exercises: ["Bench Press", "Incline DB Press", "Shoulder Press", "Tricep Pushdown"] },
  { day: "Tuesday", focus: "Pull", exercises: ["Lat Pulldown", "Rows", "Rear Delts", "Incline Curls"] },
  { day: "Wednesday", focus: "Legs", exercises: ["Squats", "Leg Press", "Leg Curls", "Calf Raises"] },
  { day: "Thursday", focus: "Rest", exercises: ["Mobility", "Stretching", "Light Cardio"] },
  { day: "Friday", focus: "Upper", exercises: ["Machine Press", "Pulldown", "Lateral Raises", "Arms"] },
  { day: "Saturday", focus: "Lower", exercises: ["Leg Extension", "RDL", "Hamstring Curl", "Calves"] },
  { day: "Sunday", focus: "Rest", exercises: ["Recovery", "Walk", "Mobility"] },
];

export default function CreateSplit() {
  const [split, setSplit] = useState<SplitDayState[]>(defaultSplit);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editFocus, setEditFocus] = useState("");
  const [editExercises, setEditExercises] = useState<string[]>([]);
  const [draggedExercise, setDraggedExercise] = useState<number | null>(null);

  useEffect(() => {
    loadSplit();
  }, []);

  const loadSplit = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("split_days")
      .select("*")
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      const loaded = (data as SplitDay[]).map((d) => ({
        id: d.id,
        day: d.day_name || "",
        focus: d.split_name || "",
        exercises: d.exercises || [],
      }));
      setSplit(loaded);
    }
    setLoading(false);
  };

  const saveAll = async () => {
    setSaving(true);
    setSavedMessage("");

    await supabase.from("split_days").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const rows = split.map((day) => ({
      day_name: day.day,
      split_name: day.focus,
      exercises: day.exercises,
    }));

    const { error } = await supabase.from("split_days").insert(rows);
    setSaving(false);

    if (!error) {
      setSavedMessage("Split saved successfully");
      setTimeout(() => setSavedMessage(""), 3000);
      loadSplit();
    }
  };

  const openEditor = (index: number) => {
    setEditingIndex(index);
    setEditFocus(split[index].focus);
    setEditExercises(split[index].exercises);
  };

  const closeEditor = () => {
    setEditingIndex(null);
    setEditFocus("");
    setEditExercises([]);
    setDraggedExercise(null);
  };

  const updateExercise = (index: number, value: string) => {
    setEditExercises((prev) =>
      prev.map((exercise, i) => (i === index ? value : exercise))
    );
  };

  const addExercise = () => {
    setEditExercises((prev) => [...prev, ""]);
  };

  const removeExercise = (index: number) => {
    setEditExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const moveExercise = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    setEditExercises((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
    setDraggedExercise(toIndex);
  };

  const saveChanges = () => {
    if (editingIndex === null) return;

    const updated = [...split];

    updated[editingIndex] = {
      ...updated[editingIndex],
      focus: editFocus.trim() || "Rest",
      exercises: editExercises
        .map((exercise) => exercise.trim())
        .filter(Boolean),
    };

    setSplit(updated);
    closeEditor();
  };

  const editingDay = editingIndex !== null ? split[editingIndex] : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-lg text-muted">Loading your training board...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-5 md:px-8 md:py-7">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Performance Lab"
          title="Training Board"
          description="Design the week, set exercise order, and keep every session ready for fast logging."
          tone="text-lab"
          actions={
            <Button onClick={saveAll} disabled={saving} variant="pulse">
              {saving ? "Saving..." : "Save Board"}
            </Button>
          }
        />

        <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {split.map((day, index) => (
            <button
              key={day.day}
              onClick={() => openEditor(index)}
              className="flex h-full min-h-[370px] flex-col rounded-xl border border-line bg-panel p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-lab/35 hover:shadow-xl"
            >
              <div className="mb-4 rounded-lg bg-dark p-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse">{day.day}</p>
                <h2 className="mt-2 text-xl font-semibold">{day.focus}</h2>
              </div>

              <div className="flex-1 space-y-2">
                {day.exercises.length > 0 ? (
                  day.exercises.map((exercise, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-lg border border-line bg-steel/5 px-3 py-2"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-pulse" />
                      <p className="text-sm font-medium">{exercise}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-line bg-steel/5 px-4 py-3">
                    <p className="text-sm text-muted">No exercises yet</p>
                  </div>
                )}
              </div>

              <p className="mt-5 text-sm font-semibold text-lab">Click to edit</p>
            </button>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Surface className="flex-1">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-lab">Board logic</p>
            <h2 className="mb-2 text-2xl font-semibold text-dark">Make the split match your real week</h2>
            <p className="text-muted">
              Drag exercises inside each day to set the order they appear when
              you submit a training session.
            </p>
          </Surface>

          <div className="flex flex-col gap-3">
            {savedMessage && (
              <p className="text-sm font-medium text-golf">{savedMessage}</p>
            )}
            <Button
              onClick={saveAll}
              disabled={saving}
              variant="pulse"
            >
              {saving ? "Saving..." : "Save Board"}
            </Button>
          </div>
        </div>
      </div>

      {editingDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            onClick={closeEditor}
            className="absolute inset-0 bg-black/50"
          />

          <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-panel p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-lab">
                  Edit {editingDay.day}
                </p>
                <h2 className="text-3xl font-semibold text-dark">
                  {editFocus || "Training Day"}
                </h2>
              </div>

              <button
                onClick={closeEditor}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-steel/10 hover:text-dark"
                aria-label="Close editor"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6">
              <FieldLabel>Training focus</FieldLabel>
              <TextInput
                value={editFocus}
                onChange={(e) => setEditFocus(e.target.value)}
                placeholder="Push, Pull, Legs..."
              />
            </div>

            <div>
              <FieldLabel>Exercises</FieldLabel>
              <p className="mb-3 text-sm text-muted">
                Drag the handle to reorder exercises before saving the day.
              </p>

              <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
                {editExercises.map((exercise, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => setDraggedExercise(index)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (draggedExercise !== null) {
                        moveExercise(draggedExercise, index);
                      }
                    }}
                    onDragEnd={() => setDraggedExercise(null)}
                    className={`flex gap-3 rounded-lg border border-line bg-white p-2 transition ${
                      draggedExercise === index ? "scale-[0.99] opacity-70" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="flex cursor-grab items-center rounded-lg px-2 text-muted active:cursor-grabbing"
                      aria-label="Drag to reorder exercise"
                    >
                      <GripVertical className="h-5 w-5" />
                    </button>
                    <input
                      value={exercise}
                      onChange={(e) => updateExercise(index, e.target.value)}
                      placeholder="Exercise name"
                      className="flex-1 rounded-lg border border-transparent px-3 py-2 outline-none focus:border-pulse"
                    />

                    <button
                      onClick={() => removeExercise(index)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-line text-muted transition hover:border-danger hover:text-danger"
                      aria-label="Remove exercise"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <Button
                onClick={addExercise}
                variant="secondary"
                className="mt-4"
              >
                <Plus className="h-4 w-4" />
                Add Exercise
              </Button>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                onClick={closeEditor}
                variant="secondary"
              >
                Cancel
              </Button>

              <Button
                onClick={saveChanges}
                variant="pulse"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
