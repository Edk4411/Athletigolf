import { useState } from "react";
import type { ExerciseLibraryItem } from "@/lib/exerciseLibrary";

interface ExerciseSelectorProps {
  exercises: ExerciseLibraryItem[];
  allowGolfSpecific: boolean;
  includeList: string[];
  avoidList: string[];
  onToggle: (type: "includeExercises" | "avoidExercises", value: string) => void;
}

export default function ExerciseSelector({
  exercises,
  allowGolfSpecific,
  includeList,
  avoidList,
  onToggle,
}: ExerciseSelectorProps) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = exercises
    .filter((e) => allowGolfSpecific || e.category !== "Golf-Specific")
    .filter((e) => {
      if (!q) return true;
      const hay = `${e.name} ${e.primaryMuscle} ${e.equipment} ${(e.secondaryMuscles || []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  const includeSet = new Set(includeList.map((v) => v.toLowerCase()));
  const avoidSet = new Set(avoidList.map((v) => v.toLowerCase()));

  return (
    <div className="rounded-xl border border-line bg-white/70 p-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search exercises..."
        className="mb-3 w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-pulse"
        data-testid="exercise-search"
      />
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-pulse/10 px-2 py-1 font-semibold text-pulse">Add: {includeList.length}</span>
        <span className="rounded-full bg-danger/10 px-2 py-1 font-semibold text-danger">Avoid: {avoidList.length}</span>
        <span className="text-muted">Tap Add or Avoid on each exercise</span>
      </div>
      <div className="max-h-[380px] space-y-2 overflow-y-auto pr-1" data-testid="exercise-selector-list">
        {visible.map((e) => {
          const inInclude = includeSet.has(e.name.toLowerCase());
          const inAvoid = avoidSet.has(e.name.toLowerCase());
          return (
            <div key={e.slug || e.name} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-panel px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-dark">{e.name}</p>
                <p className="truncate text-xs text-muted">{e.primaryMuscle} - {e.equipment}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onToggle("includeExercises", e.name)}
                  disabled={inAvoid}
                  data-testid={`add-btn-${e.name}`}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    inInclude ? "border-pulse bg-pulse text-white" : "border-pulse/40 text-pulse hover:bg-pulse/10"
                  } ${inAvoid ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  {inInclude ? "Added" : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => onToggle("avoidExercises", e.name)}
                  disabled={inInclude}
                  data-testid={`avoid-btn-${e.name}`}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    inAvoid ? "border-danger bg-danger text-white" : "border-danger/40 text-danger hover:bg-danger/10"
                  } ${inInclude ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  {inAvoid ? "Avoiding" : "Avoid"}
                </button>
              </div>
            </div>
          );
        })}
        {visible.length === 0 && <p className="text-sm text-muted">No exercises match that search.</p>}
      </div>
    </div>
  );
}
