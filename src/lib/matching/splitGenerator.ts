import type { ExerciseLibraryItem } from "@/lib/exerciseLibrary";
import type { OnboardingData } from "@/lib/types";
import { isGolfOnlyMode, isTrainingOnlyMode, type SportMode } from "@/lib/sportMode";

export interface TrainingData {
  equipment: string;
  experience: string;
  frequency: string;
  splitStyle: string;
  hybridStyle: string;
  restDays: string[];
  preferredDays: Record<string, string>;
  includeExercises: string[];
  avoidExercises: string[];
  sessionLength: string;
  goal: string;
  golfPriority: string;
  limitation: string;
  weakLink: string;
}

export type GeneratedDay = {
  day: string;
  focus: string;
  exercises: string[];
};

export type SplitBuilderMode = "gym" | "athletic";

export const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function buildTrainingPlan(data: TrainingData, mode: SplitBuilderMode) {
  const days = buildSplitDays(data, mode);
  const trainingDays = days.filter((day) => day.focus !== "Rest");
  const modeLabel = mode === "gym" ? "gym" : "athletic performance";

  return {
    title: `${trainingDays.length}-day ${data.goal || modeLabel} split`,
    summary:
      mode === "gym"
        ? `${data.goal || "Strength"} focus built for ${data.equipment || "your equipment"} and ${data.sessionLength || "realistic"} sessions.`
        : `${data.goal || "Strength"} focus with performance carryover for ${data.golfPriority || "rotation, stability and speed"}. Built for ${data.equipment || "your equipment"} and ${data.sessionLength || "realistic"} sessions.`,
    notes: [
      {
        label: "Structure",
        title: `${trainingDays.length} training days`,
        detail:
          mode === "gym"
            ? `${data.experience || "Your level"} training age with enough recovery to keep the week repeatable.`
            : `${data.experience || "Your level"} training age with recovery kept visible around sport practice and rounds.`,
      },
      {
        label: "Protected Rest",
        title: data.restDays.length ? data.restDays.join(", ") : "Flexible",
        detail: data.restDays.length
          ? "The generated week avoids these days where the session count allows it."
          : "No fixed rest days selected, so the split uses the strongest training rhythm.",
      },
      mode === "gym"
        ? {
            label: "Training Bias",
            title: data.goal || "General progression",
            detail: getGymTrainingNote(data.goal),
          }
        : {
            label: "Performance Carryover",
            title: data.golfPriority || "Athletic carryover",
            detail: getGolfTransferNote(data.golfPriority),
          },
      {
        label: "Protection",
        title: data.limitation || "Recovery",
        detail: getProtectionNote(data.limitation),
      },
    ],
    days,
  };
}

export function buildSplitDays(data: TrainingData, mode: SplitBuilderMode): GeneratedDay[] {
  const frequency = data.frequency || "3 days";
  const exerciseCount = data.sessionLength === "30 minutes" ? 4 : data.sessionLength === "45 minutes" ? 5 : 6;
  let trainingDays: GeneratedDay[];
  const styledDays = buildStyledSplitDays(data, mode, exerciseCount);

  if (styledDays.length) {
    trainingDays = styledDays;
    return fillWeek(applyProtectedRestDays(applyPreferredTrainingDays(trainingDays, data.preferredDays), data.restDays));
  }

  if (frequency === "2 days") {
    trainingDays = [
      trainingDay("Monday", "Full Body Strength", pickExercises(data, ["Lower", "Push", "Pull", "Core"], exerciseCount, mode)),
      trainingDay("Thursday", mode === "gym" ? "Full Body Hypertrophy" : "Full Body Power", pickExercises(data, ["Hinge", "Push", "Pull", mode === "gym" ? "Core" : "Rotation"], exerciseCount, mode)),
    ];
  } else if (frequency === "4 days") {
    trainingDays = [
      trainingDay("Monday", "Upper Strength", pickExercises(data, ["Push", "Pull", "Shoulder", "Core"], exerciseCount, mode)),
      trainingDay("Tuesday", "Lower Strength", pickExercises(data, ["Lower", "Hinge", "Single Leg", "Mobility"], exerciseCount, mode)),
      trainingDay("Thursday", mode === "gym" ? "Upper Volume" : "Upper Speed", pickExercises(data, ["Power", "Push", "Pull", mode === "gym" ? "Shoulder" : "Rotation"], exerciseCount, mode)),
      trainingDay("Saturday", mode === "gym" ? "Lower Volume" : "Lower Athletic", pickExercises(data, ["Power", "Lower", "Hinge", "Core"], exerciseCount, mode)),
    ];
  } else if (frequency === "5 days") {
    trainingDays = [
      trainingDay("Monday", "Push Strength", pickExercises(data, ["Push", "Shoulder", "Core"], exerciseCount, mode)),
      trainingDay("Tuesday", "Lower Strength", pickExercises(data, ["Lower", "Hinge", "Single Leg"], exerciseCount, mode)),
      trainingDay("Wednesday", "Pull Strength", pickExercises(data, ["Pull", "Shoulder", "Core"], exerciseCount, mode)),
      trainingDay("Friday", mode === "gym" ? "Power + Conditioning" : "Power + Rotation", pickExercises(data, ["Power", mode === "gym" ? "Core" : "Rotation", "Core", "Mobility"], exerciseCount, mode)),
      trainingDay("Saturday", mode === "gym" ? "Accessories + Conditioning" : "Athletic Conditioning", pickExercises(data, ["Carry", "Single Leg", "Mobility", "Core"], exerciseCount, mode)),
    ];
  } else {
    trainingDays = [
      trainingDay("Monday", "Strength Base", pickExercises(data, ["Lower", "Push", "Pull"], exerciseCount, mode)),
      trainingDay("Wednesday", mode === "gym" ? "Upper + Core" : "Athletic Upper", pickExercises(data, ["Push", "Pull", mode === "gym" ? "Core" : "Rotation", "Core"], exerciseCount, mode)),
      trainingDay("Friday", "Lower + Power", pickExercises(data, ["Power", "Hinge", "Single Leg", "Mobility"], exerciseCount, mode)),
    ];
  }

  return fillWeek(applyProtectedRestDays(applyPreferredTrainingDays(trainingDays, data.preferredDays), data.restDays, data.preferredDays));
}

function buildStyledSplitDays(data: TrainingData, mode: SplitBuilderMode, exerciseCount: number): GeneratedDay[] {
  const focuses = getStyledFocuses(data, mode);
  if (!focuses.length) return [];

  const frequency = getFrequencyNumber(data.frequency);
  const pickedFocuses = focuses.slice(0, frequency);

  return pickedFocuses.map((focus, index) =>
    trainingDay(defaultTrainingDay(index, frequency), focus, pickExercises(data, getBlocksForFocus(focus, mode), exerciseCount, mode))
  );
}

export function getStyledFocuses(data: TrainingData, mode: SplitBuilderMode): string[] {
  const splitStyle = data.splitStyle;
  if (!splitStyle || splitStyle === "Auto-build for me") return [];

  if (splitStyle === "Full body") return ["Full Body A", "Full Body B", "Full Body C", "Full Body Volume", "Full Body Conditioning"];
  if (splitStyle === "Upper / lower") return ["Upper Strength", "Lower Strength", "Upper Volume", "Lower Volume", "Athletic Accessories"];
  if (splitStyle === "Push / pull / legs") return ["Push", "Pull", "Legs", "Push Volume", "Pull Volume"];
  if (splitStyle === "Arnold split") return ["Chest + Back", "Shoulders + Arms", "Legs", "Chest + Back Volume", "Shoulders + Arms Volume"];
  if (splitStyle === "Bro split") return ["Chest", "Back", "Legs", "Shoulders", "Arms"];

  if (data.hybridStyle === "PPL + upper/lower") return ["Push", "Pull", "Legs", "Upper", "Lower"];
  if (data.hybridStyle === "PPL + Arnold") return ["Push", "Pull", "Legs", "Chest + Back", "Shoulders + Arms"];
  if (data.hybridStyle === "Upper/lower + full body") return ["Upper Strength", "Lower Strength", "Full Body Volume", "Full Body Conditioning"];
  if (data.hybridStyle === "Strength + hypertrophy") return ["Strength Base", "Upper Volume", "Lower Volume", "Power + Conditioning"];
  if (data.hybridStyle === "Athletic performance mix") {
    return mode === "gym"
      ? ["Strength Base", "Upper Volume", "Lower Volume", "Conditioning + Core"]
      : ["Strength Base", "Athletic Upper", "Lower + Power", "Power + Rotation", "Mobility + Core"];
  }

  return [];
}

function getBlocksForFocus(focus: string, mode: SplitBuilderMode): string[] {
  if (focus.includes("Chest + Back")) return ["Chest Compound", "Vertical Pull", "Incline Chest", "Horizontal Row", "Rear Delt", "Core"];
  if (focus.includes("Shoulders + Arms")) return ["Shoulder Press", "Lateral Delt", "Rear Delt", "Biceps", "Triceps", "Core"];
  if (focus === "Upper Strength" || focus === "Upper") return ["Chest Compound", "Vertical Pull", "Shoulder Press", "Horizontal Row", "Core"];
  if (focus === "Upper Volume" || focus === "Athletic Upper") return ["Incline Chest", "Horizontal Row", "Lateral Delt", "Vertical Pull", mode === "gym" ? "Triceps" : "Rotation"];
  if (focus.includes("Lower") || focus === "Legs") return ["Squat Pattern", "Hinge Pattern", "Single Leg", "Hamstrings", "Calves", "Core"];
  if (focus.includes("Full Body") || focus === "Strength Base") return ["Squat Pattern", "Chest Compound", "Horizontal Row", mode === "gym" ? "Core" : "Rotation", "Hinge Pattern"];
  if (focus === "Push") return ["Chest Compound", "Shoulder Press", "Incline Chest", "Lateral Delt", "Triceps"];
  if (focus === "Push Volume") return ["Incline Chest", "Machine Chest", "Chest Fly", "Lateral Delt", "Triceps"];
  if (focus === "Pull") return ["Vertical Pull", "Horizontal Row", "Rear Delt", "Biceps", "Core"];
  if (focus === "Pull Volume") return ["Horizontal Row", "Vertical Pull", "Rear Delt", "Biceps", "Core"];
  if (focus === "Chest") return ["Chest Compound", "Incline Chest", "Machine Chest", "Chest Fly", "Triceps"];
  if (focus === "Back") return ["Vertical Pull", "Horizontal Row", "Horizontal Row", "Rear Delt", "Biceps"];
  if (focus === "Shoulders") return ["Shoulder Press", "Lateral Delt", "Rear Delt", "Lateral Delt", "Triceps"];
  if (focus === "Arms") return ["Biceps", "Triceps", "Biceps", "Triceps", "Forearms"];
  if (focus.includes("Power") || focus.includes("Athletic")) return ["Power", mode === "gym" ? "Carry" : "Rotation", "Single Leg", "Core", "Mobility"];
  if (focus.includes("Conditioning")) return ["Carry", "Power", "Core", "Mobility"];
  if (focus.includes("Mobility")) return ["Mobility", "Rotation", "Core", "Single Leg"];
  return ["Chest Compound", "Horizontal Row", "Squat Pattern", "Core"];
}

function getFrequencyNumber(frequency: string) {
  const match = frequency.match(/\d+/);
  return match ? Math.min(Number(match[0]), 5) : 3;
}

function defaultTrainingDay(index: number, frequency: number) {
  if (frequency === 2) return ["Monday", "Thursday"][index] || weekDays[index];
  if (frequency === 3) return ["Monday", "Wednesday", "Friday"][index] || weekDays[index];
  if (frequency === 4) return ["Monday", "Tuesday", "Thursday", "Saturday"][index] || weekDays[index];
  return ["Monday", "Tuesday", "Wednesday", "Friday", "Saturday"][index] || weekDays[index];
}

function applyPreferredTrainingDays(trainingDays: GeneratedDay[], preferredDays: Record<string, string>): GeneratedDay[] {
  const result: GeneratedDay[] = trainingDays.map((d) => ({ ...d, day: "" }));
  const usedDays = new Set<string>();
  trainingDays.forEach((day, idx) => {
    const preferred = preferredDays[day.focus];
    if (preferred && !usedDays.has(preferred)) {
      result[idx].day = preferred;
      usedDays.add(preferred);
    }
  });
  trainingDays.forEach((day, idx) => {
    if (result[idx].day) return;
    if (day.day && !usedDays.has(day.day)) {
      result[idx].day = day.day;
      usedDays.add(day.day);
      return;
    }
    const openDay = weekDays.find((d) => !usedDays.has(d));
    if (openDay) {
      result[idx].day = openDay;
      usedDays.add(openDay);
    } else {
      result[idx].day = day.day;
    }
  });
  return result;
}

function trainingDay(day: string, focus: string, exercises: string[]): GeneratedDay {
  return { day, focus, exercises };
}

function fillWeek(trainingDays: GeneratedDay[]): GeneratedDay[] {
  const byDay = new Map(trainingDays.map((day) => [day.day, day]));
  return weekDays.map(
    (day) => byDay.get(day) || { day, focus: "Rest", exercises: ["Mobility", "Walk", "Recovery"] }
  );
}

function applyProtectedRestDays(trainingDays: GeneratedDay[], restDays: string[], preferredDays: Record<string, string> = {}): GeneratedDay[] {
  if (restDays.length === 0) return trainingDays;
  const protectedDays = new Set(restDays);
  const preferredSet = new Set(Object.values(preferredDays).filter(Boolean));
  const usedDays = new Set(trainingDays.map((day) => day.day));
  const availableDays = weekDays.filter((day) => !protectedDays.has(day));

  return trainingDays.map((trainingDay) => {
    if (!protectedDays.has(trainingDay.day)) return trainingDay;
    if (preferredSet.has(trainingDay.day) && preferredDays[trainingDay.focus] === trainingDay.day) return trainingDay;

    const replacementDay = availableDays.find((day) => !usedDays.has(day));
    if (!replacementDay) return trainingDay;

    usedDays.delete(trainingDay.day);
    usedDays.add(replacementDay);
    return { ...trainingDay, day: replacementDay };
  });
}

function pickExercises(data: TrainingData, blocks: string[], count: number, mode: SplitBuilderMode) {
  const library = getExerciseLibrary(data, mode);
  const picked: string[] = [];
  const avoided = new Set(data.avoidExercises.map(normaliseExerciseName));
  const included = data.includeExercises.filter((exercise) => !avoided.has(normaliseExerciseName(exercise)));
  const addExercise = (exercise: string) => {
    const normalised = normaliseExerciseName(exercise);
    if (picked.length < count && !avoided.has(normalised) && !picked.some((item) => normaliseExerciseName(item) === normalised)) {
      picked.push(exercise);
    }
  };
  included.forEach(addExercise);
  blocks.forEach((block) => {
    const options = (library[block] || []).filter((exercise) => !avoided.has(normaliseExerciseName(exercise)));
    const next = options.find((exercise) => !picked.some((item) => normaliseExerciseName(item) === normaliseExerciseName(exercise)));
    if (next) addExercise(next);
  });
  getPriorityExercises(data, mode, blocks, library).forEach(addExercise);
  blocks.flatMap((block) => library[block] || []).forEach(addExercise);
  ["Core", "Mobility"].flatMap((block) => library[block] || []).forEach(addExercise);
  return picked.slice(0, count);
}

function getExerciseLibrary(data: TrainingData, mode: SplitBuilderMode): Record<string, string[]> {
  if (data.equipment === "Bodyweight only") {
    return {
      Push: ["Push Ups", "Pike Push Ups", "Close-Grip Push Ups"],
      Pull: ["Towel Rows", "Reverse Snow Angels", "Prone Y Raises"],
      Lower: ["Split Squats", "Squats", "Step Ups"],
      Hinge: ["Single-Leg RDL", "Glute Bridge", "Hip Hinge Drill"],
      "Chest Compound": ["Push Ups", "Deficit Push Ups", "Tempo Push Ups"],
      "Incline Chest": ["Feet-Elevated Push Ups", "Diamond Push Ups", "Archer Push Ups"],
      "Machine Chest": ["Tempo Push Ups", "Deficit Push Ups", "Push Ups"],
      "Chest Fly": ["Wide Push Ups", "Sliding Push Ups", "Push Up Plus"],
      "Shoulder Press": ["Pike Push Ups", "Wall Walks", "Handstand Hold"],
      "Lateral Delt": ["Wall Slides", "Prone Y Raises", "Side Plank Reach"],
      "Rear Delt": ["Reverse Snow Angels", "Prone Y Raises", "Prone T Raises"],
      Triceps: ["Close-Grip Push Ups", "Bench Dips", "Plank Triceps Extension"],
      "Vertical Pull": ["Towel Rows", "Doorway Rows", "Prone Lat Pulls"],
      "Horizontal Row": ["Towel Rows", "Inverted Rows", "Reverse Snow Angels"],
      Biceps: ["Towel Curls", "Isometric Curl Hold", "Doorframe Row Hold"],
      Forearms: ["Dead Hang", "Suitcase Hold", "Wrist Plank"],
      "Squat Pattern": ["Squats", "Split Squats", "Tempo Squats"],
      "Leg Press Pattern": ["Wall Sit", "Step Ups", "Cyclist Squats"],
      "Hinge Pattern": ["Single-Leg RDL", "Glute Bridge", "Hip Hinge Drill"],
      Hamstrings: ["Hamstring Walkout", "Single-Leg Glute Bridge", "Slider Hamstring Curl"],
      Glutes: ["Glute Bridge", "Single-Leg Glute Bridge", "Hip Thrust"],
      Calves: ["Single-Leg Calf Raise", "Calf Raise", "Wall Calf Raise"],
      "Single Leg": ["Reverse Lunges", "Step Ups", "Single-Leg Glute Bridge"],
      Shoulder: ["Pike Push Ups", "Wall Slides", "Prone Y Raises"],
      Core: ["Plank", "Side Plank", "Dead Bug"],
      Rotation: mode === "gym" ? ["Dead Bug Rotation", "Plank Shoulder Taps", "Side Plank Reach"] : ["Open Books", "Plank Shoulder Taps", "Rotational Dead Bug"],
      Power: ["Squat Jumps", "Skater Bounds", "Fast Push Ups"],
      Mobility: ["Hip Flow", "Thoracic Rotations", "90/90 Switches"],
      Carry: ["Suitcase Hold", "Marching Plank", "Bear Crawl"],
    };
  }
  if (data.equipment === "Bands / dumbbells" || data.equipment === "Home weights") {
    return {
      Push: ["DB Bench Press", "DB Incline Press", "DB Shoulder Press"],
      Pull: ["1-Arm DB Row", "Band Pulldown", "Rear Delt Fly"],
      Lower: ["Goblet Squat", "DB Split Squat", "DB Step Up"],
      Hinge: ["DB RDL", "Hip Thrust", "Hamstring Walkout"],
      "Chest Compound": ["DB Bench Press", "Floor Press", "Push Ups"],
      "Incline Chest": ["DB Incline Press", "Feet-Elevated Push Ups", "DB Squeeze Press"],
      "Machine Chest": ["DB Floor Press", "Band Chest Press", "DB Squeeze Press"],
      "Chest Fly": ["DB Fly", "Band Fly", "Slider Fly"],
      "Shoulder Press": ["DB Shoulder Press", "Arnold Press", "Pike Push Ups"],
      "Lateral Delt": ["DB Lateral Raise", "Lean-Away Lateral Raise", "Band Lateral Raise"],
      "Rear Delt": ["Rear Delt Fly", "Band Face Pull", "Band Pull Apart"],
      Triceps: ["DB Skullcrusher", "Band Pressdown", "Close-Grip Push Ups"],
      "Vertical Pull": ["Band Pulldown", "Assisted Pull Up", "DB Pullover"],
      "Horizontal Row": ["1-Arm DB Row", "Band Row", "Chest-Supported DB Row"],
      Biceps: ["DB Curl", "Hammer Curl", "Band Curl"],
      Forearms: ["Farmer Carry", "Suitcase Carry", "Wrist Curl"],
      "Squat Pattern": ["Goblet Squat", "DB Front Squat", "Tempo Squat"],
      "Leg Press Pattern": ["DB Step Up", "Goblet Squat", "Cyclist Squat"],
      "Hinge Pattern": ["DB RDL", "Hip Thrust", "Single-Leg RDL"],
      Hamstrings: ["Hamstring Walkout", "Slider Hamstring Curl", "DB RDL"],
      Glutes: ["Hip Thrust", "Glute Bridge", "Band Lateral Walk"],
      Calves: ["DB Calf Raise", "Single-Leg Calf Raise", "Seated DB Calf Raise"],
      "Single Leg": ["DB Reverse Lunge", "DB Step Up", "Split Squat"],
      Shoulder: ["DB Lateral Raise", "DB Shoulder Press", "Band Face Pull"],
      Core: ["Pallof Press", "Dead Bug", "Side Plank"],
      Rotation: mode === "gym" ? ["Band Core Rotation", "Pallof Press", "Cable-Style Chop"] : ["Band Rotations", "Pallof Press", "Cable-Style Chop"],
      Power: mode === "gym" ? ["DB Jump Squat", "Med Ball Slam", "Fast DB Press"] : ["DB Jump Squat", "Med Ball Slam", "Band Speed Rotation"],
      Mobility: ["Hip Flow", "Thoracic Rotations", "Couch Stretch"],
      Carry: ["Suitcase Carry", "Farmer Carry", "Front Rack Carry"],
    };
  }
  return {
    Push: ["Bench Press", "Incline DB Press", "Machine Chest Press"],
    Pull: ["Lat Pulldown", "Seated Row", "Chest-Supported Row"],
    Lower: ["Squat", "Leg Press", "Hack Squat"],
    Hinge: ["RDL", "Hip Thrust", "Hamstring Curl"],
    "Chest Compound": ["Bench Press", "Machine Chest Press", "Chest Press"],
    "Incline Chest": ["Incline DB Press", "Incline Bench Press", "Low-Incline DB Press"],
    "Machine Chest": ["Machine Chest Press", "Cable Press", "Smith Machine Press"],
    "Chest Fly": ["Cable Fly", "Pec Deck", "DB Fly"],
    "Shoulder Press": ["Shoulder Press", "Seated DB Press", "Machine Shoulder Press"],
    "Lateral Delt": ["Lateral Raise", "Cable Lateral Raise", "Machine Lateral Raise"],
    "Rear Delt": ["Face Pull", "Rear Delt Fly", "Reverse Pec Deck"],
    Triceps: ["Rope Pressdown", "Overhead Triceps Extension", "Close-Grip Press"],
    "Vertical Pull": ["Lat Pulldown", "Pull Up", "Assisted Pull Up"],
    "Horizontal Row": ["Seated Row", "Chest-Supported Row", "Cable Row"],
    Biceps: ["DB Curl", "Cable Curl", "Preacher Curl"],
    Forearms: ["Farmer Carry", "Wrist Curl", "Dead Hang"],
    "Squat Pattern": ["Squat", "Hack Squat", "Front Squat"],
    "Leg Press Pattern": ["Leg Press", "Hack Squat", "Belt Squat"],
    "Hinge Pattern": ["RDL", "Hip Thrust", "Back Extension"],
    Hamstrings: ["Hamstring Curl", "Seated Hamstring Curl", "Nordic Curl"],
    Glutes: ["Hip Thrust", "Cable Kickback", "Glute Bridge"],
    Calves: ["Standing Calf Raise", "Seated Calf Raise", "Leg Press Calf Raise"],
    "Single Leg": ["Bulgarian Split Squat", "Walking Lunge", "Step Up"],
    Shoulder: ["Shoulder Press", "Lateral Raise", "Face Pull"],
    Core: ["Cable Crunch", "Pallof Press", "Side Plank"],
    Rotation: mode === "gym" ? ["Cable Core Rotation", "Pallof Press", "Dead Bug"] : ["Cable Wood Chop", "Landmine Rotation", "Pallof Press"],
    Power: mode === "gym" ? ["Kettlebell Swing", "Trap Bar Jump", "Sled Push"] : ["Med Ball Rotational Throw", "Trap Bar Jump", "Kettlebell Swing"],
    Mobility: ["Thoracic Rotations", "Hip Airplanes", "Couch Stretch"],
    Carry: ["Farmer Carry", "Suitcase Carry", "Sled Push"],
  };
}

function getPriorityExercises(data: TrainingData, mode: SplitBuilderMode, blocks: string[], library: Record<string, string[]>) {
  const priorities: string[] = [];
  const hasBlock = (...patterns: string[]) =>
    blocks.some((block) => patterns.some((pattern) => block.toLowerCase().includes(pattern.toLowerCase())));
  const addFirstFrom = (...blockNames: string[]) => {
    blockNames.forEach((blockName) => {
      const exercise = library[blockName]?.[0];
      if (exercise) priorities.push(exercise);
    });
  };
  if (data.goal === "Strength") {
    if (hasBlock("Chest", "Push", "Upper")) addFirstFrom("Chest Compound");
    if (hasBlock("Pull", "Back", "Row", "Upper")) addFirstFrom("Vertical Pull", "Horizontal Row");
    if (hasBlock("Squat", "Lower", "Legs")) addFirstFrom("Squat Pattern");
    if (hasBlock("Hinge", "Lower", "Legs")) addFirstFrom("Hinge Pattern");
  }
  if (data.goal === "Muscle") {
    if (hasBlock("Chest", "Push", "Upper")) addFirstFrom("Incline Chest");
    if (hasBlock("Pull", "Back", "Row", "Upper")) addFirstFrom("Horizontal Row");
    if (hasBlock("Lower", "Legs", "Squat")) addFirstFrom("Leg Press Pattern", "Hamstrings");
    if (hasBlock("Shoulder")) addFirstFrom("Lateral Delt");
    if (hasBlock("Biceps", "Arms")) addFirstFrom("Biceps");
    if (hasBlock("Triceps", "Arms")) addFirstFrom("Triceps");
  }
  if (data.goal === "Speed / power" && hasBlock("Power", "Athletic", "Full", "Lower", "Rotation")) {
    addFirstFrom("Power");
    if (mode === "athletic") addFirstFrom("Rotation");
  }
  if (data.goal === "Mobility" && hasBlock("Mobility", "Core", "Rotation")) addFirstFrom("Mobility", "Core");
  if (mode === "athletic") {
    if ((data.golfPriority === "Speed / distance" || data.golfPriority === "Driving distance") && hasBlock("Power", "Rotation", "Hinge", "Lower")) addFirstFrom("Power", "Hinge Pattern");
    if (data.golfPriority === "Rotation speed" && hasBlock("Power", "Rotation", "Core")) addFirstFrom("Rotation");
    if (data.golfPriority === "Stability" && hasBlock("Core", "Carry", "Single Leg")) addFirstFrom("Core", "Carry");
  }
  if (data.weakLink === "Core / rotation" && hasBlock("Core", "Rotation")) addFirstFrom(mode === "gym" ? "Core" : "Rotation", "Core");
  if (data.weakLink === "Mobility" && hasBlock("Mobility", "Rotation")) addFirstFrom("Mobility");
  return priorities;
}

export function normaliseExerciseName(value: string) {
  return value.trim().toLowerCase();
}

function getGymTrainingNote(goal: string) {
  if (goal === "Strength") return "Main lifts stay first, then accessories fill gaps without golf-specific work.";
  if (goal === "Muscle") return "Volume and balanced muscle coverage take priority over sport carryover.";
  if (goal === "Speed / power") return "Power stays general: jumps, swings, sleds and fast controlled lifts.";
  if (goal === "Mobility") return "Mobility supports better lifting positions and recovery, not a golf swing model.";
  if (goal === "Fat loss") return "Repeatable sessions and conditioning matter more than complex exercise selection.";
  return "The split stays focused on normal gym progression.";
}

function getGolfTransferNote(priority: string) {
  if (priority === "Speed / distance" || priority === "Driving distance") return "Bias power, hinge strength and rotation work so speed changes can be compared with performance stats.";
  if (priority === "Rotation speed") return "Use rotational power and anti-rotation control so speed comes with stability.";
  if (priority === "Stability") return "Single-leg, carry and core work should make your swing base less noisy.";
  if (priority === "Injury prevention") return "Keep the plan balanced with mobility, posterior-chain work and controlled volume.";
  if (priority === "Endurance" || priority === "Late-round energy") return "Conditioning and carries help you keep output quality late in sessions and rounds.";
  return "Track lifts consistently so the app can connect training changes with performance outcomes.";
}

function getProtectionNote(limitation: string) {
  if (!limitation || limitation === "No issue") return "No major limitation selected. Keep warm-ups consistent and progress gradually.";
  return `The plan avoids being reckless around your ${limitation.toLowerCase()}. Use pain-free range and keep notes if anything flares up.`;
}
