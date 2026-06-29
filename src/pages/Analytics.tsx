import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowUpRight, BarChart3, Brain, Dumbbell, Flag, Target } from "lucide-react";
import { Button, EmptyState, SectionTitle, Surface } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import {
  formatAverage,
  formatControlPercent,
  formatPercent,
  getGolfStats,
  getShortGameStats,
  lowerIsBetterControl,
} from "@/lib/golfStats";
import {
  getPerformanceInsights,
  getRelationshipInsights,
  type PerformanceInsight,
  type RelationshipInsight,
} from "@/lib/insights";
import type { PracticeSession, Round, RoundHole, Workout } from "@/lib/types";

export default function Analytics() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundHoles, setRoundHoles] = useState<RoundHole[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [practices, setPractices] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: roundsData } = await supabase
      .from("rounds")
      .select("*")
      .order("created_at", { ascending: false });
    setRounds((roundsData as Round[]) || []);

    const { data: holesData } = await supabase
      .from("round_holes")
      .select("*")
      .order("created_at", { ascending: false });
    setRoundHoles((holesData as RoundHole[]) || []);

    const { data: workoutsData } = await supabase
      .from("workouts")
      .select("*")
      .order("created_at", { ascending: false });
    setWorkouts((workoutsData as Workout[]) || []);

    const { data: practiceData } = await supabase
      .from("practice_sessions")
      .select("*")
      .order("created_at", { ascending: false });
    setPractices((practiceData as PracticeSession[]) || []);
    setLoading(false);
  };

  const golfStats = getGolfStats(rounds);
  const shortGameStats = getShortGameStats(roundHoles);
  const penaltyControl = lowerIsBetterControl(golfStats.avgPenaltyShots, 0, 4);
  const puttingControl = lowerIsBetterControl(golfStats.avgPutts, 30, 42);
  const roundsWithScores = rounds.filter((r) => r.score !== null);
  const recentScores = roundsWithScores.slice(0, 8).reverse().map((r) => r.score || 0);
  const workoutsThisWeek = (() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return workouts.filter((w) => w.created_at && new Date(w.created_at) >= weekAgo).length;
  })();
  const exerciseCount = workouts.reduce((sum, workout) => sum + (workout.exercises?.length || 0), 0);
  const trainingVolume = workouts.reduce(
    (sum, workout) =>
      sum + (workout.exercises || []).reduce((exerciseSum, exercise) => exerciseSum + (exercise.volume ?? 0), 0),
    0
  );
  const performanceInsights = getPerformanceInsights(rounds, roundHoles, workouts, practices);
  const relationshipInsights = getRelationshipInsights(rounds, workouts);

  const biggestOpportunity =
    rounds.length === 0
      ? "Log rounds to unlock scoring opportunities."
      : (golfStats.avgPenaltyShots ?? 0) >= 2
      ? "Penalty control is costing scoring chances. Prioritise safer targets and tee-shot decisions."
      : (golfStats.avgGirPercent ?? 0) < 55
      ? "Approach play is the clearest scoring opportunity."
      : golfStats.avgScramblePercent !== null && golfStats.avgScramblePercent < 35
      ? "Scrambling is the next scoring lever: missed greens need more pars, not automatic bogeys."
      : (golfStats.avgFairwayPercent ?? 0) < 55
      ? "Driving accuracy is the clearest scoring opportunity."
      : "Short-game and putting consistency are the next useful focus.";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-lg text-muted">Loading performance report...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-5 md:px-8 md:py-7">
      <section className="mb-5 overflow-hidden rounded-2xl border border-white/10 bg-dark text-white">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-pulse">Performance Report</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              Intelligence, not noise.
            </h1>
            <p className="mt-4 max-w-2xl leading-relaxed text-white/64">
              See the relationship between scoring, practice markers and training consistency without turning the product into a spreadsheet.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/golf/submit"><a><Button variant="golf"><Flag className="h-4 w-4" />Round</Button></a></Link>
            <Link href="/workouts/submit"><a><Button variant="pulse"><Dumbbell className="h-4 w-4" />Training</Button></a></Link>
          </div>
        </div>
      </section>

      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ReportKpi label="Avg Score" value={formatAverage(golfStats.avgScore)} sub={`${rounds.length} rounds`} tone="golf" />
        <ReportKpi label="FIR" value={formatPercent(golfStats.avgFairwayPercent)} sub="tee accuracy" tone="golf" />
        <ReportKpi label="GIR" value={formatPercent(golfStats.avgGirPercent)} sub="approach marker" tone="pulse" />
        <ReportKpi label="Scramble" value={formatPercent(golfStats.avgScramblePercent)} sub="missed GIR recovery" tone="pulse" />
        <ReportKpi label="Up & Down" value={formatPercent(shortGameStats.upAndDownPercent)} sub={`${shortGameStats.upAndDowns}/${shortGameStats.chipChances} chip chances`} tone="golf" />
        <ReportKpi label="Sand Save" value={formatPercent(shortGameStats.sandSavePercent)} sub={`${shortGameStats.sandSaves}/${shortGameStats.sandSaveChances} bunker chances`} tone="golf" />
        <ReportKpi label="Avg Drive" value={formatDistance(golfStats.avgDrivingDistance)} sub={`best ${formatDistance(golfStats.longestDrive)}`} tone="golf" />
      </section>

      <section className="mb-5 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <Surface>
          <SectionTitle
            eyebrow="Insight Engine"
            title="What changed and what matters"
            action={<Brain className="h-5 w-5 text-pulse" />}
          />
          <div className="grid gap-3 md:grid-cols-2">
            {performanceInsights.map((insight) => (
              <InsightCard key={insight.title} insight={insight} />
            ))}
          </div>
        </Surface>

        <Surface className="bg-dark text-white">
          <div className="mb-5">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-pulse">
              Golf x Training
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-white">
              Relationship report
            </h2>
          </div>
          <div className="space-y-3">
            {relationshipInsights.map((insight) => (
              <RelationshipCard key={insight.title} insight={insight} />
            ))}
          </div>
        </Surface>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-5">
          <Surface>
            <SectionTitle eyebrow="Score Trend" title="Recent rounds" action={<BarChart3 className="h-5 w-5 text-muted" />} />
            {recentScores.length ? (
              <div className="flex h-80 items-end gap-3 overflow-x-auto pb-2">
                {recentScores.map((score, index) => {
                  const minScore = Math.min(...recentScores);
                  const maxScore = Math.max(...recentScores);
                  const range = maxScore - minScore || 1;
                  const height = ((maxScore - score) / range) * 220 + 42;
                  return (
                    <div key={`${score}-${index}`} className="flex min-w-16 flex-1 flex-col items-center justify-end gap-3">
                      <p className="text-sm font-semibold text-dark">{score}</p>
                      <div className="w-full rounded-t-lg bg-gradient-to-t from-golf to-pulse" style={{ height }} />
                      <p className="text-xs text-muted">R{index + 1}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title="No scores yet"
                description="Submit a round to start building your scoring trend."
                action={<Link href="/golf/submit"><a><Button variant="golf">Submit Round</Button></a></Link>}
              />
            )}
          </Surface>

          <div className="grid gap-5 lg:grid-cols-2">
            <Surface>
              <SectionTitle eyebrow="Golf" title="Scoring markers" />
              <div className="space-y-4">
                <Metric label="Fairways Hit" value={formatPercent(golfStats.avgFairwayPercent)} color="bg-golf" />
                <Metric label="Average Drive" value={formatDistance(golfStats.avgDrivingDistance)} color="bg-golf" />
                <Metric label="Longest Drive" value={formatDistance(golfStats.longestDrive)} color="bg-pulse" />
                <Metric label="Greens In Regulation" value={formatPercent(golfStats.avgGirPercent)} color="bg-pulse" />
                <Metric label="Scramble Rate" value={formatPercent(golfStats.avgScramblePercent)} color="bg-gold" />
                <Metric label="Up & Down Rate" value={formatPercent(shortGameStats.upAndDownPercent)} color="bg-golf" />
                <Metric label="Sand Save Rate" value={formatPercent(shortGameStats.sandSavePercent)} color="bg-gold" />
                <ControlMetric
                  label="Putting Control"
                  value={formatControlPercent(puttingControl)}
                  sub={`${formatAverage(golfStats.avgPutts)} putts/round`}
                  control={puttingControl}
                />
                <ControlMetric
                  label="Penalty Control"
                  value={formatControlPercent(penaltyControl)}
                  sub={`${formatAverage(golfStats.avgPenaltyShots)} penalties/round`}
                  control={penaltyControl}
                  danger
                />
              </div>
            </Surface>

            <Surface>
              <SectionTitle eyebrow="Performance Lab" title="Training markers" />
              <div className="space-y-4">
                <Metric label="Total Sessions" value={`${workouts.length}`} color="bg-lab" />
                <Metric label="This Week" value={`${workoutsThisWeek}`} color="bg-pulse" />
                <Metric label="Exercises Logged" value={`${exerciseCount}`} color="bg-lab" />
                <Metric label="Tracked Volume" value={`${Math.round(trainingVolume)} kg`} color="bg-pulse" />
                <Metric label="Status" value={workouts.length ? "Active" : "-"} color="bg-dark" />
              </div>
            </Surface>
          </div>
        </div>

        <div className="space-y-5">
          <Surface className="bg-dark text-white">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-pulse/15 text-pulse">
                <Target className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-pulse">Focus</p>
                <h2 className="text-xl font-semibold">Recommended next move</h2>
              </div>
            </div>
            <p className="mt-5 leading-relaxed text-white/70">{biggestOpportunity}</p>
            <Link href="/golf/practice">
              <a className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-pulse">
                Log focused practice <ArrowUpRight className="h-4 w-4" />
              </a>
            </Link>
          </Surface>

          <Surface>
            <SectionTitle eyebrow="Data Health" title="Signal strength" />
            <div className="space-y-3">
              <Health label="Rounds" value={rounds.length} target={5} tone="golf" />
              <Health label="Distance rounds" value={rounds.filter((round) => round.average_driving_distance).length} target={3} tone="golf" />
              <Health label="Training sessions" value={workouts.length} target={8} tone="lab" />
              <Health label="This week" value={workoutsThisWeek} target={3} tone="pulse" />
            </div>
          </Surface>
        </div>
      </section>
    </main>
  );
}

function InsightCard({ insight }: { insight: PerformanceInsight }) {
  return (
    <div className={`rounded-xl border p-4 ${getInsightToneClass(insight.tone)}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug text-dark">{insight.title}</h3>
        {insight.metric && (
          <span className="shrink-0 rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-dark">
            {insight.metric}
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-muted">{insight.detail}</p>
    </div>
  );
}

function RelationshipCard({ insight }: { insight: RelationshipInsight }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/8 p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug text-white">{insight.title}</h3>
        <span className="rounded-full bg-pulse/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-pulse">
          {insight.confidence}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-white/64">{insight.detail}</p>
    </div>
  );
}

function getInsightToneClass(tone: PerformanceInsight["tone"]) {
  if (tone === "golf") return "border-golf/20 bg-golf/8";
  if (tone === "lab") return "border-lab/20 bg-lab/8";
  if (tone === "warning") return "border-gold/30 bg-gold/12";
  return "border-pulse/20 bg-pulse/8";
}

function ReportKpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  tone: "golf" | "pulse" | "lab";
}) {
  const line = tone === "golf" ? "bg-golf" : tone === "pulse" ? "bg-pulse" : "bg-lab";
  return (
    <div className="rounded-xl border border-line bg-panel p-5 shadow-sm">
      <div className={`mb-4 h-1 w-12 rounded-full ${line}`} />
      <p className="text-sm font-medium text-muted">{label}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark">{value}</h2>
      <p className="mt-2 text-sm text-muted">{sub}</p>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  const numericValue = Number.parseFloat(value);
  const width = value.includes("%") ? value : `${Math.min(numericValue * 0.4 || 18, 100)}%`;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-muted">{label}</p>
        <p className="font-semibold text-dark">{value}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-steel/10">
        <div className={`h-full rounded-full ${color}`} style={{ width }} />
      </div>
    </div>
  );
}

function ControlMetric({
  label,
  value,
  sub,
  control,
  danger,
}: {
  label: string;
  value: string;
  sub: string;
  control: number | null;
  danger?: boolean;
}) {
  const width = `${control ?? 0}%`;
  const color =
    control === null
      ? "bg-steel/20"
      : control >= 70
      ? "bg-golf"
      : control >= 40
      ? "bg-gold"
      : danger
      ? "bg-danger"
      : "bg-warning";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="text-xs text-muted">{sub}</p>
        </div>
        <p className="font-semibold text-dark">{value}</p>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-danger/15">
        <div className={`absolute right-0 h-full rounded-full ${color}`} style={{ width }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        <span>Bad</span>
        <span>Good</span>
      </div>
    </div>
  );
}

function Health({
  label,
  value,
  target,
  tone,
}: {
  label: string;
  value: number;
  target: number;
  tone: "golf" | "lab" | "pulse";
}) {
  const width = `${Math.min((value / target) * 100, 100)}%`;
  const color = tone === "golf" ? "bg-golf" : tone === "lab" ? "bg-lab" : "bg-pulse";
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <p className="font-semibold text-dark">{value}/{target}</p>
      </div>
      <div className="h-2 rounded-full bg-steel/10">
        <div className={`h-full rounded-full ${color}`} style={{ width }} />
      </div>
    </div>
  );
}

function formatDistance(value: number | null) {
  return value === null ? "-" : `${Math.round(value)} yd`;
}
