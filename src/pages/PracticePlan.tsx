import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Brain, CalendarDays, NotebookPen, Target } from "lucide-react";
import { Button, EmptyState, PageHeader, Surface } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { getPerformanceInsights, getRecommendedPracticePlan } from "@/lib/insights";
import type { Competition, PracticeSession, Round, RoundHole, Workout } from "@/lib/types";

export default function PracticePlan() {
  const [, navigate] = useLocation();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [holes, setHoles] = useState<RoundHole[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [practices, setPractices] = useState<PracticeSession[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [{ data: r }, { data: h }, { data: w }, { data: p }, { data: c }] = await Promise.all([
      supabase.from("rounds").select("*").order("created_at", { ascending: false }),
      supabase.from("round_holes").select("*").order("created_at", { ascending: false }),
      supabase.from("workouts").select("*").order("created_at", { ascending: false }),
      supabase.from("practice_sessions").select("*").order("created_at", { ascending: false }),
      supabase.from("competitions").select("*").eq("status", "upcoming").order("competition_date", { ascending: true }),
    ]);

    setRounds((r as Round[]) || []);
    setHoles((h as RoundHole[]) || []);
    setWorkouts((w as Workout[]) || []);
    setPractices((p as PracticeSession[]) || []);
    setCompetitions((c as Competition[]) || []);
    setLoading(false);
  }

  const plan = useMemo(() => getRecommendedPracticePlan(rounds, holes), [rounds, holes]);
  const insights = useMemo(
    () => getPerformanceInsights(rounds, holes, workouts, practices),
    [rounds, holes, workouts, practices]
  );
  const nextCompetition = competitions[0] || null;
  const practiceHref = `/golf/practice?type=${encodeURIComponent(plan.practiceType)}&focus=${encodeURIComponent(plan.focusArea)}&drills=${encodeURIComponent(plan.drills.join("|"))}`;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-muted">
        Building practice plan...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-5 text-ink md:px-8 md:py-7">
      <PageHeader
        eyebrow="AthletiAI"
        title="Practice Plan Generator"
        description="A stats-led weekly practice plan based on scoring leaks, short-game conversion, and upcoming competitions."
        tone="text-pulse"
        actions={<Button variant="golf" onClick={() => navigate(practiceHref)}><NotebookPen className="h-4 w-4" />Start Plan</Button>}
      />

      <section className="mb-5 grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <Surface className="bg-dark text-white">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-golf/15 text-golf">
              <Target className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-golf">Recommended Block</p>
              <h2 className="mt-2 text-3xl font-semibold">{plan.title}</h2>
              <p className="mt-3 leading-relaxed text-white/68">{plan.detail}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <DarkTile label="Type" value={plan.practiceType} />
            <DarkTile label="Focus" value={plan.focusArea} />
            <DarkTile label="Drills" value={plan.drills.length} />
          </div>
        </Surface>

        <Surface>
          <div className="mb-5 flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-golf" />
            <h2 className="text-xl font-semibold text-dark">Competition context</h2>
          </div>
          {nextCompetition ? (
            <div className="rounded-xl border border-golf/20 bg-golf/8 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-golf">Next event</p>
              <h3 className="mt-2 text-2xl font-semibold text-dark">{nextCompetition.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {getDaysUntil(nextCompetition.competition_date)}. Keep the week specific: {nextCompetition.focus_area || plan.focusArea}.
              </p>
            </div>
          ) : (
            <EmptyState title="No competition linked" description="Add an upcoming comp and this plan will start biasing the week around it." />
          )}
        </Surface>
      </section>

      <section className="mb-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Surface>
          <div className="mb-5 flex items-center gap-3">
            <Brain className="h-5 w-5 text-pulse" />
            <h2 className="text-xl font-semibold text-dark">AI-style insight cards</h2>
          </div>
          <div className="space-y-3">
            {insights.slice(0, 4).map((insight) => (
              <div key={insight.title} className="rounded-xl border border-line bg-white/70 p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-dark">{insight.title}</h3>
                  <span className="rounded-full bg-pulse/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-pulse">
                    {insight.signal || "early"}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted">{insight.detail}</p>
                {insight.action && <p className="mt-3 text-sm font-semibold text-dark">Next: {insight.action}</p>}
              </div>
            ))}
          </div>
        </Surface>

        <Surface>
          <h2 className="mb-5 text-xl font-semibold text-dark">Suggested weekly structure</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <PlanDay label="Session 1" title={plan.focusArea} detail={`Main block: ${plan.drills[0] || "Scoring reps"}`} />
            <PlanDay label="Session 2" title="Pressure reps" detail={`Repeat: ${plan.drills[1] || plan.drills[0] || "Target practice"}`} />
            <PlanDay label="Session 3" title="On-course transfer" detail={nextCompetition ? "Play decisions like the upcoming comp." : "Take the drill onto the course."} />
          </div>
          <Button variant="golf" onClick={() => navigate(practiceHref)} className="mt-5">
            Load This Into Practice Log
          </Button>
        </Surface>
      </section>
    </main>
  );
}

function DarkTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/8 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-2 font-semibold text-white">{value}</p>
    </div>
  );
}

function PlanDay({ label, title, detail }: { label: string; title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/70 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{label}</p>
      <h3 className="mt-2 font-semibold text-dark">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{detail}</p>
    </div>
  );
}

function getDaysUntil(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 0) return "Date passed";
  if (days === 0) return "Competition day";
  if (days === 1) return "Tomorrow";
  return `${days} days away`;
}
