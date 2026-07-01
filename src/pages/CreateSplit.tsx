import { useEffect, useState } from "react";
import { Archive, Dumbbell, GripVertical, Info, Plus, Trash2, Wand2, X } from "lucide-react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button, FieldLabel, PageHeader, Surface, TextInput } from "@/components/ui";
import { getExerciseGuide } from "@/lib/exerciseLibrary";
import type { SplitDay } from "@/lib/types";

type SplitDayState = {
  id?: string;
  day: string;
  focus: string;
  exercises: string[];
};

const blankSplit: SplitDayState[] = [
  { day: "Monday", focus: "", exercises: [] },
  { day: "Tuesday", focus: "", exercises: [] },
  { day: "Wednesday", focus: "", exercises: [] },
  { day: "Thursday", focus: "", exercises: [] },
  { day: "Friday", focus: "", exercises: [] },
  { day: "Saturday", focus: "", exercises: [] },
  { day: "Sunday", focus: "", exercises: [] },
];

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
  const [, navigate] = useLocation();
  const [split, setSplit] = useState<SplitDayState[]>(defaultSplit);
  const [hasActiveSplit, setHasActiveSplit] = useState(false);
  const [showCreateChoice, setShowCreateChoice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [selectedExercise, setSelectedExercise] = useState("");

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
      .is("archived_at", null)
      .order("created_at", { ascending: true });

    if (data && data.length > 0) {
      setSplit((data as SplitDay[]).map(toSplitDayState));
      setHasActiveSplit(true);
      setShowCreateChoice(false);
    } else {
      setSplit(blankSplit);
      setHasActiveSplit(false);
      setShowCreateChoice(true);
    }
    setLoading(false);
  };

  const saveAll = async () => {
    setSaving(true);
    setSavedMessage("");

    await supabase.from("split_days").delete().is("archived_at", null);

    const rows = split.map((day) => ({
      day_name: day.day,
      split_name: day.focus,
      exercises: day.exercises,
      archived_at: null,
    }));

    const { error } = await supabase.from("split_days").insert(rows);
    setSaving(false);

    if (!error) {
      setSavedMessage("Split saved successfully");
      setHasActiveSplit(true);
      setShowCreateChoice(false);
      setTimeout(() => setSavedMessage(""), 3000);
      loadSplit();
    }
  };

  const archiveCurrentSplit = async () => {
    setBusyAction("archive");
    setSavedMessage("");
    const archivedAt = new Date().toISOString();
    const { error } = await supabase
      .from("split_days")
      .update({ archived_at: archivedAt })
      .is("archived_at", null);
    setBusyAction("");

    if (error) {
      setSavedMessage(error.message);
      return;
    }

    setSplit(defaultSplit);
    setHasActiveSplit(false);
    setShowCreateChoice(true);
    setSavedMessage("Current split archived");
    await loadSplit();
  };

  const removeCurrentSplit = async () => {
    const confirmed = window.confirm("Remove the current active split? Archived splits will stay saved.");
    if (!confirmed) return;

    setBusyAction("remove");
    const { error } = await supabase.from("split_days").delete().is("archived_at", null);
    setBusyAction("");

    if (error) {
      setSavedMessage(error.message);
      return;
    }

    setSplit(blankSplit);
    setHasActiveSplit(false);
    setShowCreateChoice(true);
    setSavedMessage("Current split removed");
    await loadSplit();
  };

  const startManualSplit = (starter: "blank" | "template") => {
    setSplit(starter === "blank" ? blankSplit : defaultSplit);
    setShowCreateChoice(false);
    setSavedMessage(starter === "blank" ? "Blank board ready. Build the week your way." : "Template board ready. Edit it, then save.");
  };

  const startNewSplit = () => {
    setSplit(blankSplit);
    setHasActiveSplit(false);
    setShowCreateChoice(true);
    setSavedMessage("");
  };

  const takeSplitQuiz = () => {
    navigate("/setup/gym?return=workouts");
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
  const selectedExerciseGuide = selectedExercise ? getExerciseGuide(selectedExercise) : null;
  const hasBoardContent = split.some((day) => day.focus.trim() || day.exercises.length > 0);
  const showBoard = hasBoardContent || !showCreateChoice;

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
            <>
              {!showCreateChoice && (
                <Button type="button" onClick={startNewSplit} variant="ghost">
                  <Plus className="h-4 w-4" />
                  New Split
                </Button>
              )}
              <Button type="button" onClick={() => navigate("/workouts/archive")} variant="secondary">
                <Archive className="h-4 w-4" />
                View Archived Splits
              </Button>
              {showBoard && hasActiveSplit && (
                <>
                  <Button type="button" onClick={takeSplitQuiz} variant="secondary">
                    <Wand2 className="h-4 w-4" />
                    Build with Quiz
                  </Button>
                  <Button onClick={saveAll} disabled={saving} variant="pulse">
                    {saving ? "Saving..." : "Save Board"}
                  </Button>
                </>
              )}
            </>
          }
        />

        {showCreateChoice && (
          <Surface className="mb-7 flex min-h-[420px] flex-col items-center justify-center border-dashed px-6 py-12 text-center">
            <div className="mb-6 flex gap-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-lab text-white">
                <Dumbbell className="h-5 w-5" />
              </div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-pulse text-white">
                <Wand2 className="h-5 w-5" />
              </div>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
              No Active Split
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-dark">
              You are not following a split currently
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted">
              Build one manually from a blank week, or take the quiz and AthletiGolf will save a generated split you can edit afterwards.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="primary" onClick={takeSplitQuiz}>
                <Wand2 className="h-4 w-4" />
                Take Split Quiz
              </Button>
              <Button type="button" variant="pulse" onClick={() => startManualSplit("blank")}>
                <Plus className="h-4 w-4" />
                Create Blank Split
              </Button>
            </div>
          </Surface>
        )}

        {showBoard ? (
          <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {split.map((day, index) => (
              <div
                key={day.day}
                onClick={() => openEditor(index)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") openEditor(index);
                }}
                className="flex h-full min-h-[370px] cursor-pointer flex-col rounded-xl border border-line bg-panel p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-lab/35 hover:shadow-xl"
              >
                <div className="mb-4 rounded-lg bg-dark p-4 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse">{day.day}</p>
                  <h2 className="mt-2 text-xl font-semibold">{day.focus || "No split set"}</h2>
                </div>

                <div className="flex-1 space-y-2">
                  {day.exercises.length > 0 ? (
                    day.exercises.map((exercise, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedExercise(exercise);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg border border-line bg-steel/5 px-3 py-2 text-left transition hover:border-pulse/40 hover:bg-pulse/10"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-pulse" />
                        <p className="flex-1 text-sm font-medium">{exercise}</p>
                        <Info className="h-3.5 w-3.5 text-muted" />
                      </button>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-line bg-steel/5 px-4 py-3">
                      <p className="text-sm text-muted">No exercises yet</p>
                    </div>
                  )}
                </div>

                <p className="mt-5 text-sm font-semibold text-lab">Click to edit</p>
              </div>
            ))}
          </div>
        ) : !showCreateChoice ? (
          <Surface className="border-dashed text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
              No Active Split
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-dark">
              You are not following a split currently
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted">
              Create one manually, use the template, or take the quiz to save a generated split.
            </p>
          </Surface>
        ) : null}

        {showBoard && hasActiveSplit && (
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Surface className="flex-1">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-lab">Board logic</p>
            <h2 className="mb-2 text-2xl font-semibold text-dark">Make the split match your real week</h2>
            <p className="text-muted">
              Drag exercises inside each day to set the order they appear when
              you submit a training session.
            </p>
          </Surface>

          <div className="flex flex-col gap-3 sm:min-w-[220px]">
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
            <Button
              onClick={archiveCurrentSplit}
              disabled={busyAction === "archive"}
              variant="secondary"
            >
              <Archive className="h-4 w-4" />
              {busyAction === "archive" ? "Archiving..." : "Archive Current"}
            </Button>
            <Button
              onClick={removeCurrentSplit}
              disabled={busyAction === "remove"}
              variant="danger"
            >
              <Trash2 className="h-4 w-4" />
              {busyAction === "remove" ? "Removing..." : "Remove Current"}
            </Button>
          </div>
        </div>
        )}

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
                      type="button"
                      onClick={() => setSelectedExercise(exercise)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-line text-muted transition hover:border-pulse hover:text-pulse"
                      aria-label="View exercise guide"
                    >
                      <Info className="h-4 w-4" />
                    </button>

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

      {selectedExerciseGuide && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
          <div
            onClick={() => setSelectedExercise("")}
            className="absolute inset-0 bg-black/55"
          />

          <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-line bg-panel p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-pulse">
                  Exercise Guide
                </p>
                <h2 className="text-3xl font-semibold text-dark">{selectedExerciseGuide.name}</h2>
                <p className="mt-2 text-sm text-muted">
                  {selectedExerciseGuide.primaryMuscle}
                  {selectedExerciseGuide.secondaryMuscles.length > 0 &&
                    ` + ${selectedExerciseGuide.secondaryMuscles.join(", ")}`}
                </p>
              </div>
              <button
                onClick={() => setSelectedExercise("")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-steel/10 hover:text-dark"
                aria-label="Close exercise guide"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InfoPanel title="Equipment" items={[selectedExerciseGuide.equipment]} />
              <InfoPanel title="Golf Benefit" items={[selectedExerciseGuide.golfCarryover]} />
              <InfoPanel title="Form Cues" items={selectedExerciseGuide.formCues} />
              <InfoPanel title="Common Mistakes" items={selectedExerciseGuide.commonMistakes} />
            </div>

            {selectedExerciseGuide.alternatives.length > 0 && (
              <div className="mt-5 rounded-xl border border-line bg-white/55 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">Alternatives</p>
                <div className="flex flex-wrap gap-2">
                  {selectedExerciseGuide.alternatives.map((alternative) => (
                    <button
                      type="button"
                      key={alternative}
                      onClick={() => setSelectedExercise(alternative)}
                      className="rounded-full border border-line bg-panel px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-pulse hover:text-pulse"
                    >
                      {alternative}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <a
              href={selectedExerciseGuide.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-dark px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-steel"
            >
              Watch Form Videos
            </a>

            {!selectedExerciseGuide.isLibraryMatch && (
              <p className="mt-4 text-sm text-muted">
                This exercise is not fully in the curated library yet, so AthletiGolf is showing a safe generic guide and a form-video search.
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function InfoPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-line bg-white/55 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-muted">{title}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="text-sm leading-relaxed text-ink">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function toSplitDayState(day: SplitDay): SplitDayState {
  return {
    id: day.id,
    day: day.day_name || "",
    focus: day.split_name || "",
    exercises: day.exercises || [],
  };
}
