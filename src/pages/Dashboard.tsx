import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  ArrowUpRight,
  Brain,
  Dumbbell,
  Flag,
  NotebookPen,
  PlusCircle,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { Button, EmptyState, SectionTitle, StatusPill, Surface } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
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
  getCoachNotes,
  getDataHealthChecklist,
  getExerciseAlternatives,
  getPerformanceInsights,
  getRecommendedPracticePlan,
  getRelationshipInsights,
  getTrainingIntelligence,
  type PerformanceInsight,
  type RelationshipInsight,
} from "@/lib/insights";
import type { ExerciseLog, PracticeSession, Round, RoundHole, Workout } from "@/lib/types";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundHoles, setRoundHoles] = useState<RoundHole[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [practices, setPractices] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);

  const firstName =
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Athlete";

  useEffect(() => {
    const load = async () => {
      const [{ data: r }, { data: h }, { data: w }, { data: p }] = await Promise.all([
        supabase.from("rounds").select("*").order("created_at", { ascending: false }),
        supabase.from("round_holes").select("*").order("created_at", { ascending: false }),
        supabase.from("workouts").select("*").order("created_at", { ascending: false }),
        supabase.from("practice_sessions").select("*").order("created_at", { ascending: false }),
      ]);
      setRounds((r as Round[]) || []);
      setRoundHoles((h as RoundHole[]) || []);
      setWorkouts((w as Workout[]) || []);
      setPractices((p as PracticeSession[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const workoutsThisWeek = workouts.filter((w) => new Date(w.created_at) >= weekAgo).length;
  const roundsThisMonth = rounds.filter((r) => new Date(r.created_at) >= monthStart).length;
  const latestWorkout = workouts[0] ?? null;
  const lastRound = rounds[0] ?? null;
  const golfStats = getGolfStats(rounds);
  const shortGameStats = getShortGameStats(roundHoles);
  const trainingVolume = workouts.reduce(
    (sum, workout) =>
      sum + (workout.exercises || []).reduce((exerciseSum, exercise) => exerciseSum + (exercise.volume ?? 0), 0),
    0
  );
  const penaltyControl = lowerIsBetterControl(golfStats.avgPenaltyShots, 0, 4);
  const puttingControl = lowerIsBetterControl(golfStats.avgPutts, 30, 42);
  const highlight = getWeeklyHighlight(rounds, roundHoles, workouts, weekAgo);
  const performanceInsights = getPerformanceInsights(rounds, roundHoles, workouts, practices);
  const relationshipInsights = getRelationshipInsights(rounds, workouts);
  const trainingIntel = getTrainingIntelligence(workouts);
  const coachNotes = getCoachNotes(rounds, roundHoles, workouts, practices);
  const practicePlan = getRecommendedPracticePlan(rounds, roundHoles);
  const dataHealth = getDataHealthChecklist(rounds, workouts, practices);
  const alternatives = getExerciseAlternatives(trainingIntel.stalledLift?.name || trainingIntel.recentPr?.name);
  const recommendedPracticeHref = `/golf/practice?type=${encodeURIComponent(practicePlan.practiceType)}&focus=${encodeURIComponent(practicePlan.focusArea)}&drills=${encodeURIComponent(practicePlan.drills.join("|"))}`;

  const activity = [
    ...rounds.slice(0, 3).map((round) => ({
      id: `round-${round.id}`,
      type: "Round",
      title: `${round.score ?? "-"} at ${round.course || "Unknown Course"}`,
      meta: round.date || new Date(round.created_at).toLocaleDateString("en-GB"),
      tone: "golf" as const,
    })),
    ...workouts.slice(0, 3).map((workout) => ({
      id: `workout-${workout.id}`,
      type: "Training",
      title: workout.workout_name || "Performance Session",
      meta: workout.date || new Date(workout.created_at).toLocaleDateString("en-GB"),
      tone: "gym" as const,
    })),
  ].slice(0, 6);

  return (
    <main className="min-h-screen bg-cream px-4 py-5 md:px-8 md:py-7">
      <section className="mb-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-dark text-white shadow-sm">
          <div className="grid gap-6 p-5 lg:grid-cols-[1fr_220px] lg:p-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-pulse">
                AthletiGolf Performance
              </p>
              <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
                {firstName}, here&apos;s the week.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/64 md:text-base">
                Golf form, training load and next actions in one tighter command view.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Button variant="golf" onClick={() => navigate("/golf/submit")}><Flag className="h-4 w-4" />Round</Button>
                <Button variant="pulse" onClick={() => navigate("/workouts/submit")}><Dumbbell className="h-4 w-4" />Training</Button>
                <Button variant="secondary" onClick={() => navigate("/golf/practice")} className="border-white/15 bg-white/10 text-white hover:bg-white/15"><NotebookPen className="h-4 w-4" />Practice</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              <MiniMetric label="Rounds Month" value={loading ? "..." : roundsThisMonth} />
              <MiniMetric label="Training Week" value={loading ? "..." : workoutsThisWeek} />
            </div>
          </div>
        </div>

        <Surface className="bg-panel/95">
          <SectionTitle eyebrow="Today" title={now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} />
          <div className="grid gap-3 md:grid-cols-2">
            <SummaryTile label="Last Round" value={lastRound ? `${lastRound.score ?? "-"}${lastRound.course ? ` / ${lastRound.course}` : ""}` : "No round"} tone="golf" />
            <SummaryTile label="Last Training" value={latestWorkout?.workout_name || "No session"} tone="lab" />
          </div>
          <div className="mt-3 rounded-xl border border-pulse/20 bg-pulse/8 p-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-pulse/15 text-pulse">
                <Trophy className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-lab">Highlight of the week</p>
                <h3 className="mt-1 font-semibold text-dark">{highlight.title}</h3>
                <p className="mt-1 text-sm text-muted">{highlight.detail}</p>
              </div>
            </div>
          </div>
        </Surface>
      </section>

      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Avg Score" value={formatAverage(golfStats.avgScore)} sub={`${rounds.length} rounds`} tone="golf" />
        <Kpi label="FIR" value={formatPercent(golfStats.avgFairwayPercent)} sub="driving shape" tone="golf" />
        <Kpi label="GIR" value={formatPercent(golfStats.avgGirPercent)} sub="approach control" tone="pulse" />
        <Kpi label="Avg Drive" value={formatDistance(golfStats.avgDrivingDistance)} sub="distance tracked" tone="golf" />
        <Kpi label="Up & Down" value={formatPercent(shortGameStats.upAndDownPercent)} sub={`${shortGameStats.upAndDowns}/${shortGameStats.chipChances} chip chances`} tone="golf" />
        <Kpi label="Sand Save" value={formatPercent(shortGameStats.sandSavePercent)} sub={`${shortGameStats.sandSaves}/${shortGameStats.sandSaveChances} bunker chances`} tone="golf" />
      </section>

      <section className="mb-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Surface>
          <SectionTitle
            eyebrow="Insight Engine"
            title="Performance signals"
            action={<Brain className="h-5 w-5 text-pulse" />}
          />
          <div className="grid gap-3 md:grid-cols-2">
            {performanceInsights.slice(0, 4).map((insight) => (
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
              Relationship watch
            </h2>
          </div>
          <div className="space-y-3">
            {relationshipInsights.map((insight) => (
              <RelationshipCard key={insight.title} insight={insight} />
            ))}
          </div>
        </Surface>
      </section>

      <section className="mb-5 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <Surface>
          <SectionTitle eyebrow="Coach Notes" title="This week's focus" />
          <div className="grid gap-3 md:grid-cols-3">
            <CoachNote title="Golf" text={coachNotes.golf} tone="golf" />
            <CoachNote title="Training" text={coachNotes.training} tone="lab" />
            <CoachNote title="Recovery" text={coachNotes.recovery} tone="pulse" />
          </div>
        </Surface>

        <Surface className="border-golf/20 bg-golf/5">
          <SectionTitle eyebrow="Recommended Practice" title={practicePlan.title} />
          <p className="text-sm leading-relaxed text-muted">{practicePlan.detail}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {practicePlan.drills.map((drill) => (
              <span key={drill} className="rounded-full bg-golf/10 px-3 py-1 text-xs font-semibold text-golf">
                {drill}
              </span>
            ))}
          </div>
          <Button variant="golf" onClick={() => navigate(recommendedPracticeHref)} className="mt-5">
            Start Recommended Practice
          </Button>
        </Surface>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr_0.8fr]">
        <Surface>
          <SectionTitle eyebrow="Golf Form" title="Scoring profile" />
          {rounds.length ? (
            <div className="space-y-4">
              <Meter label="Fairways" value={formatPercent(golfStats.avgFairwayPercent)} color="bg-golf" />
              <Meter label="Average Drive" value={formatDistance(golfStats.avgDrivingDistance)} color="bg-golf" />
              <Meter label="GIR" value={formatPercent(golfStats.avgGirPercent)} color="bg-pulse" />
              <Meter label="Scramble Rate" value={formatPercent(golfStats.avgScramblePercent)} color="bg-gold" />
              <Meter label="Up & Down Rate" value={formatPercent(shortGameStats.upAndDownPercent)} color="bg-golf" />
              <Meter label="Sand Save Rate" value={formatPercent(shortGameStats.sandSavePercent)} color="bg-gold" />
              <ControlMeter
                label="Putting Control"
                value={formatControlPercent(puttingControl)}
                sub={`${formatAverage(golfStats.avgPutts)} putts/round`}
                control={puttingControl}
              />
              <ControlMeter
                label="Penalty Control"
                value={formatControlPercent(penaltyControl)}
                sub={`${formatAverage(golfStats.avgPenaltyShots)} penalties/round`}
                control={penaltyControl}
                danger
              />
            </div>
          ) : (
            <EmptyState
              title="No golf form yet"
              description="Submit a round to build the scoring profile."
              action={<Button variant="golf" onClick={() => navigate("/golf/submit")}>Submit Round</Button>}
            />
          )}
        </Surface>

        <Surface>
          <SectionTitle eyebrow="Performance Lab" title="Training load" />
          <div className="grid gap-3">
            {[
              ["This week", workoutsThisWeek, 4],
              ["All sessions", workouts.length, Math.max(workouts.length, 1)],
              ["Volume", Math.round(trainingVolume), Math.max(Math.round(trainingVolume), 1)],
            ].map(([label, value, target]) => (
              <LoadRow key={label as string} label={label as string} value={value as number} target={target as number} />
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-pulse/15 bg-pulse/8 p-4">
            <p className="text-sm font-semibold text-dark">
              {trainingIntel.topMuscle ? `Top load: ${trainingIntel.topMuscle.muscle}` : "Lab note"}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {trainingIntel.recommendation}
            </p>
            {trainingIntel.recentPr && (
              <p className="mt-3 text-sm font-semibold text-lab">
                Recent signal: {trainingIntel.recentPr.name} {trainingIntel.recentPr.weight} kg
              </p>
            )}
            {alternatives.length > 0 && (
              <p className="mt-3 text-sm text-muted">
                Alternatives: {alternatives.slice(0, 3).join(", ")}
              </p>
            )}
          </div>
          {trainingIntel.muscleVolumes.length > 0 && (
            <div className="mt-5 space-y-3">
              {trainingIntel.muscleVolumes.slice(0, 4).map((item) => (
                <MuscleBalance key={item.muscle} item={item} max={trainingIntel.muscleVolumes[0]?.volume || 1} />
              ))}
            </div>
          )}
        </Surface>

        <Surface className="bg-dark text-white">
          <div className="mb-5 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pulse/15 text-pulse">
              <Target className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-pulse">Next Action</p>
              <h2 className="text-xl font-semibold">Best move</h2>
            </div>
          </div>
          <p className="leading-relaxed text-white/68">
            {rounds.length && workouts.length
              ? performanceInsights[0]?.action || practicePlan.detail
              : "Start with one round and one training session so AthletiGolf can connect both sides of performance."}
          </p>
          <div className="mt-6 grid gap-2">
            <Button variant="pulse" onClick={() => navigate("/golf/practice")} className="w-full">Log Practice</Button>
            <Button variant="secondary" onClick={() => navigate("/analytics")} className="w-full border-white/15 bg-white/10 text-white hover:bg-white/15">Open Report</Button>
          </div>
        </Surface>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Surface>
          <SectionTitle eyebrow="Activity" title="Recent logbook" action={<Activity className="h-5 w-5 text-muted" />} />
          {activity.length ? (
            <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
              {activity.map((item) => (
                <div key={item.id} className="grid gap-3 p-4 sm:grid-cols-[110px_1fr_auto] sm:items-center">
                  <StatusPill tone={item.tone}>{item.type}</StatusPill>
                  <div>
                    <h3 className="font-semibold text-dark">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted">{item.meta}</p>
                  </div>
                  <Zap className="h-4 w-4 text-muted" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No activity yet" description="Rounds and training sessions will land here." />
          )}
        </Surface>

        <Surface>
          <SectionTitle eyebrow="Fast actions" title="Launchpad" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Action href="/golf/submit" icon={Flag} title="Round" text="Scorecard entry" tone="golf" />
            <Action href="/workouts/submit" icon={Dumbbell} title="Training" text="Performance console" tone="pulse" />
            <Action href="/workouts" icon={PlusCircle} title="Board" text="Plan the week" tone="lab" />
            <Action href="/analytics" icon={ArrowUpRight} title="Report" text="Review trends" tone="dark" />
          </div>
        </Surface>
      </section>

      <section className="mt-5">
        <Surface>
          <SectionTitle eyebrow="Data Health" title="Unlock sharper intelligence" />
          <div className="grid gap-3 md:grid-cols-4">
            {dataHealth.map((item) => (
              <DataHealthCard key={item.label} item={item} />
            ))}
          </div>
        </Surface>
      </section>
    </main>
  );
}

function CoachNote({ title, text, tone }: { title: string; text: string; tone: "golf" | "lab" | "pulse" }) {
  const toneClass = tone === "golf" ? "border-golf/20 bg-golf/8" : tone === "lab" ? "border-lab/20 bg-lab/8" : "border-pulse/20 bg-pulse/8";
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{title}</p>
      <p className="mt-3 text-sm leading-relaxed text-dark">{text}</p>
    </div>
  );
}

function MuscleBalance({ item, max }: { item: { muscle: string; volume: number }; max: number }) {
  const width = `${Math.min((item.volume / max) * 100, 100)}%`;
  return (
    <div>
      <div className="mb-2 flex justify-between gap-3 text-sm">
        <span className="font-medium text-muted">{item.muscle}</span>
        <span className="font-semibold text-dark">{Math.round(item.volume)} kg</span>
      </div>
      <div className="h-2 rounded-full bg-steel/10">
        <div className="h-full rounded-full bg-lab" style={{ width }} />
      </div>
    </div>
  );
}

function DataHealthCard({ item }: { item: { label: string; detail: string; complete: boolean; current: number; target: number } }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-semibold text-dark">{item.label}</p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.complete ? "bg-golf/10 text-golf" : "bg-gold/15 text-gold"}`}>
          {item.current}/{item.target}
        </span>
      </div>
      <p className="text-sm text-muted">{item.detail}</p>
    </div>
  );
}

function InsightCard({ insight }: { insight: PerformanceInsight }) {
  const toneClass = getInsightToneClass(insight.tone);
  const signal = getSignalLabel(insight.signal, insight.priority);
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold leading-snug text-dark">{insight.title}</h3>
        <div className="flex flex-wrap gap-2">
          <span className="shrink-0 rounded-full bg-white/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-dark">
            {signal}
          </span>
          {insight.metric && (
            <span className="shrink-0 rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-dark">
              {insight.metric}
            </span>
          )}
        </div>
      </div>
      <p className="text-sm leading-relaxed text-muted">{insight.detail}</p>
      {insight.evidence && insight.evidence.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-line/70 pt-3">
          {insight.evidence.slice(0, 2).map((item) => (
            <p key={item} className="text-xs font-medium text-muted">Data: {item}</p>
          ))}
        </div>
      )}
      {insight.action && (
        <p className="mt-3 text-sm font-semibold text-dark">Next: {insight.action}</p>
      )}
      {insight.needs && (
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Needs {insight.needs}</p>
      )}
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
      {insight.metrics && insight.metrics.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {insight.metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border border-white/10 bg-white/8 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">{metric.label}</p>
              <p className="mt-1 text-sm font-semibold text-white">{metric.value}</p>
            </div>
          ))}
        </div>
      )}
      {insight.evidence && insight.evidence.length > 0 && (
        <p className="mt-3 text-xs leading-relaxed text-white/50">
          Data: {insight.evidence.slice(0, 2).join(" / ")}
        </p>
      )}
      {insight.action && (
        <p className="mt-3 text-sm font-semibold text-pulse">Next: {insight.action}</p>
      )}
      {insight.needs && (
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Needs {insight.needs}</p>
      )}
    </div>
  );
}

function getSignalLabel(signal: PerformanceInsight["signal"], priority: number) {
  if (signal === "needs-data") return "Needs Data";
  if (signal === "strong") return "Strong Signal";
  if (signal === "building") return "Building Signal";
  if (signal === "early") return "Early Signal";
  if (priority >= 90) return "Strong Signal";
  if (priority >= 75) return "Building Signal";
  return "Early Signal";
}

function getInsightToneClass(tone: PerformanceInsight["tone"]) {
  if (tone === "golf") return "border-golf/20 bg-golf/8";
  if (tone === "lab") return "border-lab/20 bg-lab/8";
  if (tone === "warning") return "border-gold/30 bg-gold/12";
  return "border-pulse/20 bg-pulse/8";
}

function MiniMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/8 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone: "golf" | "lab" | "pulse" }) {
  const toneClass = tone === "golf" ? "border-golf/20 bg-golf/8" : tone === "lab" ? "border-lab/20 bg-lab/8" : "border-pulse/20 bg-pulse/8";
  return (
    <div className={`min-h-[116px] rounded-xl border p-4 ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-3 text-lg font-semibold leading-snug text-dark">{value}</p>
    </div>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub: string; tone: "golf" | "pulse" | "lab" }) {
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

function Meter({ label, value, color }: { label: string; value: string; color: string }) {
  const numericValue = Number.parseFloat(value);
  const width = value.includes("%") ? value : `${Math.min(numericValue * 0.4 || 20, 100)}%`;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <p className="font-semibold text-dark">{value}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-steel/10">
        <div className={`h-full rounded-full ${color}`} style={{ width }} />
      </div>
    </div>
  );
}

function ControlMeter({
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
      <div className="mb-2 flex items-center justify-between gap-3">
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

function LoadRow({ label, value, target }: { label: string; value: number; target: number }) {
  const width = `${Math.min((value / target) * 100, 100)}%`;
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <p className="font-semibold text-dark">{value}</p>
      </div>
      <div className="h-2 rounded-full bg-steel/10">
        <div className="h-full rounded-full bg-lab" style={{ width }} />
      </div>
    </div>
  );
}

function Action({
  href,
  icon: Icon,
  title,
  text,
  tone,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  tone: "golf" | "pulse" | "lab" | "dark";
}) {
  const toneClass =
    tone === "golf"
      ? "bg-golf/10 text-golf"
      : tone === "pulse"
      ? "bg-pulse/10 text-pulse"
      : tone === "lab"
      ? "bg-lab/10 text-lab"
      : "bg-dark text-white";

  return (
    <a href={href} className="group rounded-xl border border-line bg-white p-4 transition hover:border-steel/25">
      <div className="mb-4 flex items-center justify-between">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </span>
        <ArrowUpRight className="h-4 w-4 text-muted transition group-hover:text-dark" />
      </div>
      <h3 className="font-semibold text-dark">{title}</h3>
      <p className="mt-1 text-sm text-muted">{text}</p>
    </a>
  );
}

function getWeeklyHighlight(
  rounds: Round[],
  holes: RoundHole[],
  workouts: Workout[],
  weekAgo: Date
) {
  const roundsThisWeek = rounds.filter((round) => new Date(round.created_at) >= weekAgo);
  const workoutsThisWeek = workouts.filter((workout) => new Date(workout.created_at) >= weekAgo);
  const birdie = holes.find(
    (hole) => new Date(hole.created_at) >= weekAgo && hole.score !== null && hole.score < hole.par
  );
  if (birdie) {
    return {
      title: `Birdie on hole ${birdie.hole_number}`,
      detail: "That is the kind of scoring moment worth building around.",
    };
  }

  const pr = findWeeklyTrainingPr(workouts, weekAgo);
  if (pr) return pr;

  const firstRoundThisWeek = roundsThisWeek.length > 0 && rounds.length === roundsThisWeek.length;
  if (firstRoundThisWeek) {
    return {
      title: "First round submitted",
      detail: "You have started the golf data layer. That is the real first milestone.",
    };
  }

  if (roundsThisWeek.length > 0) {
    const distanceRound = roundsThisWeek.find((round) => round.longest_drive || round.average_driving_distance);
    if (distanceRound?.longest_drive) {
      return {
        title: `Longest drive tracked: ${distanceRound.longest_drive} yd`,
        detail: "Distance is now part of the golf data layer.",
      };
    }

    return {
      title: `${roundsThisWeek.length} round${roundsThisWeek.length === 1 ? "" : "s"} logged this week`,
      detail: "Fresh round data gives the dashboard a much better signal.",
    };
  }

  if (workoutsThisWeek.length > 0) {
    return {
      title: `${workoutsThisWeek.length} training session${workoutsThisWeek.length === 1 ? "" : "s"} logged`,
      detail: "Consistency is building the performance side of the platform.",
    };
  }

  return {
    title: "Ready for a new highlight",
    detail: "Log a round or training session this week and AthletiGolf will surface the best moment here.",
  };
}

function findWeeklyTrainingPr(workouts: Workout[], weekAgo: Date) {
  const previousBest = new Map<string, number>();
  const sortedWorkouts = [...workouts].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const workout of sortedWorkouts) {
    const isThisWeek = new Date(workout.created_at) >= weekAgo;
    for (const exercise of workout.exercises || []) {
      const weight = parseWeight(exercise);
      const name = exercise.name?.trim();
      if (!name || weight === null) continue;

      const key = name.toLowerCase();
      const bestBefore = previousBest.get(key);
      if (isThisWeek && bestBefore !== undefined && weight >= bestBefore + 2.5) {
        return {
          title: `${name} PR: ${weight}kg`,
          detail: `Up ${formatWeightDelta(weight - bestBefore)} from your previous best.`,
        };
      }
      if (bestBefore === undefined || weight > bestBefore) {
        previousBest.set(key, weight);
      }
    }
  }

  return null;
}

function parseWeight(exercise: ExerciseLog) {
  if (exercise.weight_value !== null && exercise.weight_value !== undefined) {
    return exercise.weight_value;
  }
  const match = exercise.weight?.match(/[\d.]+/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

function formatWeightDelta(value: number) {
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}kg`;
}

function formatDistance(value: number | null) {
  return value === null ? "-" : `${Math.round(value)} yd`;
}
