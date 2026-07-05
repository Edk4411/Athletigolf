import { useEffect, useMemo, useState } from "react";
import {
  exerciseLibrary,
  slugifyExerciseName,
  toExerciseLibraryItem,
  type ExerciseLibraryItem,
  type ExerciseLibraryRow,
} from "@/lib/exerciseLibrary";
import { supabase } from "@/lib/supabase";

export function useExerciseLibrary() {
  const [exercises, setExercises] = useState<ExerciseLibraryItem[]>(exerciseLibrary);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("exercise_library")
      .select("*")
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data?.length) {
          setExercises((data as ExerciseLibraryRow[]).map(toExerciseLibraryItem));
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const bySlug = useMemo(() => {
    const map = new Map<string, ExerciseLibraryItem>();
    exercises.forEach((exercise) => {
      map.set(exercise.slug || slugifyExerciseName(exercise.name), exercise);
    });
    return map;
  }, [exercises]);

  return { exercises, loading, bySlug };
}
