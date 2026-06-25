import { useState } from "react";
import { supabase } from "@/lib/supabase";

const GYM_RED = "#7A1F1F";

type ExerciseLog = {
  name: string;
  weight: string;
  sets: string;
  reps: string;
  notes: string;
};

const workoutTemplates: Record<string, string[]> = {
  Push: ["Bench Press", "Incline DB Press", "Shoulder Press", "Tricep Pushdown"],
  Pull: ["Lat Pulldown", "Rows", "Rear Delts", "Incline Curls"],
  Legs: ["Squats", "Leg Press", "Leg Curls", "Calf Raises"],
  Upper: ["Machine Press", "Pulldown", "Lateral Raises", "Arms"],
  Lower: ["Leg Extension", "RDL", "Hamstring Curl", "Calves"],
};

export default function SubmitSession() {
  const splitDays = Object.keys(workoutTemplates);
  const [selectedDay, setSelectedDay] = useState("");
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const selectDay = (day: string) => {
    setSelectedDay(day);
    setSubmitted(false);

    setExercises(
      workoutTemplates[day].map((exercise) => ({
        name: exercise,
        weight: "",
        sets: "",
        reps: "",
        notes: "",
      }))
    );
  };

  const updateExercise = (
    index: number,
    field: keyof ExerciseLog,
    value: string
  ) => {
    setExercises((prev) =>
      prev.map((exercise, i) =>
        i === index ? { ...exercise, [field]: value } : exercise
      )
    );
  };

  const addExercise = () => {
    setExercises((prev) => [
      ...prev,
      {
        name: "",
        weight: "",
        sets: "",
        reps: "",
        notes: "",
      },
    ]);
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
      exercises: exercises.filter((e) => e.name.trim() !== ""),
      notes: null,
    });
    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-cream p-8 md:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12">
          <p className="mb-4 text-xs uppercase tracking-[0.25em] text-[#7A1F1F]/70">
            Fitness
          </p>

          <h1 className="mb-4 text-5xl font-semibold text-[#7A1F1F]">
            Submit Gym Session
          </h1>

          <p className="text-lg text-black/60">
            Select your training day and log your performance.
          </p>
        </div>

        <div className="mb-12 grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {splitDays.map((day) => (
            <button
              key={day}
              onClick={() => selectDay(day)}
              className={`rounded-[2rem] border p-8 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                selectedDay === day
                  ? "border-[#7A1F1F] bg-[#7A1F1F] text-white"
                  : "border-[#7A1F1F]/10 bg-white text-black hover:border-[#7A1F1F]/30"
              }`}
            >
              <p
                className={
                  selectedDay === day ? "mb-2 text-white/60" : "mb-2 text-[#7A1F1F]/70"
                }
              >
                Workout
              </p>

              <h2 className="mb-3 text-3xl font-semibold">{day}</h2>

              <p className={selectedDay === day ? "text-white/70" : "text-black/60"}>
                Log sets, reps, weight and notes.
              </p>
            </button>
          ))}
        </div>

        {selectedDay && (
          <div className="rounded-[2rem] border border-[#7A1F1F]/10 bg-white p-8 shadow-sm">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="mb-2 text-sm uppercase tracking-[0.25em] text-[#7A1F1F]/70">
                  Workout Log
                </p>

                <h2 className="text-4xl font-semibold text-[#7A1F1F]">
                  {selectedDay} Session
                </h2>
              </div>

              <button
                onClick={addExercise}
                className="rounded-full border border-[#7A1F1F]/20 px-6 py-3 text-[#7A1F1F] transition hover:bg-[#7A1F1F]/5"
              >
                + Add Exercise
              </button>
            </div>

            <div className="grid gap-5">
              {exercises.map((exercise, index) => (
                <div
                  key={index}
                  className="rounded-[1.5rem] border border-[#7A1F1F]/10 bg-cream p-5"
                >
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <input
                      value={exercise.name}
                      onChange={(e) =>
                        updateExercise(index, "name", e.target.value)
                      }
                      placeholder="Exercise name"
                      className="w-full rounded-2xl border border-black/10 bg-white px-5 py-3 text-xl font-semibold outline-none focus:border-[#7A1F1F] md:max-w-sm"
                    />

                    <button
                      onClick={() => removeExercise(index)}
                      className="text-sm text-black/40 transition hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <input
                      value={exercise.weight}
                      onChange={(e) =>
                        updateExercise(index, "weight", e.target.value)
                      }
                      placeholder="Weight e.g. 75kg"
                      className="rounded-2xl border border-black/10 bg-white px-5 py-4 outline-none focus:border-[#7A1F1F]"
                    />

                    <input
                      value={exercise.sets}
                      onChange={(e) =>
                        updateExercise(index, "sets", e.target.value)
                      }
                      placeholder="Sets e.g. 3"
                      className="rounded-2xl border border-black/10 bg-white px-5 py-4 outline-none focus:border-[#7A1F1F]"
                    />

                    <input
                      value={exercise.reps}
                      onChange={(e) =>
                        updateExercise(index, "reps", e.target.value)
                      }
                      placeholder="Reps e.g. 8"
                      className="rounded-2xl border border-black/10 bg-white px-5 py-4 outline-none focus:border-[#7A1F1F]"
                    />

                    <input
                      value={exercise.notes}
                      onChange={(e) =>
                        updateExercise(index, "notes", e.target.value)
                      }
                      placeholder="Notes"
                      className="rounded-2xl border border-black/10 bg-white px-5 py-4 outline-none focus:border-[#7A1F1F]"
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={submitSession}
              disabled={saving}
              className="mt-8 rounded-full bg-[#7A1F1F] px-8 py-4 text-white transition hover:scale-105 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Submit Session"}
            </button>

            {saveError && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
                {saveError}
              </div>
            )}

            {submitted && (
              <div className="mt-6 rounded-2xl border border-[#7A1F1F]/10 bg-[#7A1F1F]/5 p-5">
                <p className="font-semibold text-[#7A1F1F]">
                  Session submitted successfully
                </p>
                <p className="mt-1 text-black/60">
                  Your {selectedDay} workout has been logged.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
