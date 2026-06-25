import { useEffect, useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import type { Workout } from "@/lib/types";

export default function PreviousWorkouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSplit, setSelectedSplit] = useState("All");

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

  const splitOptions = [
    "All",
    ...new Set(workouts.map((w) => w.workout_name).filter(Boolean) as string[]),
  ];

  const filteredWorkouts =
    selectedSplit === "All"
      ? workouts
      : workouts.filter((w) => w.workout_name === selectedSplit);

  const totalSessions = workouts.length;
  const totalExercises = workouts.reduce(
    (total, w) => total + (w.exercises?.length || 0),
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f3ea] flex items-center justify-center">
        <div className="text-black/40 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f3ea] text-[#171717] px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-8">
          <div>
            <p className="text-sm text-[#7A1F1F] font-semibold mb-1 tracking-[0.3em] uppercase">
              Gym History
            </p>
            <h1 className="text-[#7A1F1F] text-4xl md:text-5xl font-bold">
              Previous Workouts
            </h1>
            <p className="text-black/50 mt-2">
              Review your recent sessions, exercises, sets and weights.
            </p>
          </div>

          <Link href="/workouts/submit">
            <button className="bg-[#7A1F1F] text-white px-5 py-3 rounded-2xl font-semibold hover:bg-[#651919] transition shadow-sm">
              + Submit Session
            </button>
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {splitOptions.map((split) => (
            <button
              key={split}
              onClick={() => setSelectedSplit(split)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                selectedSplit === split
                  ? "bg-[#7A1F1F] text-white"
                  : "bg-white text-black/60 border border-black/10 hover:border-[#7A1F1F]/30"
              }`}
            >
              {split}
            </button>
          ))}
        </div>

        {filteredWorkouts.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-10 text-center border border-black/5">
            <h2 className="text-2xl font-bold text-[#7A1F1F] mb-2">
              No workouts yet
            </h2>
            <p className="text-black/50 mb-5">
              Submit a gym session and it'll appear here.
            </p>

            <Link href="/workouts/submit">
              <button className="bg-[#7A1F1F] text-white px-5 py-3 rounded-2xl font-semibold hover:bg-[#651919] transition">
                Submit First Session
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-5">
            {filteredWorkouts.map((workout, index) => (
              <div
                key={workout.id || index}
                className="bg-white rounded-[2rem] p-6 shadow-sm border border-black/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-2xl font-bold text-[#7A1F1F]">
                      {workout.workout_name || "Workout"}
                    </h2>
                    <p className="text-black/50">{workout.date || "-"}</p>
                  </div>

                  <div className="bg-[#7A1F1F]/10 text-[#7A1F1F] px-4 py-2 rounded-full text-sm font-semibold w-fit">
                    {workout.exercises?.length || 0} exercises
                  </div>
                </div>

                <div className="grid gap-3">
                  {(workout.exercises || []).map((exercise, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center bg-[#f7f3ea] rounded-2xl p-4 border border-black/5"
                    >
                      <p className="font-semibold">{exercise.name}</p>
                      <p className="text-black/60">
                        {exercise.sets ? `${exercise.sets} sets` : "-"} x{" "}
                        {exercise.reps ? `${exercise.reps} reps` : "-"}
                      </p>
                      <p className="font-semibold md:text-right text-[#7A1F1F]">
                        {exercise.weight || "-"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
