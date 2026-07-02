import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Brain, CheckCircle2, Dumbbell, Flag, Lightbulb, Target, Zap } from "lucide-react";
import { Button, EmptyState, PageHeader, SectionTitle, Surface } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import {
  getCoachNotes,
  getDataHealthChecklist,
  getPerformanceInsights,
  getRecommendedPracticePlan,
  getRelationshipInsights,
  getTrainingIntelligence,
  type PerformanceInsight,
  type RelationshipInsight,
} from "@/lib/insights";
import { isTrainingOnlyMode } from "@/lib/sportMode";
import type { OnboardingData, PracticeSession, Round, RoundHole, Workout } from "@/lib/types";

export default function AthletiAI() {
  const [, navigate] = useLocation();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [holes, setHoles] = useState<RoundHole[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [practices, setPractices] = useState<PracticeSession[]>([]);
  const [sportMode, setSportMode] = useState<OnboardingData["mainSport"]>("both");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: r }, { data: h }, { data: w }, { data: p }, { data: profile }] = await Promise.all([
        supabase.from("rounds").select("*").order("created_at", { ascending: false }),
        supabase.from("round_holes").select("*").order("created_at", { ascending: false }),
        supabase.from("workouts").select("*").order("created_at", { ascending: false }),
        supabase.from("practice_sessions").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("onboarding_data").maybeSingle(),
      ]);

      setRounds((r as Round[]) || []);
      setHoles((h as RoundHole[]) || []);
      setWorkouts((w as Workout[]) || []);
      setPractices((p as PracticeSession[]) || []);
      const onboarding = (profile?.onboarding_data as OnboardingData | null) || null;
      setSportMode(onboarding?.mainSport || "both");
      setLoading(false);
    }
    load();
  }, []);

  const performanceInsights = useMemo(() => getPerformanceInsights(rounds, holes, workouts, practices), [rounds, holes, workouts, practices]);
  const relationshipInsights = useMemo(() => getRelationshipInsights(rounds, workouts), [rounds, workouts]);
  const coachNotes = useMemo(() => getCoachNotes(rounds, holes, workouts, practices), [rounds, holes, workouts, practices]);
  const practicePlan = useMemo(() => getRecommendedPracticePlan(rounds, holes), [rounds, holes]);
  const trainingIntel = useMemo(() => getTrainingIntelligence(workouts), [workouts]);
  const dataHealth = useMemo(() => getDataHealthChecklist(rounds, workouts, practices), [rounds, workouts, practices]);
  const completeItems = dataHealth.filter((item) => item.complete).length;
  const recommendedPracticeHref = `/golf/practice?type=${encodeURIComponent(practicePlan.practiceType)}&focus=${encodeURIComponent(practicePlan.focusArea)}&drills=${encodeURIComponent(practicePlan.drills.join("|"))}`;
  const trainingOnly = isTrainingOnlyMode(sportMode);
  const visiblePerformanceInsights = trainingOnly
    ? performanceInsights.filter((insight) => insight.tone !== "golf")
    : performanceInsights;
  const visibleDataHealth = trainingOnly
    ? dataHealth.filter((item) => !item.label.toLowerCase().includes("round") && !item.label.toLowerCase().includes("practice"))
    : dataHealth;
  const visibleCompleteItems = visibleDataHealth.filter((item) => item.complete).length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-muted">
        Loading AthletiAI...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-5 text-ink md:px-8 md:py-7">
      <PageHeader
        eyebrow="Insight Engine"
        title="AthletiAI"
        description={
          trainingOnly
            ? "A single review surface for training progression, recovery context, nutrition habits and next actions."
            : "A single review surface for golf trends, training signals, recovery context and next actions."
        }
        tone="text-pulse"
      />

      <section className="mb-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Surface className="bg-dark text-white">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-pulse">Best Move</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                {trainingOnly ? getTrainingOnlyHeadline(trainingIntel, workouts.length) : performanceInsights[0]?.title || "Build the first signal"}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/64">
                {trainingOnly
                  ? trainingIntel.recommendation || "Log a few structured training sessions and wellness entries to unlock useful recommendations."
                  : performanceInsights[0]?.action || "Log one round, one workout and one practice session to unlock useful recommendations."}
              </p>
            </div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-pulse/15 text-pulse">
              <Brain className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <DarkMetric label={trainingOnly ? "Mode" : "Rounds"} value={trainingOnly ? "Training" : rounds.length} />
            <DarkMetric label="Training" value={workouts.length} />
            <DarkMetric label="Data health" value={`${trainingOnly ? visibleCompleteItems : completeItems}/${trainingOnly ? visibleDataHealth.length : dataHealth.length}`} />
          </div>
        </Surface>

        {trainingOnly ? (
          <Surface className="border-lab/20 bg-lab/8">
            <SectionTitle eyebrow="Training Recommendation" title={trainingIntel.topMuscle ? `Balance around ${trainingIntel.topMuscle.muscle}` : "Build the training signal"} action={<Dumbbell className="h-5 w-5 text-lab" />} />
            <p className="text-sm leading-relaxed text-muted">{trainingIntel.recommendation}</p>
            <Button variant="pulse" onClick={() => navigate("/workouts/submit")} className="mt-5">
              Log Training
            </Button>
          </Surface>
        ) : (
        <Surface className="border-golf/20 bg-golf/5">
          <SectionTitle eyebrow="Recommended Practice" title={practicePlan.title} action={<Target className="h-5 w-5 text-golf" />} />
          <p className="text-sm leading-relaxed text-muted">{practicePlan.detail}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {practicePlan.drills.map((drill) => (
              <span key={drill} className="rounded-full bg-golf/10 px-3 py-1 text-xs font-semibold text-golf">
                {drill}
              </span>
            ))}
          </div>
          <Button variant="golf" onClick={() => navigate(recommendedPracticeHref)} className="mt-5">
            Start Practice Plan
          </Button>
        </Surface>
        )}
      </section>

      <section className="mb-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Surface>
          <SectionTitle eyebrow="Signals" title="Priority insights" action={<Lightbulb className="h-5 w-5 text-pulse" />} />
          {visiblePerformanceInsights.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {visiblePerformanceInsights.map((insight) => (
                <InsightCard key={insight.title} insight={insight} />
              ))}
            </div>
          ) : (
            <EmptyState title="No insights yet" description="Log a round or workout and this page will start filling in." />
          )}
        </Surface>

        {!trainingOnly && <Surface className="bg-dark text-white">
          <SectionTitle eyebrow="Golf x Training" title="Relationship watch" action={<Zap className="h-5 w-5 text-pulse" />} />
          <div className="space-y-3">
            {relationshipInsights.map((insight) => (
              <RelationshipCard key={insight.title} insight={insight} />
            ))}
          </div>
        </Surface>}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Surface>
          <SectionTitle eyebrow="Coach Notes" title="This week's read" />
          <div className="grid gap-3">
            {!trainingOnly && <CoachNote icon={Flag} title="Golf" text={coachNotes.golf} tone="golf" />}
            <CoachNote icon={Dumbbell} title="Training" text={coachNotes.training} tone="lab" />
            <CoachNote icon={CheckCircle2} title="Recovery" text={coachNotes.recovery} tone="pulse" />
          </div>
        </Surface>

        <Surface>
          <SectionTitle eyebrow="Data Health" title="Sharper intelligence unlocks" />
          <div className="grid gap-3 md:grid-cols-2">
            {(trainingOnly ? visibleDataHealth : dataHealth).map((item) => (
              <div key={item.label} className="rounded-xl border border-line bg-white/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-dark">{item.label}</h3>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.complete ? "bg-golf/10 text-golf" : "bg-gold/15 text-gold"}`}>
                    {item.current}/{item.target}
                  </span>
                </div>
                <p className="text-sm text-muted">{item.detail}</p>
              </div>
            ))}
          </div>
          {trainingIntel.recommendation && (
            <div className="mt-4 rounded-xl border border-lab/20 bg-lab/8 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Training read</p>
              <p className="mt-2 text-sm leading-relaxed text-dark">{trainingIntel.recommendation}</p>
            </div>
          )}
        </Surface>
      </section>
    </main>
  );
}

function InsightCard({ insight }: { insight: PerformanceInsight }) {
  return (
    <div className={`rounded-xl border p-4 ${getToneClass(insight.tone)}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-semibold leading-snug text-dark">{insight.title}</h3>
        {insight.metric && <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-dark">{insight.metric}</span>}
      </div>
      <p className="text-sm leading-relaxed text-muted">{insight.detail}</p>
      {insight.action && <p className="mt-3 text-sm font-semibold text-dark">Next: {insight.action}</p>}
      {insight.needs && <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Needs {insight.needs}</p>}
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
      {insight.action && <p className="mt-3 text-sm font-semibold text-pulse">Next: {insight.action}</p>}
    </div>
  );
}

function CoachNote({
  icon: Icon,
  title,
  text,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
  tone: "golf" | "lab" | "pulse";
}) {
  return (
    <div className={`rounded-xl border p-4 ${getToneClass(tone)}`}>
      <div className="mb-3 flex items-center gap-3">
        <Icon className="h-5 w-5 text-pulse" />
        <h3 className="font-semibold text-dark">{title}</h3>
      </div>
      <p className="text-sm leading-relaxed text-muted">{text}</p>
    </div>
  );
}

function DarkMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/8 p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-2 font-semibold text-white">{value}</p>
    </div>
  );
}

function getTrainingOnlyHeadline(trainingIntel: ReturnType<typeof getTrainingIntelligence>, workoutCount: number) {
  if (trainingIntel.recentPr) return `${trainingIntel.recentPr.name} PR logged`;
  if (trainingIntel.topMuscle) return `${trainingIntel.topMuscle.muscle} is leading your load`;
  if (workoutCount > 0) return "Keep building the training signal";
  return "Start your athletic performance profile";
}

function getToneClass(tone: "golf" | "lab" | "pulse" | "warning") {
  if (tone === "golf") return "border-golf/20 bg-golf/8";
  if (tone === "lab") return "border-lab/20 bg-lab/8";
  if (tone === "warning") return "border-gold/30 bg-gold/12";
  return "border-pulse/20 bg-pulse/8";
}
