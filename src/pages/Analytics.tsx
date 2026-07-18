import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Activity, BarChart3, Dumbbell, Flag, HeartPulse, Swords, Target } from "lucide-react";
import { Button, EmptyState, SectionTitle, Surface } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import {
  formatAverage,
  formatPercent,
  getComparableRoundScore,
  getGolfStats,
  getShortGameStats,
} from "@/lib/golfStats";
import type { CardioSession, Round, RoundGame, RoundGameHole, RoundGameResult, RoundHole, WellnessLog, Workout } from "@/lib/types";

type AnalyticsTab = "golf" | "matchplay" | "gym" | "wellness";

type MatchplayRecentResult = {
  id: string;
  gameName: string;
  label: string;
  roundIntent: string;
  created: string;
};

type MatchplayHoleOutcome = {
  index: number;
  hole: number;
  label: string;
  leader: "A" | "B" | "AS";
};

type MatchplayStats = {
  matches: number;
  competitive: number;
  casual: number;
  wins: number;
  losses: number;
  halves: number;
  holesWon: number;
  holesLost: number;
  holesHalved: number;
  closeouts: string[];
  recentResults: MatchplayRecentResult[];
  holeOutcomes: MatchplayHoleOutcome[];
};

export default function Analytics() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("golf");
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundHoles, setRoundHoles] = useState<RoundHole[]>([]);
  const [roundGames, setRoundGames] = useState<RoundGame[]>([]);
  const [roundGameHoles, setRoundGameHoles] = useState<RoundGameHole[]>([]);
  const [roundGameResults, setRoundGameResults] = useState<RoundGameResult[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [cardio, setCardio] = useState<CardioSession[]>([]);
  const [wellness, setWellness] = useState<WellnessLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [roundsResult, holesResult, gamesResult, gameHolesResult, gameResultsResult, workoutsResult, cardioResult, wellnessResult] = await Promise.all([
      supabase.from("rounds").select("*").order("created_at", { ascending: false }),
      supabase.from("round_holes").select("*").order("created_at", { ascending: false }),
      supabase.from("round_games").select("*").order("created_at", { ascending: false }),
      supabase.from("round_game_holes").select("*").order("created_at", { ascending: false }),
      supabase.from("round_game_results").select("*").order("created_at", { ascending: false }),
      supabase.from("workouts").select("*").order("created_at", { ascending: false }),
      supabase.from("cardio_sessions").select("*").order("session_date", { ascending: false }),
      supabase.from("daily_wellness_logs").select("*").order("log_date", { ascending: false }),
    ]);

    setRounds((roundsResult.data as Round[]) || []);
    setRoundHoles((holesResult.data as RoundHole[]) || []);
    setRoundGames((gamesResult.data as RoundGame[]) || []);
    setRoundGameHoles((gameHolesResult.data as RoundGameHole[]) || []);
    setRoundGameResults((gameResultsResult.data as RoundGameResult[]) || []);
    setWorkouts((workoutsResult.data as Workout[]) || []);
    setCardio((cardioResult.data as CardioSession[]) || []);
    setWellness((wellnessResult.data as WellnessLog[]) || []);
    setLoading(false);
  };

  const golfStats = getGolfStats(rounds);
  const shortGameStats = getShortGameStats(roundHoles);
  const scoredRounds = rounds.filter((round) => getComparableRoundScore(round) !== null);
  const recentScoreRounds = scoredRounds.slice(0, 10).reverse();
  const lastFiveRounds = scoredRounds.slice(0, 5);
  const completedHoles = roundHoles.filter((hole) => hole.score !== null);
  const matchplayStats = useMemo(
    () => getMatchplayStats(roundGames, roundGameHoles, roundGameResults),
    [roundGameHoles, roundGameResults, roundGames]
  );

  const gymStats = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = workouts.filter((workout) => workout.created_at && new Date(workout.created_at) >= weekAgo);
    const exercises = workouts.flatMap((workout) => workout.exercises || []);
    const totalVolume = exercises.reduce((sum, exercise) => sum + (exercise.volume ?? 0), 0);
    const topMuscles = exercises.reduce<Record<string, number>>((acc, exercise) => {
      const muscle = exercise.muscle_group || "Other";
      acc[muscle] = (acc[muscle] || 0) + (exercise.volume ?? 0);
      return acc;
    }, {});

    return {
      sessionsThisWeek: thisWeek.length,
      totalSessions: workouts.length,
      exerciseCount: exercises.length,
      totalVolume,
      topMuscles: Object.entries(topMuscles)
        .map(([muscle, volume]) => ({ muscle, volume }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 6),
    };
  }, [workouts]);

  const wellnessStats = useMemo(() => {
    const recentWellness = wellness.slice(0, 7);
    const recentCardio = cardio.slice(0, 7);
    return {
      wellnessDays: wellness.length,
      cardioSessions: cardio.length,
      avgSleep: average(recentWellness.map((log) => log.sleep_hours).filter(isNumber)),
      avgWater: average(recentWellness.map((log) => log.water_litres).filter(isNumber)),
      cardioDistance: recentCardio.reduce((sum, session) => sum + (session.distance_km ?? 0), 0),
      cardioMinutes: recentCardio.reduce((sum, session) => sum + (session.duration_minutes ?? 0), 0),
    };
  }, [cardio, wellness]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-lg text-muted">Loading raw stats...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-cream px-4 py-5 md:px-8 md:py-7">
      <section className="mb-5 overflow-hidden rounded-3xl border border-line bg-panel">
        <div className="grid gap-5 p-5 md:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Analytics</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-dark md:text-5xl">
              Raw numbers, cleanly.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted md:text-base">
              This page is just your stats: rounds, sessions, trends and recent averages. AthletiAI handles the coaching and cross-area interpretation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="golf" onClick={() => navigate("/golf/submit")}><Flag className="h-4 w-4" />Round</Button>
            <Button variant="gym" onClick={() => navigate("/workouts/submit")}><Dumbbell className="h-4 w-4" />Training</Button>
          </div>
        </div>
      </section>

      <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border border-line bg-panel p-2 sm:grid-cols-4">
        <TabButton active={activeTab === "golf"} icon={<Flag className="h-4 w-4" />} label="Golf" onClick={() => setActiveTab("golf")} />
        <TabButton active={activeTab === "matchplay"} icon={<Swords className="h-4 w-4" />} label="Match" onClick={() => setActiveTab("matchplay")} />
        <TabButton active={activeTab === "gym"} icon={<Dumbbell className="h-4 w-4" />} label="Gym" onClick={() => setActiveTab("gym")} />
        <TabButton active={activeTab === "wellness"} icon={<HeartPulse className="h-4 w-4" />} label="Wellness" onClick={() => setActiveTab("wellness")} />
      </div>

      {activeTab === "golf" && (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ReportKpi label="Avg Score" value={formatAverage(golfStats.avgScore)} sub={`${scoredRounds.length} scoring rounds`} tone="golf" />
            <ReportKpi label="Best Round" value={golfStats.bestScore === null ? "-" : golfStats.bestScore} sub="18-hole equivalent" tone="golf" />
            <ReportKpi label="FIR" value={formatPercent(golfStats.avgFairwayPercent)} sub="fairways hit" tone="gold" />
            <ReportKpi label="GIR" value={formatPercent(golfStats.avgGirPercent)} sub="greens in regulation" tone="pulse" />
            <ReportKpi label="Scramble" value={formatPercent(golfStats.avgScramblePercent)} sub="missed green recovery" tone="golf" />
            <ReportKpi label="Up & Down" value={formatPercent(shortGameStats.upAndDownPercent)} sub={`${shortGameStats.upAndDowns}/${shortGameStats.chipChances} chances`} tone="gold" />
            <ReportKpi label="Sand Save" value={formatPercent(shortGameStats.sandSavePercent)} sub={`${shortGameStats.sandSaves}/${shortGameStats.sandSaveChances} chances`} tone="gold" />
            <ReportKpi label="Avg Drive" value={formatDistance(golfStats.avgDrivingDistance)} sub={`best ${formatDistance(golfStats.longestDrive)}`} tone="pulse" />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <Surface className="min-w-0">
              <SectionTitle eyebrow="Score Trend" title="Recent scoring rounds" action={<BarChart3 className="h-5 w-5 text-muted" />} />
              {recentScoreRounds.length ? (
                <ScoreLineChart rounds={recentScoreRounds} />
              ) : (
                <EmptyState
                  title="No scores yet"
                  description="Submit a round to start building your scoring trend."
                  action={<Button variant="golf" onClick={() => navigate("/golf/submit")}>Submit Round</Button>}
                />
              )}
            </Surface>

            <Surface>
              <SectionTitle eyebrow="Last 5" title="Putts and penalties" action={<Target className="h-5 w-5 text-muted" />} />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <TrendTile
                  label="Putts"
                  average={formatAverage(golfStats.avgPutts)}
                  unit="per round"
                  values={lastFiveRounds.map((round) => round.putts ?? null)}
                  empty="No putting data"
                />
                <TrendTile
                  label="Penalties"
                  average={formatAverage(golfStats.avgPenaltyShots)}
                  unit="per round"
                  values={lastFiveRounds.map((round) => round.penalty_shots ?? 0)}
                  empty="No penalty data"
                  danger
                />
              </div>
            </Surface>
          </section>

          <Surface>
            <SectionTitle eyebrow="Hole Detail" title="Shot markers" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <CompactStat label="Holes Logged" value={completedHoles.length.toString()} />
              <CompactStat label="Fairway Miss Left" value={countHoleValue(completedHoles, "fairway_result", "left").toString()} />
              <CompactStat label="Fairway Miss Right" value={countHoleValue(completedHoles, "fairway_result", "right").toString()} />
              <CompactStat label="Water / OB" value={completedHoles.filter((hole) => hole.tee_shot_location === "water" || hole.tee_shot_location === "out_of_bounds").length.toString()} />
            </div>
          </Surface>
        </div>
      )}

      {activeTab === "matchplay" && (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ReportKpi label="Matches" value={matchplayStats.matches} sub={`${matchplayStats.competitive} competitive / ${matchplayStats.casual} casual`} tone="golf" />
            <ReportKpi label="Record" value={`${matchplayStats.wins}-${matchplayStats.losses}-${matchplayStats.halves}`} sub="wins-losses-halves" tone="gold" />
            <ReportKpi label="Holes Won" value={matchplayStats.holesWon} sub={`${matchplayStats.holesLost} lost / ${matchplayStats.holesHalved} halved`} tone="pulse" />
            <ReportKpi label="Closeouts" value={matchplayStats.closeouts.length} sub={matchplayStats.closeouts[0] || "none yet"} tone="golf" />
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <Surface>
              <SectionTitle eyebrow="Matchplay" title="Recent results" action={<Swords className="h-5 w-5 text-muted" />} />
              {matchplayStats.recentResults.length ? (
                <div className="space-y-3">
                  {matchplayStats.recentResults.map((result) => (
                    <div key={result.id} className="rounded-2xl border border-line bg-white/70 p-4 dark:bg-panel">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-dark">{result.gameName}</p>
                          <p className="mt-1 text-xs capitalize text-muted">{result.roundIntent} / {result.created}</p>
                        </div>
                        <span className="rounded-full bg-golf/10 px-3 py-1 text-xs font-bold text-golf">{result.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No matchplay yet"
                  description="Start a matchplay round to build a separate match record."
                  action={<Button variant="golf" onClick={() => navigate("/golf/submit")}>Start Match</Button>}
                />
              )}
            </Surface>

            <Surface>
              <SectionTitle eyebrow="Hole Outcomes" title="Won, lost and halved holes" />
              {matchplayStats.holeOutcomes.length ? (
                <div className="grid gap-2">
                  {matchplayStats.holeOutcomes.slice(0, 18).map((hole) => (
                    <div key={`${hole.hole}-${hole.index}`} className="grid grid-cols-[52px_1fr_auto] items-center gap-3 rounded-xl bg-white/70 px-3 py-2 dark:bg-panel">
                      <span className="text-xs font-bold text-muted">H{hole.hole}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-steel/10">
                        <div className={`h-full ${hole.leader === "A" ? "bg-golf" : hole.leader === "B" ? "bg-pulse" : "bg-gold"}`} style={{ width: "100%" }} />
                      </div>
                      <span className="text-xs font-bold text-dark">{hole.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No hole results yet" description="Hole-by-hole match outcomes will appear once match games are saved." />
              )}
            </Surface>
          </section>
        </div>
      )}

      {activeTab === "gym" && (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ReportKpi label="Sessions" value={gymStats.totalSessions} sub="all time" tone="pulse" />
            <ReportKpi label="This Week" value={gymStats.sessionsThisWeek} sub="training sessions" tone="pulse" />
            <ReportKpi label="Exercises" value={gymStats.exerciseCount} sub="logged movements" tone="gold" />
            <ReportKpi label="Volume" value={`${Math.round(gymStats.totalVolume)} kg`} sub="tracked total" tone="golf" />
          </section>
          <Surface>
            <SectionTitle eyebrow="Gym" title="Volume by muscle group" />
            {gymStats.topMuscles.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {gymStats.topMuscles.map((item) => (
                  <RawBar key={item.muscle} label={item.muscle} value={`${Math.round(item.volume)} kg`} percent={(item.volume / (gymStats.topMuscles[0]?.volume || 1)) * 100} />
                ))}
              </div>
            ) : (
              <EmptyState title="No training data yet" description="Submit workouts to build gym analytics." action={<Button variant="gym" onClick={() => navigate("/workouts/submit")}>Submit Workout</Button>} />
            )}
          </Surface>
        </div>
      )}

      {activeTab === "wellness" && (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ReportKpi label="Wellness Logs" value={wellnessStats.wellnessDays} sub="days saved" tone="golf" />
            <ReportKpi label="Avg Sleep" value={formatAverage(wellnessStats.avgSleep)} sub="last 7 logs" tone="pulse" />
            <ReportKpi label="Avg Water" value={formatAverage(wellnessStats.avgWater)} sub="litres / day" tone="pulse" />
            <ReportKpi label="Cardio" value={wellnessStats.cardioSessions} sub="sessions saved" tone="gold" />
          </section>
          <Surface>
            <SectionTitle eyebrow="Cardio" title="Recent movement" action={<Activity className="h-5 w-5 text-muted" />} />
            <div className="grid gap-3 sm:grid-cols-2">
              <CompactStat label="Distance, last 7 sessions" value={`${wellnessStats.cardioDistance.toFixed(1)} km`} />
              <CompactStat label="Time, last 7 sessions" value={`${Math.round(wellnessStats.cardioMinutes)} min`} />
            </div>
          </Surface>
        </div>
      )}
    </main>
  );
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition ${
        active ? "bg-dark text-white shadow-sm" : "text-muted hover:bg-steel/5 hover:text-dark"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ReportKpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub: string;
  tone: "golf" | "pulse" | "gold";
}) {
  const line = tone === "golf" ? "bg-golf" : tone === "pulse" ? "bg-pulse" : "bg-gold";
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-panel p-4 shadow-sm md:p-5">
      <div className={`mb-3 h-1 w-10 rounded-full ${line}`} />
      <p className="truncate text-sm font-medium text-muted">{label}</p>
      <h2 className="mt-2 break-words text-2xl font-semibold tracking-tight text-dark md:text-3xl">{value}</h2>
      <p className="mt-1 text-sm text-muted">{sub}</p>
    </div>
  );
}

function ScoreLineChart({ rounds }: { rounds: Round[] }) {
  const scores = rounds.map((round) => getComparableRoundScore(round) || 0);
  const bestScore = Math.min(...scores);
  const worstScore = Math.max(...scores);
  const lower = Math.max(0, Math.floor(bestScore - 2));
  const upper = Math.ceil(worstScore + 2);
  const range = upper - lower || 1;
  const width = 640;
  const height = 260;
  const padding = { top: 26, right: 20, bottom: 46, left: 36 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const points = rounds.map((round, index) => {
    const x = rounds.length === 1 ? padding.left + plotWidth / 2 : padding.left + (index / (rounds.length - 1)) * plotWidth;
    const score = getComparableRoundScore(round) || 0;
    const y = padding.top + ((upper - score) / range) * plotHeight;
    return { x, y, score, round };
  });
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const averageY = padding.top + ((upper - average) / range) * plotHeight;
  const ticks = Array.from({ length: 4 }, (_, index) => {
    const value = lower + (range / 3) * index;
    const y = padding.top + ((upper - value) / range) * plotHeight;
    return { value: Math.round(value), y };
  }).reverse();
  const path = buildSmoothPath(points);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white/70 dark:bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-dark">Score movement</p>
          <p className="text-xs text-muted">Lower is better. Last {rounds.length} scoring rounds.</p>
        </div>
        <p className="rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-dark">Avg {average.toFixed(1)}</p>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block h-[220px] w-full sm:h-[250px] lg:h-[280px]"
        role="img"
        aria-label="Recent round score line chart"
        preserveAspectRatio="none"
      >
        <rect x="0" y="0" width={width} height={height} className="fill-transparent" />
        {ticks.map((tick) => (
          <g key={tick.value}>
            <line x1={padding.left} x2={width - padding.right} y1={tick.y} y2={tick.y} stroke="currentColor" className="text-line" strokeWidth="1" />
            <text x={padding.left - 10} y={tick.y + 4} textAnchor="end" className="fill-muted text-[11px] font-semibold">
              {tick.value}
            </text>
          </g>
        ))}
        <line x1={padding.left} x2={width - padding.right} y1={averageY} y2={averageY} stroke="currentColor" className="text-gold" strokeDasharray="5 7" strokeWidth="1.5" />
        <path d={path} fill="none" stroke="currentColor" className="text-pulse" strokeWidth="3.5" strokeLinecap="round" />
        {points.map((point, index) => {
          const isBest = point.score === bestScore;
          const isWorst = point.score === worstScore;
          const fillClass = isBest ? "fill-golf" : isWorst ? "fill-danger" : "fill-gold";
          return (
            <g key={`${point.round.id}-${index}`}>
              <circle cx={point.x} cy={point.y} r="6.5" className={`${fillClass} stroke-white`} strokeWidth="2.5" />
              <text x={point.x} y={point.y - 14} textAnchor="middle" className="fill-dark text-[12px] font-bold">
                {point.score}
              </text>
              <text x={point.x} y={height - 24} textAnchor="middle" className="fill-muted text-[10px] font-semibold">
                {formatRoundDate(point.round.created_at)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function TrendTile({
  label,
  average,
  unit,
  values,
  empty,
  danger,
}: {
  label: string;
  average: string;
  unit: string;
  values: Array<number | null>;
  empty: string;
  danger?: boolean;
}) {
  const cleanValues = values.filter(isNumber);
  const best = cleanValues.length ? Math.min(...cleanValues) : null;
  const worst = cleanValues.length ? Math.max(...cleanValues) : null;
  return (
    <div className="rounded-2xl border border-line bg-white/70 p-4 dark:bg-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-dark">{average}</p>
          <p className="text-xs text-muted">{unit}</p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-bold ${danger ? "bg-danger/10 text-danger" : "bg-golf/10 text-golf"}`}>
          lower is better
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {values.length ? (
          values.map((value, index) => (
            <span key={index} className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm font-semibold ${value === null ? "bg-steel/10 text-muted" : "bg-dark text-white"}`}>
              {value ?? "-"}
            </span>
          ))
        ) : (
          <p className="text-sm text-muted">{empty}</p>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <CompactStat label="Best" value={best === null ? "-" : best.toString()} />
        <CompactStat label="Highest" value={worst === null ? "-" : worst.toString()} />
      </div>
    </div>
  );
}

function CompactStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel px-3 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-dark">{value}</p>
    </div>
  );
}

function RawBar({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <div className="rounded-2xl border border-line bg-white/70 p-4 dark:bg-panel">
      <div className="mb-3 flex justify-between gap-3 text-sm">
        <span className="font-medium text-muted">{label}</span>
        <span className="font-semibold text-dark">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-steel/10">
        <div className="h-full rounded-full bg-lab" style={{ width: `${Math.max(4, Math.min(percent, 100))}%` }} />
      </div>
    </div>
  );
}

function buildSmoothPath(points: { x: number; y: number }[]) {
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const controlDistance = (point.x - previous.x) * 0.42;
    return `${path} C ${previous.x + controlDistance} ${previous.y}, ${point.x - controlDistance} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

function formatRoundDate(value?: string | null) {
  if (!value) return "Round";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function countHoleValue<T extends keyof RoundHole>(holes: RoundHole[], key: T, value: RoundHole[T]) {
  return holes.filter((hole) => hole[key] === value).length;
}

function formatDistance(value: number | null) {
  return value === null ? "-" : `${Math.round(value)} yd`;
}

function getMatchplayStats(games: RoundGame[], gameHoles: RoundGameHole[], results: RoundGameResult[]): MatchplayStats {
  const matchTypes = new Set(["match_play", "four_ball_match", "foursomes"]);
  const matchGames = games.filter((game) => matchTypes.has(game.game_type) || game.scoring_basis === "holes");
  const matchGameIds = new Set(matchGames.map((game) => game.id));
  const relevantHoles = gameHoles.filter((hole) => matchGameIds.has(hole.round_game_id));
  const relevantResults = results.filter((result) => matchGameIds.has(result.round_game_id));
  const teamAResults = relevantResults.filter((result) => result.result_payload?.team === "A");

  const wins = teamAResults.filter((result) => {
    const label = `${result.result_label || ""} ${result.result_payload?.closeout || ""}`.toLowerCase();
    return label.includes("team a wins");
  }).length;
  const losses = teamAResults.filter((result) => {
    const label = `${result.result_label || ""} ${result.result_payload?.closeout || ""}`.toLowerCase();
    return label.includes("team b wins");
  }).length;
  const halves = Math.max(0, matchGames.length - wins - losses);

  const holeOutcomes: MatchplayHoleOutcome[] = relevantHoles
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.hole_number - b.hole_number)
    .map((hole, index) => {
      const leader = typeof hole.match_state?.leader === "string" ? hole.match_state.leader : "AS";
      return {
        index,
        hole: hole.hole_number,
        label: hole.result_label || "Halved",
        leader: leader === "A" || leader === "B" ? leader : "AS",
      };
    });

  const closeouts = teamAResults
    .map((result) => {
      const closeout = result.result_payload?.closeout;
      return typeof closeout === "string" && closeout ? closeout : result.result_label || "";
    })
    .filter(Boolean)
    .slice(0, 4);

  const recentResults: MatchplayRecentResult[] = matchGames.slice(0, 5).map((game) => {
    const settings = game.settings || {};
    const result = teamAResults.find((item) => item.round_game_id === game.id) || relevantResults.find((item) => item.round_game_id === game.id);
    const roundIntent = typeof settings.roundIntent === "string" ? settings.roundIntent : "casual";
    return {
      id: game.id,
      gameName: game.name || game.game_type.replaceAll("_", " "),
      label: result?.result_label || (game.status === "finished" ? "Finished" : "In progress"),
      roundIntent,
      created: formatRoundDate(game.created_at),
    };
  });

  return {
    matches: matchGames.length,
    competitive: matchGames.filter((game) => game.settings?.roundIntent === "competition").length,
    casual: matchGames.filter((game) => game.settings?.roundIntent !== "competition").length,
    wins,
    losses,
    halves,
    holesWon: holeOutcomes.filter((hole) => hole.leader === "A").length,
    holesLost: holeOutcomes.filter((hole) => hole.leader === "B").length,
    holesHalved: holeOutcomes.filter((hole) => hole.leader === "AS").length,
    closeouts,
    recentResults,
    holeOutcomes,
  };
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
