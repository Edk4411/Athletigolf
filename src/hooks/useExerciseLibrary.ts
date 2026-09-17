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

    Promise.all([
      supabase.from("exercise_library").select("*").order("name", { ascending: true }),
      supabase.from("personal_exercises").select("*").order("name", { ascending: true }),
    ]).then(([{ data, error }, { data: personal }]) => {
        if (cancelled) return;
        const curated = !error && data?.length ? (data as ExerciseLibraryRow[]).map(toExerciseLibraryItem) : exerciseLibrary;
        const personalItems: ExerciseLibraryItem[] = (personal || []).map((item: any) => ({
          id: item.id, name: item.name, slug: slugifyExerciseName(item.name), primaryMuscle: item.primary_muscle,
          secondaryMuscles: item.secondary_muscles || [], equipment: item.equipment || "Other", movement: "mobility",
          golfCarryover: "Personal exercise", videoSearch: `${item.name} technique`, alternatives: [], isPersonal: true,
        }));
        setExercises([...curated, ...personalItems]);
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

  async function createPersonalExercise(input: { name: string; primaryMuscle: string; secondaryMuscles?: string[]; equipment?: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Sign in to save a personal exercise.");
    const { data, error } = await supabase.from("personal_exercises").insert({ user_id: user.id, name: input.name.trim(), primary_muscle: input.primaryMuscle, secondary_muscles: input.secondaryMuscles || [], equipment: input.equipment || "Other" }).select().single();
    if (error) throw error;
    const item: ExerciseLibraryItem = { id: data.id, name: data.name, slug: slugifyExerciseName(data.name), primaryMuscle: data.primary_muscle, secondaryMuscles: data.secondary_muscles || [], equipment: data.equipment, movement: "mobility", golfCarryover: "Personal exercise", videoSearch: `${data.name} technique`, alternatives: [], isPersonal: true };
    setExercises((current) => [...current, item]);
    return item;
  }
  return { exercises, loading, bySlug, createPersonalExercise };
}
