import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Button, FieldLabel, TextInput } from "@/components/ui";
import { slugifyExerciseName, type ExerciseLibraryItem } from "@/lib/exerciseLibrary";

type ExercisePickerProps = {
  label?: string;
  value: string;
  placeholder?: string;
  exercises: ExerciseLibraryItem[];
  allowGolfSpecific?: boolean;
  onChange: (value: string) => void;
  onSelect?: (exercise: ExerciseLibraryItem) => void;
};

export default function ExercisePicker({
  label = "Exercise",
  value,
  placeholder = "Search exercise",
  exercises,
  allowGolfSpecific = true,
  onChange,
  onSelect,
}: ExercisePickerProps) {
  const [focused, setFocused] = useState(false);
  const query = value.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (query.length < 2) return [];
    return exercises
      .filter((exercise) => {
        const isGolfSpecific = exercise.category === "Golf-Specific";
        if (!allowGolfSpecific && isGolfSpecific && exercise.name.toLowerCase() !== query) return false;
        const haystack = [
          exercise.name,
          exercise.category,
          exercise.primaryMuscle,
          exercise.equipment,
          exercise.movement,
          ...(exercise.secondaryMuscles || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 7);
  }, [exercises, query]);

  const exactMatch = suggestions.some((exercise) => exercise.name.toLowerCase() === query);
  const showPanel = focused && query.length >= 2;

  return (
    <div className="relative">
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <TextInput
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          placeholder={placeholder}
          className="pl-9"
        />
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-line bg-panel p-2 shadow-xl">
          {suggestions.length > 0 ? (
            suggestions.map((exercise) => (
              <button
                type="button"
                key={exercise.slug || slugifyExerciseName(exercise.name)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(exercise.name);
                  onSelect?.(exercise);
                  setFocused(false);
                }}
                className="w-full rounded-lg px-3 py-2 text-left transition hover:bg-pulse/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-dark">{exercise.name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {exercise.primaryMuscle} | {exercise.equipment}
                    </p>
                  </div>
                  {exercise.golfRelevant && (
                    <span className="rounded-full bg-golf/10 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-golf">
                      Golf
                    </span>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-line p-3 text-sm text-muted">
              No close match yet. You can still save this as a custom exercise.
            </div>
          )}

          {!exactMatch && value.trim() && (
            <Button
              type="button"
              variant="ghost"
              className="mt-2 w-full justify-start"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setFocused(false)}
            >
              <Sparkles className="h-4 w-4" />
              Use custom exercise: {value.trim()}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
