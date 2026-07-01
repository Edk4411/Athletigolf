import type { ExerciseLog, PracticeDrill, PracticeSession, Round, RoundHole, Workout } from "@/lib/types";
import { getGolfStats, getShortGameStats } from "@/lib/golfStats";
import { findExercise } from "@/lib/exerciseLibrary";

export type InsightTone = "golf" | "lab" | "pulse" | "warning";
export type SignalStrength = "needs-data" | "early" | "building" | "strong";

export type PerformanceInsight = {
  title: string;
  detail: string;
  tone: InsightTone;
  priority: number;
  metric?: string;
  signal?: SignalStrength;
  evidence?: string[];
  action?: string;
  needs?: string;
};

export type RelationshipInsight = {
  title: string;
  detail: string;
  tone: InsightTone;
  confidence: "early" | "building" | "strong";
  metrics?: Array<{ label: string; value: string }>;
  evidence?: string[];
  action?: string;
  needs?: string;
};

export type MuscleVolume = {
  muscle: string;
  volume: number;
  exercises: number;
};

export type TrainingIntelligence = {
  totalVolume: number;
  muscleVolumes: MuscleVolume[];
  topMuscle: MuscleVolume | null;
  recentPr: { name: string; weight: number } | null;
  stalledLift: { name: string; current: number; previous: number } | null;
  recommendation: string;
};

export type PracticePlan = {
  title: string;
  detail: string;
  practiceType: string;
  focusArea: string;
  drills: string[];
};

export type CoachNotes = {
  golf: string;
  training: string;
  recovery: string;
};

export type DataHealthItem = {
  label: string;
  detail: string;
  complete: boolean;
  current: number;
  target: number;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getPerformanceInsights(
  rounds: Round[],
  holes: RoundHole[],
  workouts: Workout[],
  practices: PracticeSession[] = []
): PerformanceInsight[] {
  const golfStats = getGolfStats(rounds);
  const shortGameStats = getShortGameStats(holes);
  const recentRounds = sortedRounds(rounds).slice(0, 4);
  const previousRounds = sortedRounds(rounds).slice(4, 8);
  const insights: PerformanceInsight[] = [];

  if (rounds.length === 0) {
    insights.push({
      title: "Start the scoring signal",
      detail: "Log one complete or partial round so AthletiGolf can find the first scoring pattern.",
      tone: "golf",
      priority: 100,
      signal: "needs-data",
      evidence: ["0 rounds logged", "No scoring baseline yet"],
      action: "Submit one round, even if it is only 9 holes.",
      needs: "1 round",
    });
  }

  const recentDistance = average(
    recentRounds.map((round) => round.average_driving_distance).filter(isNumber)
  );
  const previousDistance = average(
    previousRounds.map((round) => round.average_driving_distance).filter(isNumber)
  );

  if (recentDistance !== null && previousDistance !== null && recentDistance - previousDistance >= 5) {
    insights.push({
      title: "Driving distance is moving",
      detail: `Recent average driving distance is up ${Math.round(recentDistance - previousDistance)} yards versus the previous block.`,
      tone: "golf",
      priority: 92,
      metric: `${Math.round(recentDistance)} yd`,
      signal: "building",
      evidence: [
        `Recent block: ${Math.round(recentDistance)} yd`,
        `Previous block: ${Math.round(previousDistance)} yd`,
      ],
      action: "Keep logging drive distance and compare it with recent strength work.",
    });
  } else if (recentDistance !== null) {
    insights.push({
      title: "Distance tracking is live",
      detail: "Keep logging average drive and longest drive so distance trends can connect with training load.",
      tone: "golf",
      priority: 70,
      metric: `${Math.round(recentDistance)} yd`,
      signal: "early",
      evidence: [`Tracked average: ${Math.round(recentDistance)} yd`, `${recentRounds.length} recent rounds checked`],
      action: "Add distance to the next two rounds so AthletiGolf can compare blocks.",
      needs: "3 distance rounds",
    });
  } else {
    insights.push({
      title: "Add drive distance",
      detail: "Average drive and longest drive are ready to track, but no distance rounds have been logged yet.",
      tone: "warning",
      priority: 65,
      signal: "needs-data",
      evidence: ["Distance fields are available", "0 distance rounds logged"],
      action: "Add average drive and longest drive on your next scorecard.",
      needs: "1 distance round",
    });
  }

  if ((golfStats.avgPenaltyShots ?? 0) >= 2) {
    insights.push({
      title: "Penalty shots are the fastest win",
      detail: "Penalties sit on the bad side of the scoring profile. Safer targets and tee decisions should come before swing changes.",
      tone: "warning",
      priority: 95,
      metric: `${golfStats.avgPenaltyShots?.toFixed(1)} / round`,
      signal: rounds.length >= 5 ? "strong" : "building",
      evidence: [`${golfStats.avgPenaltyShots?.toFixed(1)} penalties per round`, `${rounds.length} rounds logged`],
      action: "Prioritise safer targets and tee-shot decisions before adding swing changes.",
    });
  }

  if ((golfStats.avgGirPercent ?? 100) < 45 && rounds.length >= 2) {
    insights.push({
      title: "Approach control is holding scoring back",
      detail: "GIR is low compared with the rest of the profile, so range work should bias towards approach distances.",
      tone: "pulse",
      priority: 88,
      metric: `${golfStats.avgGirPercent}% GIR`,
      signal: rounds.length >= 5 ? "building" : "early",
      evidence: [`${golfStats.avgGirPercent}% GIR`, `${rounds.length} rounds logged`],
      action: "Build the next range session around wedge, short-iron and mid-iron target windows.",
    });
  }

  if (shortGameStats.chipChances >= 3 && (shortGameStats.upAndDownPercent ?? 100) < 35) {
    insights.push({
      title: "Up-and-down rate needs attention",
      detail: "Missed greens are not turning into enough one-putt recoveries. Short-game practice has a clear scoring link.",
      tone: "golf",
      priority: 84,
      metric: `${shortGameStats.upAndDownPercent}%`,
      signal: shortGameStats.chipChances >= 6 ? "building" : "early",
      evidence: [`${shortGameStats.upAndDowns}/${shortGameStats.chipChances} chip chances converted`, "Chip recoveries only"],
      action: "Track landing spot and one-putt conversion drills in practice.",
    });
  }

  if (shortGameStats.sandSaveChances >= 2 && (shortGameStats.sandSavePercent ?? 100) < 35) {
    insights.push({
      title: "Bunker recovery is a separate project",
      detail: "Sand saves are tracked separately now, so bunker practice can be judged without confusing it with normal chips.",
      tone: "warning",
      priority: 82,
      metric: `${shortGameStats.sandSavePercent}%`,
      signal: shortGameStats.sandSaveChances >= 5 ? "building" : "early",
      evidence: [`${shortGameStats.sandSaves}/${shortGameStats.sandSaveChances} bunker chances converted`, "Sand saves separated from chip recoveries"],
      action: "Run a bunker-save practice block and log attempts/successes.",
    });
  }

  const weeklyWorkouts = workouts.filter(
    (workout) => new Date(workout.created_at).getTime() >= Date.now() - 7 * MS_PER_DAY
  );
  const weeklyPractices = practices.filter(
    (practice) => new Date(practice.created_at).getTime() >= Date.now() - 7 * MS_PER_DAY
  );
  const allPracticeDrills = practices.flatMap(getPracticeDrills);

  if (weeklyPractices.length >= 2) {
    insights.push({
      title: "Practice rhythm is building",
      detail: `${weeklyPractices.length} focused practice sessions this week gives the golf side a stronger improvement signal.`,
      tone: "golf",
      priority: 78,
      metric: `${weeklyPractices.length} sessions`,
      signal: "early",
      evidence: [`${weeklyPractices.length} practice sessions in 7 days`, `${practices.length} total practice sessions`],
      action: "Keep tagging focus areas and drills so practice can connect to round outcomes.",
    });
  }

  const bestDrill = findBestDrill(practices);
  if (bestDrill) {
    insights.push({
      title: `${bestDrill.name} is now measurable`,
      detail: `Best logged drill rate is ${bestDrill.rate}%. Keep repeating this to connect practice quality with round outcomes.`,
      tone: "pulse",
      priority: 77,
      metric: `${bestDrill.rate}%`,
      signal: "early",
      evidence: [`${bestDrill.rate}% best drill success rate`, `${allPracticeDrills.length} tracked drills`],
      action: "Repeat this drill for a few sessions so AthletiGolf can spot progress.",
    });
  } else if (practices.length > 0) {
    insights.push({
      title: "Add drill scores to practice",
      detail: "Practice sessions are being logged, but drill attempts and successes will make recommendations much sharper.",
      tone: "warning",
      priority: 62,
      signal: "needs-data",
      evidence: [`${practices.length} practice sessions`, "0 scored drills"],
      action: "Use the optional drill section when you do measurable practice.",
      needs: "6 scored drills",
    });
  }

  if (allPracticeDrills.length >= 2) {
    insights.push({
      title: `${allPracticeDrills.length} practice drills tracked`,
      detail: "Practice is now becoming measurable across more than one drill, which gives future recommendations a better signal.",
      tone: "pulse",
      priority: 73,
      metric: `${allPracticeDrills.length} drills`,
      signal: allPracticeDrills.length >= 6 ? "building" : "early",
      evidence: [`${allPracticeDrills.length} drills logged`, "Practice quality is becoming measurable"],
      action: "Keep logging attempts and successes for the same drills.",
    });
  }

  const practiceRecommendation = getPracticeRecommendation(golfStats, shortGameStats);
  if (practiceRecommendation) insights.push(practiceRecommendation);

  if (weeklyWorkouts.length >= 3) {
    insights.push({
      title: "Training consistency is building",
      detail: `${weeklyWorkouts.length} sessions this week gives the golf side enough context to start spotting useful patterns.`,
      tone: "lab",
      priority: 76,
      metric: `${weeklyWorkouts.length} sessions`,
      signal: "early",
      evidence: [`${weeklyWorkouts.length} training sessions in 7 days`, `${workouts.length} total sessions`],
      action: "Keep logging load, sets and reps so training can be compared with golf changes.",
    });
  }

  const pr = findBestRecentLift(workouts);
  if (pr) {
    insights.push({
      title: `${pr.name} PR logged`,
      detail: `Best recent load is ${pr.weight} kg. Keep this structured so strength changes can be compared with golf trends.`,
      tone: "lab",
      priority: 74,
      metric: `${pr.weight} kg`,
      signal: "early",
      evidence: [`${pr.name}: ${pr.weight} kg`, "Best recent lift in the last 28 days"],
      action: "Watch whether distance or scoring changes in the next round block.",
    });
  }

  const training = getTrainingIntelligence(workouts);
  if (training.topMuscle && training.totalVolume > 0) {
    insights.push({
      title: `${training.topMuscle.muscle} is carrying training load`,
      detail: `${Math.round(training.topMuscle.volume)} kg of recent logged volume sits here. Balance this against golf priorities and recovery.`,
      tone: "lab",
      priority: 71,
      metric: `${Math.round(training.topMuscle.volume)} kg`,
      signal: training.totalVolume >= 5000 ? "building" : "early",
      evidence: [`${Math.round(training.topMuscle.volume)} kg recent ${training.topMuscle.muscle} volume`, `${Math.round(training.totalVolume)} kg total tracked volume`],
      action: "Balance this load against golf practice quality and recovery.",
    });
  }

  if (training.stalledLift) {
    insights.push({
      title: `${training.stalledLift.name} may be stalling`,
      detail: `Recent best is ${training.stalledLift.current} kg after previously reaching ${training.stalledLift.previous} kg. Consider an alternative movement or lighter technique block.`,
      tone: "warning",
      priority: 69,
      metric: `${training.stalledLift.current} kg`,
      signal: "building",
      evidence: [`Current best: ${training.stalledLift.current} kg`, `Previous best: ${training.stalledLift.previous} kg`],
      action: "Try a variation, lighter technique block, or different rep range.",
    });
  }

  return insights.sort((a, b) => b.priority - a.priority).slice(0, 5);
}

export function getRelationshipInsights(rounds: Round[], workouts: Workout[]): RelationshipInsight[] {
  const recentRounds = sortedRounds(rounds).slice(0, 4);
  const previousRounds = sortedRounds(rounds).slice(4, 8);
  const recentDistance = average(
    recentRounds.map((round) => round.average_driving_distance).filter(isNumber)
  );
  const previousDistance = average(
    previousRounds.map((round) => round.average_driving_distance).filter(isNumber)
  );
  const recentVolume = getTrainingVolume(workouts, 28);
  const previousVolume = getTrainingVolume(workouts, 56) - recentVolume;
  const pr = findBestRecentLift(workouts);
  const relationships: RelationshipInsight[] = [];

  if (rounds.length < 3 || workouts.length < 3) {
    return [
      {
        title: "Relationship signal needs more data",
        detail: "Log at least three rounds and three training sessions before AthletiGolf starts linking golf changes with training changes.",
        tone: "pulse",
        confidence: "early",
        metrics: [
          { label: "Rounds", value: `${rounds.length}/3` },
          { label: "Training", value: `${workouts.length}/3` },
        ],
        evidence: ["Relationship checks compare recent blocks, not single sessions."],
        action: "Log three rounds and three structured sessions to unlock relationship checks.",
        needs: `${Math.max(0, 3 - rounds.length)} rounds / ${Math.max(0, 3 - workouts.length)} sessions`,
      },
    ];
  }

  if (
    recentDistance !== null &&
    previousDistance !== null &&
    recentDistance > previousDistance &&
    recentVolume > previousVolume
  ) {
    relationships.push({
      title: "Distance and training load are rising together",
      detail: pr
        ? `Driving distance rose during the same period that training volume increased and ${pr.name} hit ${pr.weight} kg. Useful link, not proof of cause yet.`
        : "Driving distance rose during the same period that tracked training volume increased. Useful link, not proof of cause yet.",
      tone: "lab",
      confidence: "building",
      metrics: [
        { label: "Drive trend", value: `+${Math.round(recentDistance - previousDistance)} yd` },
        { label: "Training load", value: `${Math.round(recentVolume)} kg` },
        { label: "Previous load", value: `${Math.round(previousVolume)} kg` },
      ],
      evidence: [
        `Recent distance: ${Math.round(recentDistance)} yd`,
        `Previous distance: ${Math.round(previousDistance)} yd`,
        pr ? `${pr.name} recent best: ${pr.weight} kg` : "No recent PR found",
      ],
      action: "Keep logging both areas; this becomes more useful after another two round blocks.",
    });
  }

  if (recentVolume === 0) {
    relationships.push({
      title: "Golf data has no training context",
      detail: "Recent rounds are logged, but training volume is missing. Log sessions to compare strength work with scoring and distance.",
      tone: "warning",
      confidence: "early",
      metrics: [
        { label: "Rounds", value: `${rounds.length}` },
        { label: "28d volume", value: "0 kg" },
      ],
      evidence: ["Recent rounds exist", "No structured training volume in the last 28 days"],
      action: "Log a structured training session with load, sets and reps.",
    });
  }

  if (relationships.length === 0) {
    relationships.push({
      title: "Pattern watch is active",
      detail: "Rounds and training are both being logged. AthletiGolf will flag clearer links as the trend window grows.",
      tone: "pulse",
      confidence: "early",
      metrics: [
        { label: "Rounds", value: `${rounds.length}` },
        { label: "Sessions", value: `${workouts.length}` },
      ],
      evidence: ["Golf and training data are both present", "No clear directional link yet"],
      action: "Keep logging; the next comparison needs stable recent and previous blocks.",
    });
  }

  return relationships.slice(0, 3);
}

export function getTrainingIntelligence(workouts: Workout[]): TrainingIntelligence {
  const recentWorkouts = workouts.filter(
    (workout) => new Date(workout.created_at).getTime() >= Date.now() - 28 * MS_PER_DAY
  );
  const muscleMap = new Map<string, MuscleVolume>();

  for (const exercise of recentWorkouts.flatMap((workout) => workout.exercises || [])) {
    const muscle = exercise.muscle_group || inferMuscleGroup(exercise);
    const volume = exercise.volume ?? inferExerciseVolume(exercise) ?? 0;
    const existing = muscleMap.get(muscle) || { muscle, volume: 0, exercises: 0 };
    existing.volume += volume;
    existing.exercises += 1;
    muscleMap.set(muscle, existing);
  }

  const muscleVolumes = [...muscleMap.values()].sort((a, b) => b.volume - a.volume);
  const topMuscle = muscleVolumes[0] ?? null;
  const recentPr = findBestRecentLift(workouts);
  const stalledLift = findStalledLift(workouts);
  const totalVolume = muscleVolumes.reduce((sum, item) => sum + item.volume, 0);

  return {
    totalVolume,
    muscleVolumes,
    topMuscle,
    recentPr,
    stalledLift,
    recommendation: getTrainingRecommendation(muscleVolumes, stalledLift, recentPr),
  };
}

export function getRecommendedPracticePlan(rounds: Round[], holes: RoundHole[]): PracticePlan {
  const golfStats = getGolfStats(rounds);
  const shortGameStats = getShortGameStats(holes);

  if ((golfStats.avgPenaltyShots ?? 0) >= 1.5) {
    return {
      title: "Tee-shot control session",
      detail: "Penalties are the quickest scoring leak. Build a session around safer start lines and conservative targets.",
      practiceType: "On Course",
      focusArea: "Course Strategy",
      drills: ["Penalty-Free Holes", "Conservative Targets"],
    };
  }

  if ((golfStats.avgGirPercent ?? 100) < 55) {
    return {
      title: "Approach ladder session",
      detail: "GIR is the clearest scoring lever. Work through wedge, short-iron and mid-iron target windows.",
      practiceType: "Driving Range",
      focusArea: "Mid Irons",
      drills: ["Target Greens", "Shot Shape Ladder"],
    };
  }

  if (shortGameStats.sandSaveChances >= 2 && (shortGameStats.sandSavePercent ?? 100) < 45) {
    return {
      title: "Bunker save session",
      detail: "Sand saves need their own reps so bunker recovery is not hidden inside normal chipping.",
      practiceType: "Short Game",
      focusArea: "Bunker Play",
      drills: ["Bunker Saves", "Random Lies"],
    };
  }

  if (shortGameStats.chipChances >= 3 && (shortGameStats.upAndDownPercent ?? 100) < 45) {
    return {
      title: "Up-and-down conversion",
      detail: "Missed greens need more one-putt recoveries. Track landing spot and conversion drills.",
      practiceType: "Chipping",
      focusArea: "Landing Spot",
      drills: ["Landing Spot", "One-Putt Conversion"],
    };
  }

  if ((golfStats.avgPutts ?? 0) >= 36) {
    return {
      title: "Pace putting block",
      detail: "Putting volume is high enough to make speed control the best next practice block.",
      practiceType: "Putting",
      focusArea: "Speed Control",
      drills: ["Lag Circle", "3ft Makes"],
    };
  }

  return {
    title: "Balanced scoring maintenance",
    detail: "No single golf leak is dominating yet. Keep one full-swing drill and one short-game drill in the week.",
    practiceType: "Driving Range",
    focusArea: "Shot Shape",
    drills: ["Fairway Finder", "Target Greens"],
  };
}

export function getCoachNotes(
  rounds: Round[],
  holes: RoundHole[],
  workouts: Workout[],
  practices: PracticeSession[] = []
): CoachNotes {
  const plan = getRecommendedPracticePlan(rounds, holes);
  const training = getTrainingIntelligence(workouts);
  const recentPracticeCount = practices.filter(
    (practice) => new Date(practice.created_at).getTime() >= Date.now() - 7 * MS_PER_DAY
  ).length;

  return {
    golf: plan.detail,
    training: training.recommendation,
    recovery:
      workouts.length >= 3 && recentPracticeCount >= 2
        ? "You have enough recent workload to protect recovery. Keep one easier session before the next full round."
        : "Build consistency first: one round, one focused practice session and one structured training log this week.",
  };
}

export function getDataHealthChecklist(
  rounds: Round[],
  workouts: Workout[],
  practices: PracticeSession[] = []
): DataHealthItem[] {
  const distanceRounds = rounds.filter((round) => round.average_driving_distance).length;
  const practiceDrills = practices.reduce((sum, practice) => sum + getPracticeDrills(practice).length, 0);
  const structuredWorkouts = workouts.filter((workout) =>
    (workout.exercises || []).some((exercise) => exercise.weight_value || exercise.volume)
  ).length;

  return [
    { label: "Rounds", detail: "Needed for scoring trends.", complete: rounds.length >= 5, current: rounds.length, target: 5 },
    { label: "Distance rounds", detail: "Needed for golf-speed relationships.", complete: distanceRounds >= 3, current: distanceRounds, target: 3 },
    { label: "Practice drills", detail: "Needed for sharper practice recommendations.", complete: practiceDrills >= 6, current: practiceDrills, target: 6 },
    { label: "Structured workouts", detail: "Needed for muscle and lift intelligence.", complete: structuredWorkouts >= 6, current: structuredWorkouts, target: 6 },
  ];
}

export function getExerciseAlternatives(exerciseName: string | null | undefined) {
  if (!exerciseName) return [];
  return findExercise(exerciseName)?.alternatives || [];
}

function sortedRounds(rounds: Round[]) {
  return [...rounds].sort(
    (a, b) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime()
  );
}

function getTrainingVolume(workouts: Workout[], days: number) {
  const since = Date.now() - days * MS_PER_DAY;
  return workouts
    .filter((workout) => new Date(workout.created_at).getTime() >= since)
    .reduce(
      (sum, workout) =>
        sum + (workout.exercises || []).reduce((exerciseSum, exercise) => exerciseSum + (exercise.volume ?? 0), 0),
      0
    );
}

function findBestRecentLift(workouts: Workout[]) {
  const recent = workouts.filter(
    (workout) => new Date(workout.created_at).getTime() >= Date.now() - 28 * MS_PER_DAY
  );
  const lifts = recent
    .flatMap((workout) => workout.exercises || [])
    .map((exercise: ExerciseLog) => ({
      name: exercise.name || "Lift",
      weight: exercise.weight_value ?? Number.parseFloat(exercise.weight || "0"),
    }))
    .filter((lift) => Number.isFinite(lift.weight) && lift.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  return lifts[0] ?? null;
}

function findBestDrill(practices: PracticeSession[]) {
  const scored = practices
    .flatMap(getPracticeDrills)
    .map((drill) => {
      if (!drill.name || !drill.attempts || drill.attempts <= 0) {
        return null;
      }
      const successes = drill.successes ?? 0;
      return {
        name: drill.name,
        rate: Math.round((successes / drill.attempts) * 100),
      };
    })
    .filter((practice): practice is { name: string; rate: number } => practice !== null)
    .sort((a, b) => b.rate - a.rate);

  return scored[0] ?? null;
}

function getPracticeDrills(practice: PracticeSession): PracticeDrill[] {
  if (Array.isArray(practice.drills) && practice.drills.length > 0) return practice.drills;
  if (!practice.drill_name && !practice.drill_distance && !practice.drill_attempts && !practice.drill_successes) {
    return [];
  }
  return [
    {
      name: practice.drill_name || "",
      distance: practice.drill_distance || null,
      attempts: practice.drill_attempts ?? null,
      successes: practice.drill_successes ?? null,
    },
  ];
}

function getPracticeRecommendation(
  golfStats: ReturnType<typeof getGolfStats>,
  shortGameStats: ReturnType<typeof getShortGameStats>
): PerformanceInsight | null {
  if ((golfStats.avgPenaltyShots ?? 0) >= 1.5) {
    return {
      title: "Practice plan: tee-shot decisions",
      detail: "Penalties are high enough that course-management practice should come before chasing extra speed.",
      tone: "warning",
      priority: 90,
      metric: `${golfStats.avgPenaltyShots?.toFixed(1)} pens`,
      signal: "building",
      evidence: [`${golfStats.avgPenaltyShots?.toFixed(1)} penalty shots per round`, "Lower is better"],
      action: "Use an on-course tee-shot decision session before chasing more speed.",
    };
  }
  if ((golfStats.avgGirPercent ?? 100) < 55) {
    return {
      title: "Practice plan: approach ladder",
      detail: "GIR is the clearest route to better scoring. Build range sessions around wedge, short iron and mid-iron target windows.",
      tone: "pulse",
      priority: 86,
      metric: `${golfStats.avgGirPercent}% GIR`,
      signal: "building",
      evidence: [`${golfStats.avgGirPercent}% GIR`, "Approach play has the clearest scoring link"],
      action: "Log an approach ladder practice with target greens and shot-shape work.",
    };
  }
  if (shortGameStats.sandSaveChances >= 2 && (shortGameStats.sandSavePercent ?? 100) < 45) {
    return {
      title: "Practice plan: bunker saves",
      detail: "Sand-save rate is low enough to deserve its own drill block rather than being blended into normal chipping.",
      tone: "warning",
      priority: 83,
      metric: `${shortGameStats.sandSavePercent}%`,
      signal: shortGameStats.sandSaveChances >= 5 ? "building" : "early",
      evidence: [`${shortGameStats.sandSaves}/${shortGameStats.sandSaveChances} bunker chances converted`, "Bunker recovery is tracked separately"],
      action: "Run a bunker-save session and log attempts/successes.",
    };
  }
  if (shortGameStats.chipChances >= 3 && (shortGameStats.upAndDownPercent ?? 100) < 45) {
    return {
      title: "Practice plan: one-putt chips",
      detail: "Up-and-down rate points to short-game conversion. Track landing spot drills and one-putt conversion separately.",
      tone: "golf",
      priority: 81,
      metric: `${shortGameStats.upAndDownPercent}%`,
      signal: shortGameStats.chipChances >= 5 ? "building" : "early",
      evidence: [`${shortGameStats.upAndDowns}/${shortGameStats.chipChances} chip chances converted`, "Chip recoveries only"],
      action: "Track one-putt conversion drills from normal chips.",
    };
  }
  if ((golfStats.avgPutts ?? 0) >= 36) {
    return {
      title: "Practice plan: pace putting",
      detail: "Putting volume is high enough that lag putting and start-line drills should be a regular practice block.",
      tone: "golf",
      priority: 79,
      metric: `${golfStats.avgPutts?.toFixed(1)} putts`,
      signal: "building",
      evidence: [`${golfStats.avgPutts?.toFixed(1)} putts per round`, "Putting control uses a lower-is-better scale"],
      action: "Run lag putting and start-line drills this week.",
    };
  }
  return null;
}

function findStalledLift(workouts: Workout[]) {
  const recentStart = Date.now() - 28 * MS_PER_DAY;
  const previousStart = Date.now() - 56 * MS_PER_DAY;
  const recentBest = new Map<string, { name: string; weight: number }>();
  const previousBest = new Map<string, { name: string; weight: number }>();

  for (const workout of workouts) {
    const date = new Date(workout.created_at).getTime();
    for (const exercise of workout.exercises || []) {
      const weight = exercise.weight_value ?? Number.parseFloat(exercise.weight || "0");
      const name = exercise.name?.trim();
      if (!name || !Number.isFinite(weight) || weight <= 0) continue;
      const key = name.toLowerCase();
      const target = date >= recentStart ? recentBest : date >= previousStart ? previousBest : null;
      if (!target) continue;
      const existing = target.get(key);
      if (!existing || weight > existing.weight) target.set(key, { name, weight });
    }
  }

  for (const [key, previous] of previousBest) {
    const recent = recentBest.get(key);
    if (recent && recent.weight <= previous.weight) {
      return { name: recent.name, current: recent.weight, previous: previous.weight };
    }
  }
  return null;
}

function getTrainingRecommendation(
  muscleVolumes: MuscleVolume[],
  stalledLift: { name: string; current: number; previous: number } | null,
  recentPr: { name: string; weight: number } | null
) {
  if (stalledLift) {
    return `${stalledLift.name} looks flat. Try a variation, lower-load technique block, or different rep range next.`;
  }
  if (recentPr) {
    return `${recentPr.name} is your strongest recent signal. Keep it, but protect recovery so golf practice quality stays high.`;
  }
  if (muscleVolumes.length === 0) {
    return "Log structured sets, reps and load so AthletiGolf can read training progression.";
  }
  const muscles = new Set(muscleVolumes.map((item) => item.muscle));
  if (!muscles.has("Core") && !muscles.has("Posterior Chain")) {
    return "Add core or posterior-chain work so training supports rotation and posture, not just general strength.";
  }
  return "Training is structured enough to compare against golf trends. Keep logging load, sets and reps consistently.";
}

function inferMuscleGroup(exercise: ExerciseLog) {
  const lower = exercise.name?.toLowerCase() || "";
  if (/(bench|press|chest|push)/.test(lower)) return "Chest / Push";
  if (/(row|pulldown|pull|lat|rear delt)/.test(lower)) return "Back / Pull";
  if (/(squat|leg|rdl|hamstring|calf|lower)/.test(lower)) return "Legs";
  if (/(curl|tricep|arm)/.test(lower)) return "Arms";
  if (/(shoulder|lateral|delt)/.test(lower)) return "Shoulders";
  if (/(core|abs|plank|rotation|pallof)/.test(lower)) return "Core";
  return "Unmapped";
}

function inferExerciseVolume(exercise: ExerciseLog) {
  const weight = exercise.weight_value ?? Number.parseFloat(exercise.weight || "0");
  const sets = exercise.sets_value ?? Number.parseFloat(exercise.sets || "0");
  const reps = exercise.reps_value ?? Number.parseFloat(exercise.reps || "0");
  if (![weight, sets, reps].every(Number.isFinite)) return null;
  return weight * sets * reps;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function isNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}
