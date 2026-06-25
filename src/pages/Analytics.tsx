import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Round, Workout } from "@/lib/types";

export default function Analytics() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
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

    const { data: workoutsData } = await supabase
      .from("workouts")
      .select("*")
      .order("created_at", { ascending: false });
    setWorkouts((workoutsData as Workout[]) || []);
    setLoading(false);
  };

  const roundsWithScores = rounds.filter((r) => r.score !== null);
  const avgScore =
    roundsWithScores.length > 0
      ? (
          roundsWithScores.reduce((sum, r) => sum + (r.score || 0), 0) /
          roundsWithScores.length
        ).toFixed(1)
      : "-";

  const workoutsThisWeek = (() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return workouts.filter((w) => w.created_at && new Date(w.created_at) >= weekAgo).length;
  })();

  const avgFairways =
    rounds.length > 0
      ? Math.round(
          rounds.reduce((sum, r) => sum + (r.fairways_hit || 0), 0) /
            rounds.length
        )
      : 0;

  const avgGir =
    rounds.length > 0
      ? Math.round(
          rounds.reduce((sum, r) => sum + (r.greens_in_regulation || 0), 0) /
            rounds.length
        )
      : 0;

  const avgScramble =
    rounds.length > 0
      ? Math.round(
          rounds.reduce((sum, r) => sum + (r.scramble_percentage || 0), 0) /
            rounds.length
        )
      : 0;

  const avgPutts =
    rounds.length > 0
      ? (
          rounds.reduce((sum, r) => sum + (r.putts || 0), 0) / rounds.length
        ).toFixed(1)
      : "-";

  const avgPenaltyShots =
    rounds.length > 0
      ? (
          rounds.reduce((sum, r) => sum + (r.penalty_shots ?? 0), 0) /
          rounds.length
        ).toFixed(1)
      : "-";

  const avgChipShots =
    rounds.length > 0
      ? (
          rounds.reduce((sum, r) => sum + (r.chip_shots ?? 0), 0) /
          rounds.length
        ).toFixed(1)
      : "-";

  const avgGreensideBunkerShots =
    rounds.length > 0
      ? (
          rounds.reduce((sum, r) => sum + (r.greenside_bunker_shots ?? 0), 0) /
          rounds.length
        ).toFixed(1)
      : "-";

  const totalPenaltyShots = rounds.reduce((sum, r) => sum + (r.penalty_shots ?? 0), 0);

  const recentScores = roundsWithScores
    .slice(0, 5)
    .reverse()
    .map((r) => r.score || 0);

  const topStats = [
    ["Avg Score", avgScore],
    ["Workouts / Week", workoutsThisWeek.toString()],
    ["Rounds Logged", rounds.length.toString()],
    ["Workouts Logged", workouts.length.toString()],
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-black/40 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream p-8 md:p-12">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="mb-12">
          <p className="uppercase tracking-[0.25em] text-xs text-[#D4AF37] mb-4 font-semibold">
            AthletiGolf Analytics
          </p>

          <h1 className="text-5xl  font-semibold mb-4">
            Performance Intelligence
          </h1>

          <p className="text-black/60 text-lg max-w-3xl">
            Connect your golf performance, gym training and long-term progress
            to uncover the habits that lead to lower scores and better athletic performance.
          </p>
        </div>

        {/* TOP STATS */}
        <section className="grid md:grid-cols-4 gap-6 mb-12">
          {topStats.map(([label, value], index) => (
            <div
              key={index}
              className="bg-white rounded-[2rem] p-6 shadow-sm border border-black/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <p className="text-black/50 text-sm mb-3">{label}</p>
              <h2 className="text-4xl font-semibold">{value}</h2>
            </div>
          ))}
        </section>

        {/* ATHLETIGOLF INSIGHTS */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-3 w-3 rounded-full bg-[#D4AF37]" />
            <h2 className="text-3xl font-semibold">
              AthletiGolf Insights
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: rounds.length > 0 ? `${avgScore} Avg Score` : "Start Logging",
                text: rounds.length > 0
                  ? `Your average score across ${rounds.length} logged rounds.`
                  : "Log rounds to start seeing performance insights.",
              },
              {
                title: workouts.length > 0 ? `${workouts.length} Workouts` : "Track Workouts",
                text: workouts.length > 0
                  ? `You've logged ${workouts.length} gym sessions total.`
                  : "Submit workouts to track your gym progression.",
              },
              {
                title: rounds.length > 0 ? "Biggest Opportunity" : "Get Started",
                text: rounds.length > 0
                  ? avgGir < 60
                    ? "Approach play remains the largest contributor to dropped shots."
                    : "Keep maintaining your greens in regulation percentage."
                  : "Log rounds and workouts to unlock personalised insights.",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-[2rem] p-6 shadow-sm border border-[#D4AF37]/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <h3 className="text-2xl font-semibold mb-3 text-[#D4AF37]">
                  {item.title}
                </h3>

                <p className="text-black/60 leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* GOLF ANALYTICS */}
        <section className="bg-white rounded-[2rem] p-8 shadow-sm border border-black/5 mb-10 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <div className="mb-8">
            <p className="text-sm text-black/50 mb-2">
              Golf Analytics
            </p>

            <h2 className="text-3xl font-semibold">
              Score Trend
            </h2>
          </div>

          {recentScores.length > 0 ? (() => {
            const minScore = Math.min(...recentScores);
            const maxScore = Math.max(...recentScores);
            const range = maxScore - minScore || 1;
            return (
              <div className="grid gap-4 items-end h-56" style={{ gridTemplateColumns: `repeat(${recentScores.length}, 1fr)` }}>
                {recentScores.map((score, index) => (
                  <div key={index} className="flex flex-col items-center gap-3 h-full justify-end">
                    <p className="font-semibold text-sm">{score}</p>
                    <div
                      className="w-full rounded-t-2xl bg-[#1F4D3A] min-h-[24px]"
                      style={{ height: `${((maxScore - score) / range) * 160 + 24}px` }}
                    />
                  </div>
                ))}
              </div>
            );
          })() : (
            <div className="h-56 flex items-center justify-center text-black/40">
              No rounds logged yet
            </div>
          )}
        </section>

        {/* GOLF + GYM */}
        <section className="grid lg:grid-cols-2 gap-8 mb-10">

          {/* GOLF */}
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-black/5">
            <h2 className="text-3xl font-semibold mb-8">
              Golf Performance
            </h2>

            <div className="space-y-8">
              {[
                ["Fairways Hit (avg)", `${avgFairways}`],
                ["Greens in Regulation (avg)", `${avgGir}`],
                ["Scrambling (avg)", `${avgScramble}%`],
                ["Putting (avg)", avgPutts],
                ["Penalty Shots (avg)", avgPenaltyShots],
                ["Chip Shots (avg)", avgChipShots],
                ["Bunker Shots (avg)", avgGreensideBunkerShots],
                ["Total Penalty Shots", `${totalPenaltyShots}`],
              ].map(([label, value], index) => (
                <div key={index}>
                  <div className="flex justify-between mb-3">
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>

                  <div className="h-4 bg-black/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1F4D3A] rounded-full"
                      style={{
                        width: rounds.length === 0
                          ? "0%"
                          : value.includes("%")
                          ? value
                          : `${Math.min(Number(value) * 5, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* GYM */}
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-black/5">
            <h2 className="text-3xl font-semibold mb-8">
              Gym Performance
            </h2>

            <div className="space-y-8">
              {[
                ["Total Workouts", `${workouts.length}`],
                ["This Week", `${workoutsThisWeek}`],
                ["Total Exercises", `${workouts.reduce((s, w) => s + (w.exercises?.length || 0), 0)}`],
                ["Consistency", rounds.length > 0 && workouts.length > 0 ? "Active" : "-"],
              ].map(([label, value], index) => (
                <div key={index}>
                  <div className="flex justify-between mb-3">
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>

                  <div className="h-4 bg-black/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#7A1F1F] rounded-full"
                      style={{
                        width: typeof value === "string" && /^\d+$/.test(value)
                          ? `${Math.min(Number(value) * 10, 100)}%`
                          : "0%",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </section>

        {/* INSIGHT ENGINE */}
        <section className="bg-slate-950 text-white rounded-[2rem] p-8 shadow-2xl border border-[#D4AF37]/20">
          <p className="uppercase tracking-[0.25em] text-xs text-[#D4AF37] mb-4">
            AthletiGolf Insight Engine
          </p>

          <h2 className="text-4xl font-semibold mb-6">
            Recommended Focus
          </h2>

          <p className="text-white/70 text-lg leading-relaxed mb-8">
            {rounds.length === 0 && workouts.length === 0
              ? "Start logging rounds and workouts to receive personalised training and practice recommendations."
              : rounds.length > 0 && workouts.length > 0
              ? `Your strongest scoring periods occur when you maintain consistent gym sessions. You've logged ${workouts.length} workouts and ${rounds.length} rounds. Keep building lower-body strength and focus practice time on approach shots.`
              : rounds.length > 0
              ? `You've logged ${rounds.length} rounds with an average score of ${avgScore}. Start logging workouts to see how gym training affects your golf performance.`
              : `You've logged ${workouts.length} workouts. Start logging rounds to connect your gym training to your golf performance.`}
          </p>

          <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
            <h3 className="text-2xl font-semibold mb-3 text-[#D4AF37]">
              Next Target
            </h3>

            <p className="text-white/70">
              {rounds.length > 0
                ? `Improve your average score below ${Math.max(Number(avgScore) - 2, 70)} by maintaining workout consistency and focusing on approach play.`
                : "Log your first round to start tracking your progress toward lower scores."}
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}
