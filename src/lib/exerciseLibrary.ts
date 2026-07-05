export type ExerciseLibraryItem = {
  id?: string;
  name: string;
  slug?: string;
  category?: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  equipment: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  movement: "push" | "pull" | "squat" | "hinge" | "carry" | "rotation" | "anti-rotation" | "cardio" | "core" | "mobility";
  instructions?: string;
  safetyNotes?: string;
  golfRelevant?: boolean;
  golfCarryover: string;
  videoSearch: string;
  formCues?: string[];
  commonMistakes?: string[];
  alternatives: string[];
};

export type ExerciseLibraryRow = {
  id: string;
  name: string;
  slug: string;
  category: string;
  primary_muscles: string[];
  secondary_muscles: string[] | null;
  equipment: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  movement_type: ExerciseLibraryItem["movement"];
  instructions: string | null;
  form_cues: string[] | null;
  common_mistakes: string[] | null;
  safety_notes: string | null;
  golf_relevant: boolean;
  golf_benefit: string | null;
  alternatives: string[] | null;
  youtube_search: string | null;
};

export const exerciseLibrary: ExerciseLibraryItem[] = [
  {
    name: "Bench Press",
    primaryMuscle: "Chest / Push",
    secondaryMuscles: ["Triceps", "Shoulders"],
    equipment: "Barbell",
    movement: "push",
    golfCarryover: "Upper-body force and trunk bracing for speed work.",
    videoSearch: "bench press proper form",
    formCues: ["Set shoulder blades back and down.", "Keep feet planted.", "Lower under control, then press up and slightly back."],
    commonMistakes: ["Bouncing the bar.", "Elbows flaring too wide.", "Losing upper-back tightness."],
    alternatives: ["Dumbbell Bench Press", "Machine Press", "Push Up"],
  },
  {
    name: "Incline DB Press",
    primaryMuscle: "Chest / Push",
    secondaryMuscles: ["Shoulders", "Triceps"],
    equipment: "Dumbbells",
    movement: "push",
    golfCarryover: "Pressing strength without locking the shoulders into one path.",
    videoSearch: "incline dumbbell press proper form",
    formCues: ["Use a moderate incline.", "Keep wrists stacked over elbows.", "Control the bottom position."],
    commonMistakes: ["Turning it into a shoulder press.", "Letting dumbbells drift too wide.", "Rushing reps."],
    alternatives: ["Incline Machine Press", "Landmine Press", "Machine Press"],
  },
  {
    name: "Shoulder Press",
    primaryMuscle: "Shoulders",
    secondaryMuscles: ["Triceps", "Upper Back"],
    equipment: "Dumbbells or Barbell",
    movement: "push",
    golfCarryover: "Shoulder strength and overhead control.",
    videoSearch: "shoulder press proper form",
    formCues: ["Brace before pressing.", "Press overhead without leaning back hard.", "Finish with biceps near ears."],
    commonMistakes: ["Overarching the lower back.", "Cutting depth short.", "Shrugging every rep."],
    alternatives: ["Landmine Press", "Machine Shoulder Press", "Arnold Press"],
  },
  {
    name: "Lat Pulldown",
    primaryMuscle: "Back / Pull",
    secondaryMuscles: ["Biceps", "Rear Delts"],
    equipment: "Cable",
    movement: "pull",
    golfCarryover: "Back strength for posture and speed control.",
    videoSearch: "lat pulldown proper form",
    formCues: ["Start by pulling shoulder blades down.", "Drive elbows toward ribs.", "Control the return stretch."],
    commonMistakes: ["Leaning too far back.", "Pulling with only arms.", "Letting the stack slam."],
    alternatives: ["Assisted Pull Up", "Pull Up", "Single Arm Pulldown"],
  },
  {
    name: "Rows",
    primaryMuscle: "Back / Pull",
    secondaryMuscles: ["Biceps", "Rear Delts"],
    equipment: "Cable, Machine or Dumbbells",
    movement: "pull",
    golfCarryover: "Upper-back strength for stable posture through the swing.",
    videoSearch: "seated cable row proper form",
    formCues: ["Keep ribs down.", "Pull elbows back without shrugging.", "Pause briefly at the body."],
    commonMistakes: ["Rocking the torso.", "Rounding the shoulders.", "Using momentum."],
    alternatives: ["Chest Supported Row", "Single Arm Row", "Machine Row"],
  },
  {
    name: "Squats",
    primaryMuscle: "Legs",
    secondaryMuscles: ["Glutes", "Core"],
    equipment: "Barbell",
    movement: "squat",
    golfCarryover: "Lower-body force production and ground interaction.",
    videoSearch: "barbell squat proper form",
    formCues: ["Brace before each rep.", "Sit between the hips.", "Drive the floor away through the whole foot."],
    commonMistakes: ["Knees collapsing in.", "Heels lifting.", "Losing brace at the bottom."],
    alternatives: ["Goblet Squat", "Leg Press", "Hack Squat"],
  },
  {
    name: "RDL",
    primaryMuscle: "Posterior Chain",
    secondaryMuscles: ["Hamstrings", "Glutes", "Back"],
    equipment: "Barbell or Dumbbells",
    movement: "hinge",
    golfCarryover: "Hip hinge strength for rotation and speed.",
    videoSearch: "romanian deadlift proper form",
    formCues: ["Push hips back.", "Keep the bar close.", "Stop when hamstrings are loaded, then stand tall."],
    commonMistakes: ["Squatting the movement.", "Rounding the back.", "Reaching too low without control."],
    alternatives: ["Dumbbell RDL", "Hip Thrust", "Cable Pull Through"],
  },
  {
    name: "Leg Press",
    primaryMuscle: "Legs",
    secondaryMuscles: ["Glutes"],
    equipment: "Machine",
    movement: "squat",
    golfCarryover: "Lower-body strength with lower skill demand than squats.",
    videoSearch: "leg press proper form",
    formCues: ["Set feet evenly.", "Lower with control.", "Drive through mid-foot without locking knees hard."],
    commonMistakes: ["Going too shallow.", "Letting hips roll up.", "Locking knees aggressively."],
    alternatives: ["Squats", "Hack Squat", "Split Squat"],
  },
  {
    name: "Lateral Raises",
    primaryMuscle: "Shoulders",
    secondaryMuscles: ["Upper Back"],
    equipment: "Dumbbells or Cable",
    movement: "push",
    golfCarryover: "Shoulder capacity and control for frequent practice volume.",
    videoSearch: "lateral raise proper form",
    formCues: ["Use light control.", "Raise slightly out in front.", "Lead with elbows, not traps."],
    commonMistakes: ["Swinging the weights.", "Shrugging high.", "Going too heavy."],
    alternatives: ["Cable Lateral Raise", "Machine Lateral Raise", "Rear Delts"],
  },
  {
    name: "Plank",
    primaryMuscle: "Core",
    secondaryMuscles: ["Glutes", "Shoulders"],
    equipment: "Bodyweight",
    movement: "core",
    golfCarryover: "Trunk stiffness and posture control.",
    videoSearch: "plank proper form",
    formCues: ["Ribs down.", "Squeeze glutes lightly.", "Keep a straight line from shoulders to ankles."],
    commonMistakes: ["Hips sagging.", "Holding breath.", "Letting shoulders collapse."],
    alternatives: ["Dead Bug", "Pallof Press", "Side Plank"],
  },
];

export function findExercise(name: string) {
  return findExerciseFromList(name, exerciseLibrary);
}

export function getExerciseGuide(name: string) {
  const libraryMatch = findExercise(name);
  const fallbackMuscle = inferExerciseMuscle(name) || "General strength";

  if (libraryMatch) {
    return {
      ...libraryMatch,
      videoUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(libraryMatch.videoSearch)}`,
      formCues: libraryMatch.formCues || getFallbackCues(libraryMatch.movement),
      commonMistakes: libraryMatch.commonMistakes || getFallbackMistakes(libraryMatch.movement),
      isLibraryMatch: true,
    };
  }

  return {
    name,
    primaryMuscle: fallbackMuscle,
    secondaryMuscles: [],
    equipment: "Check exercise setup",
    movement: "mobility" as const,
    golfCarryover: "Log this consistently so AthletiGolf can learn how it relates to your golf performance.",
    videoSearch: `${name} proper form`,
    videoUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} proper form`)}`,
    formCues: ["Use a controlled tempo.", "Keep the target muscle working.", "Stop if form breaks down."],
    commonMistakes: ["Going too heavy too soon.", "Rushing reps.", "Ignoring discomfort."],
    alternatives: [],
    isLibraryMatch: false,
  };
}

export function slugifyExerciseName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function exerciseNameFromSlug(slug: string) {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function toExerciseLibraryItem(row: ExerciseLibraryRow): ExerciseLibraryItem {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    primaryMuscle: row.primary_muscles?.join(" / ") || row.category,
    secondaryMuscles: row.secondary_muscles || [],
    equipment: row.equipment,
    difficulty: row.difficulty,
    movement: row.movement_type,
    instructions: row.instructions || undefined,
    safetyNotes: row.safety_notes || undefined,
    golfRelevant: row.golf_relevant,
    golfCarryover: row.golf_benefit || "Log this consistently so AthletiGolf can connect training with golf performance.",
    videoSearch: row.youtube_search || `${row.name} proper form`,
    formCues: row.form_cues || undefined,
    commonMistakes: row.common_mistakes || undefined,
    alternatives: row.alternatives || [],
  };
}

export function findExerciseFromList(name: string, list: ExerciseLibraryItem[]) {
  const cleanName = name.trim().toLowerCase();
  if (!cleanName) return null;
  return (
    list.find((exercise) => exercise.name.toLowerCase() === cleanName) ||
    list.find((exercise) => cleanName.includes(exercise.name.toLowerCase())) ||
    null
  );
}

export function getExerciseGuideFromList(name: string, list: ExerciseLibraryItem[]) {
  const libraryMatch = findExerciseFromList(name, list) || findExercise(name);
  if (!libraryMatch) return getExerciseGuide(name);

  return {
    ...libraryMatch,
    videoUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(libraryMatch.videoSearch)}`,
    formCues: libraryMatch.formCues || getFallbackCues(libraryMatch.movement),
    commonMistakes: libraryMatch.commonMistakes || getFallbackMistakes(libraryMatch.movement),
    isLibraryMatch: true,
  };
}

export function inferExerciseMuscle(name: string) {
  const libraryMatch = findExercise(name);
  if (libraryMatch) return libraryMatch.primaryMuscle;

  const lower = name.toLowerCase();
  if (/(bench|press|chest|push)/.test(lower)) return "Chest / Push";
  if (/(row|pulldown|pull|lat|rear delt)/.test(lower)) return "Back / Pull";
  if (/(squat|leg|rdl|hamstring|calf|lower)/.test(lower)) return "Legs";
  if (/(curl|tricep|arm)/.test(lower)) return "Arms";
  if (/(shoulder|lateral|delt)/.test(lower)) return "Shoulders";
  if (/(core|abs|plank)/.test(lower)) return "Core";
  return null;
}

function getFallbackCues(movement: ExerciseLibraryItem["movement"]) {
  if (movement === "squat") return ["Brace before each rep.", "Control the bottom.", "Drive through the full foot."];
  if (movement === "hinge") return ["Push hips back.", "Keep the spine neutral.", "Stand tall without overextending."];
  if (movement === "pull") return ["Set shoulders first.", "Pull with elbows.", "Control the return."];
  if (movement === "push") return ["Brace the trunk.", "Keep joints stacked.", "Control the lowering phase."];
  if (movement === "core") return ["Keep ribs down.", "Move with control.", "Stop before the lower back takes over."];
  if (movement === "carry") return ["Stand tall.", "Keep ribs stacked over hips.", "Walk with steady steps."];
  return ["Move slowly.", "Stay pain-free.", "Keep positions controlled."];
}

function getFallbackMistakes(movement: ExerciseLibraryItem["movement"]) {
  if (movement === "squat") return ["Knees collapsing.", "Heels lifting.", "Rushing depth."];
  if (movement === "hinge") return ["Rounding the back.", "Turning it into a squat.", "Losing hamstring tension."];
  if (movement === "pull") return ["Shrugging.", "Using momentum.", "Cutting the range short."];
  if (movement === "push") return ["Losing brace.", "Flaring joints.", "Rushing reps."];
  if (movement === "core") return ["Holding breath.", "Letting hips sag.", "Chasing time over position."];
  if (movement === "carry") return ["Leaning sideways.", "Short uncontrolled steps.", "Relaxing the trunk."];
  return ["Moving too fast.", "Forcing range.", "Ignoring discomfort."];
}
