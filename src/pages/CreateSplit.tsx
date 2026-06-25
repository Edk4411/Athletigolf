import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-black/40 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream p-8 md:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12">
          <p className="mb-4 text-xs uppercase tracking-[0.25em] text-[#7A1F1F]/70">
            Fitness
          </p>

          <h1 className="mb-4 text-5xl font-semibold text-[#7A1F1F]">
            Create Your Split
          </h1>

          <p className="text-lg text-black/60">
            Build your weekly training timetable so AthletiGolf can track your
            gym progression.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 items-stretch">
          {split.map((day, index) => (
            <button
              key={day.day}
              onClick={() => openEditor(index)}
              className="flex h-full min-h-[390px] flex-col rounded-[2rem] border border-[#7A1F1F]/10 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-5 rounded-2xl bg-[#7A1F1F] p-4 text-white">
                <p className="text-sm text-white/60">{day.day}</p>
                <h2 className="text-2xl font-semibold">{day.focus}</h2>
              </div>

              <div className="flex-1 space-y-3">
                {day.exercises.length > 0 ? (
                  day.exercises.map((exercise, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-[#7A1F1F]/10 bg-cream px-4 py-3"
                    >
                      <p className="text-sm font-medium">{exercise}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-[#7A1F1F]/10 bg-cream px-4 py-3">
                    <p className="text-sm text-black/50">No exercises yet</p>
                  </div>
                )}
              </div>

              <p className="mt-5 text-sm text-[#7A1F1F]/70">Click to edit</p>
            </button>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="rounded-[2rem] border border-[#7A1F1F]/10 bg-white p-6 shadow-sm flex-1">
            <p className="mb-2 text-sm text-[#7A1F1F]/70">Tip</p>
            <h2 className="mb-2 text-2xl font-semibold">
              Make your split match your week
            </h2>
            <p className="text-black/60">
              Put your actual training days in here, then later this can link
              directly to Submit Workout.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {savedMessage && (
              <p className="text-sm font-medium text-[#1F4D3A]">{savedMessage}</p>
            )}
            <button
              onClick={saveAll}
              disabled={saving}
              className="rounded-2xl bg-[#7A1F1F] px-8 py-4 text-white font-semibold transition hover:scale-[1.02] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Split"}
            </button>
          </div>
        </div>
      </div>

      {editingDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            onClick={closeEditor}
            className="absolute inset-0 bg-black/50"
          />

          <div className="relative z-10 w-full max-w-xl rounded-[2rem] bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm uppercase tracking-[0.25em] text-[#7A1F1F]/70">
                  Edit {editingDay.day}
                </p>
                <h2 className="text-4xl font-semibold text-[#7A1F1F]">
                  {editFocus || "Training Day"}
                </h2>
              </div>

              <button
                onClick={closeEditor}
                className="rounded-xl px-3 py-2 text-2xl text-black/50 transition hover:bg-black/5 hover:text-black"
              >
                X
              </button>
            </div>

            <div className="mb-6">
              <label className="mb-2 block text-sm text-black/50">
                Split Name
              </label>
              <input
                value={editFocus}
                onChange={(e) => setEditFocus(e.target.value)}
                placeholder="Push, Pull, Legs..."
                className="w-full rounded-2xl border border-black/10 px-5 py-4 outline-none focus:border-[#7A1F1F]"
              />
            </div>

            <div>
              <label className="mb-3 block text-sm text-black/50">
                Exercises
              </label>

              <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
                {editExercises.map((exercise, index) => (
                  <div key={index} className="flex gap-3">
                    <input
                      value={exercise}
                      onChange={(e) => updateExercise(index, e.target.value)}
                      placeholder="Exercise name"
                      className="flex-1 rounded-2xl border border-black/10 px-5 py-3 outline-none focus:border-[#7A1F1F]"
                    />

                    <button
                      onClick={() => removeExercise(index)}
                      className="rounded-2xl border border-black/10 px-4 text-black/50 transition hover:border-red-500 hover:text-red-500"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addExercise}
                className="mt-4 rounded-2xl border border-[#7A1F1F]/20 px-5 py-3 text-[#7A1F1F] transition hover:bg-[#7A1F1F]/5"
              >
                + Add Exercise
              </button>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={closeEditor}
                className="rounded-2xl border border-black/10 px-6 py-3 transition hover:bg-black/5"
              >
                Cancel
              </button>

              <button
                onClick={saveChanges}
                className="rounded-2xl bg-[#7A1F1F] px-6 py-3 text-white transition hover:scale-[1.02]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
