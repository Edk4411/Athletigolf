import type { ExerciseLog, Round, RoundHole, Workout } from "@/lib/types";
import { getGolfStats, getShortGameStats } from "@/lib/golfStats";

export type InsightTone = "golf" | "lab" | "pulse" | "warning";

export type PerformanceInsight = {
  title: string;
  detail: string;
  tone: InsightTone;
  priority: number;
  metric?: string;
};

export type RelationshipInsight = {
  title: string;
  detail: string;
  tone: InsightTone;
  confidence: "early" | "building" | "strong";
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getPerformanceInsights(
  rounds: Round[],
  holes: RoundHole[],
  workouts: Workout[]
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
    });
  } else if (recentDistance !== null) {
    insights.push({
      title: "Distance tracking is live",
      detail: "Keep logging average drive and longest drive so distance trends can connect with training load.",
      tone: "golf",
      priority: 70,
      metric: `${Math.round(recentDistance)} yd`,
    });
  } else {
    insights.push({
      title: "Add drive distance",
      detail: "Average drive and longest drive are ready to track, but no distance rounds have been logged yet.",
      tone: "warning",
      priority: 65,
    });
  }

  if ((golfStats.avgPenaltyShots ?? 0) >= 2) {
    insights.push({
      title: "Penalty shots are the fastest win",
      detail: "Penalties sit on the bad side of the scoring profile. Safer targets and tee decisions should come before swing changes.",
      tone: "warning",
      priority: 95,
      metric: `${golfStats.avgPenaltyShots?.toFixed(1)} / round`,
    });
  }

  if ((golfStats.avgGirPercent ?? 100) < 45 && rounds.length >= 2) {
    insights.push({
      title: "Approach control is holding scoring back",
      detail: "GIR is low compared with the rest of the profile, so range work should bias towards approach distances.",
      tone: "pulse",
      priority: 88,
      metric: `${golfStats.avgGirPercent}% GIR`,
    });
  }

  if (shortGameStats.chipChances >= 3 && (shortGameStats.upAndDownPercent ?? 100) < 35) {
    insights.push({
      title: "Up-and-down rate needs attention",
      detail: "Missed greens are not turning into enough one-putt recoveries. Short-game practice has a clear scoring link.",
      tone: "golf",
      priority: 84,
      metric: `${shortGameStats.upAndDownPercent}%`,
    });
  }

  if (shortGameStats.sandSaveChances >= 2 && (shortGameStats.sandSavePercent ?? 100) < 35) {
    insights.push({
      title: "Bunker recovery is a separate project",
      detail: "Sand saves are tracked separately now, so bunker practice can be judged without confusing it with normal chips.",
      tone: "warning",
      priority: 82,
      metric: `${shortGameStats.sandSavePercent}%`,
    });
  }

  const weeklyWorkouts = workouts.filter(
    (workout) => new Date(workout.created_at).getTime() >= Date.now() - 7 * MS_PER_DAY
  );
  if (weeklyWorkouts.length >= 3) {
    insights.push({
      title: "Training consistency is building",
      detail: `${weeklyWorkouts.length} sessions this week gives the golf side enough context to start spotting useful patterns.`,
      tone: "lab",
      priority: 76,
      metric: `${weeklyWorkouts.length} sessions`,
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
  const relationships: RelationshipInsight[] = [];

  if (rounds.length < 3 || workouts.length < 3) {
    return [
      {
        title: "Relationship signal needs more data",
        detail: "Log at least three rounds and three training sessions before AthletiGolf starts linking golf changes with training changes.",
        tone: "pulse",
        confidence: "early",
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
      detail: "Driving distance rose during the same period that tracked training volume increased. Useful link, not proof of cause yet.",
      tone: "lab",
      confidence: "building",
    });
  }

  if (recentVolume === 0) {
    relationships.push({
      title: "Golf data has no training context",
      detail: "Recent rounds are logged, but training volume is missing. Log sessions to compare strength work with scoring and distance.",
      tone: "warning",
      confidence: "early",
    });
  }

  if (relationships.length === 0) {
    relationships.push({
      title: "Pattern watch is active",
      detail: "Rounds and training are both being logged. AthletiGolf will flag clearer links as the trend window grows.",
      tone: "pulse",
      confidence: "early",
    });
  }

  return relationships.slice(0, 3);
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

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function isNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}
