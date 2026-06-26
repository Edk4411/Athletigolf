import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { formatAverage, formatPercent, getGolfStats } from "@/lib/golfStats";
import type { Round, Workout } from "@/lib/types";

export default function Dashboard() {
  const { user } = useAuth();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  const firstName =
    user?.user_metadata?.username ||
    user?.email?.split("@")[0] ||
    "Athlete";

  useEffect(() => {
    const load = async () => {
      const [{ data: r }, { data: w }] = await Promise.all([
        supabase.from("rounds").select("*").order("created_at", { ascending: false }),
        supabase.from("workouts").select("*").order("created_at", { ascending: false }),
      ]);
      setRounds((r as Round[]) || []);
      setWorkouts((w as Workout[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const workoutsThisWeek = workouts.filter((w) => {
    const d = new Date(w.created_at);
    return d >= weekAgo;
  }).length;

  const roundsThisMonth = rounds.filter((r) => {
    const d = new Date(r.created_at);
    return d >= monthStart;
  }).length;

  const latestWorkout = workouts[0] ?? null;
  const lastRound = rounds[0] ?? null;
  const golfStats = getGolfStats(rounds);

  const overviewCards = [
    {
      title: "Workouts",
      value: loading ? "..." : workoutsThisWeek.toString(),
      sub: "This week",
      href: "/workouts/submit",
    },
    {
      title: "Rounds",
      value: loading ? "..." : roundsThisMonth.toString(),
      sub: "Played this month",
      href: "/golf",
    },
    {
      title: "Total Rounds",
      value: loading ? "..." : rounds.length.toString(),
      sub: "Logged all-time",
      href: "/golf",
    },
    {
      title: "Total Workouts",
      value: loading ? "..." : workouts.length.toString(),
      sub: "Logged all-time",
      href: "/workouts",
    },
  ];

  return (
    <div className="min-h-screen bg-cream">
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12">
          <div>
            <p className="uppercase tracking-[0.25em] text-xs text-black/50 mb-3">
              Dashboard
            </p>
            <h1 className="text-5xl font-semibold mb-3">
              Welcome Back, {firstName}
            </h1>
            <p className="text-black/60 text-lg">Consistency builds performance.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/workouts/submit"
                className="bg-[#7A1F1F] text-white px-5 py-3 rounded-full hover:scale-105 transition"
              >
                Submit Workout
              </a>
              <a
                href="/golf/submit"
                className="bg-[#1F4D3A] text-white px-5 py-3 rounded-full hover:scale-105 transition"
              >
                Submit Round
              </a>
              <a
                href="/analytics"
                className="bg-[#B08D57] text-white px-5 py-3 rounded-full hover:scale-105 transition"
              >
                Analytics
              </a>
            </div>
          </div>

          <div className="mt-6 md:mt-0 bg-white rounded-3xl px-6 py-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-black/5">
            <p className="text-sm text-black/50 mb-1">Today</p>
            <h3 className="text-2xl font-semibold">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h3>
          </div>
        </div>

        {/* OVERVIEW CARDS */}
        <section className="grid lg:grid-cols-4 gap-6 mb-12">
          {overviewCards.map((card, index) => (
            <a
              key={index}
              href={card.href}
              className="bg-white text-black rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-black/5 block cursor-pointer"
            >
              <p className="text-sm mb-3 text-black/50">{card.title}</p>
              <h3 className="text-4xl font-semibold mb-2">{card.value}</h3>
              <p className="text-black/60">{card.sub}</p>
            </a>
          ))}
        </section>

        {/* MAIN GRID */}
        <section className="grid xl:grid-cols-3 gap-8 mb-12">
          {/* LATEST WORKOUT */}
          <div className="xl:col-span-2 bg-white rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-black/5">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-sm text-black/50 mb-2">Latest Workout</p>
                <h2 className="text-3xl font-semibold">
                  {loading ? "Loading..." : latestWorkout ? latestWorkout.workout_name || "Workout" : "No workouts yet"}
                </h2>
              </div>
              <a
                href="/workouts"
                className="bg-[#7A1F1F] text-white px-5 py-3 rounded-full hover:scale-105 transition"
              >
                View All
              </a>
            </div>

            {loading ? (
              <div className="text-black/40 py-8 text-center">Loading...</div>
            ) : latestWorkout && latestWorkout.exercises && latestWorkout.exercises.length > 0 ? (
              <div className="space-y-6">
                {latestWorkout.exercises.slice(0, 4).map((exercise, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-2">
                      <span className="font-medium">{exercise.name}</span>
                      <span className="text-black/60">
                        {[exercise.weight, exercise.sets && exercise.reps ? `${exercise.sets}x${exercise.reps}` : null]
                          .filter(Boolean)
                          .join(" / ")}
                      </span>
                    </div>
                    <div className="h-3 bg-black/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#7A1F1F] rounded-full"
                        style={{ width: `${Math.max(20, 80 - index * 12)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-cream border border-[#7A1F1F]/10 p-6 text-center">
                <p className="text-black/50 mb-4">No workouts submitted yet.</p>
                <a
                  href="/workouts/submit"
                  className="inline-block bg-[#7A1F1F] text-white px-5 py-2 rounded-full text-sm hover:scale-105 transition"
                >
                  Submit First Workout
                </a>
              </div>
            )}
          </div>

          {/* TODAY FOCUS */}
          <div className="bg-[#1F4D3A] text-white rounded-[2rem] p-8 shadow-sm">
            <p className="uppercase tracking-[0.25em] text-xs text-white/50 mb-5">
              Today&apos;s Focus
            </p>
            <h2 className="text-3xl font-semibold leading-tight mb-6">
              {rounds.length > 0
                ? "Keep Building Consistency"
                : "Start Logging Your Data"}
            </h2>
            <p className="text-white/70 leading-relaxed mb-8">
              {rounds.length > 0
                ? `You've played ${rounds.length} round${rounds.length !== 1 ? "s" : ""} with an average score of ${formatAverage(golfStats.avgScore)}. Keep logging to unlock deeper performance insights.`
                : "Log your first round and workout to start receiving personalised focus recommendations."}
            </p>
            <div className="bg-white/10 rounded-3xl p-5">
              <p className="text-sm text-white/50 mb-2">Suggested Session</p>
              <h3 className="text-xl font-semibold mb-2">45 Minute Practice</h3>
              <p className="text-white/70 text-sm">
                20 min mobility / 15 min range work / 10 min putting
              </p>
            </div>
          </div>
        </section>

        {/* GOLF + NUTRITION */}
        <section className="grid xl:grid-cols-2 gap-8">
          {/* GOLF CARD */}
          <div className="bg-white rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-black/5">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-sm text-black/50 mb-2">Last Round</p>
                <h2 className="text-3xl font-semibold">
                  {loading
                    ? "Loading..."
                    : lastRound
                    ? `${lastRound.score ?? "-"} at ${lastRound.course || "Unknown Course"}`
                    : "No rounds yet"}
                </h2>
              </div>
              {lastRound && (
                <div className="bg-[#1F4D3A] text-white px-5 py-3 rounded-2xl">
                  <p className="text-sm text-white/60">Score</p>
                  <h3 className="text-xl font-semibold">{lastRound.score ?? "-"}</h3>
                </div>
              )}
            </div>

            {loading ? (
              <div className="text-black/40 py-8 text-center">Loading...</div>
            ) : rounds.length > 0 ? (
              <div className="space-y-6">
                {[
                  ["Fairways Hit (avg)", formatPercent(golfStats.avgFairwayPercent)],
                  ["Greens in Regulation (avg)", formatPercent(golfStats.avgGirPercent)],
                  ["Scramble Rate (avg)", formatPercent(golfStats.avgScramblePercent)],
                  ["Putts Per Round", formatAverage(golfStats.avgPutts)],
                  ["Penalty Shots (avg)", formatAverage(golfStats.avgPenaltyShots)],
                  ["Chip Shots (avg)", formatAverage(golfStats.avgChipShots)],
                  ["Bunker Shots (avg)", formatAverage(golfStats.avgGreensideBunkerShots)],
                  ["Total Penalty Shots", golfStats.totalPenaltyShots.toString()],
                ].map(([label, value], index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-2">
                      <span>{label}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                    <div className="h-3 bg-black/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1F4D3A] rounded-full"
                        style={{
                          width: typeof value === "string" && value.includes("%")
                            ? value
                            : "0%",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-cream border border-[#1F4D3A]/10 p-6 text-center">
                <p className="text-black/50 mb-4">No rounds submitted yet.</p>
                <a
                  href="/golf/submit"
                  className="inline-block bg-[#1F4D3A] text-white px-5 py-2 rounded-full text-sm hover:scale-105 transition"
                >
                  Submit First Round
                </a>
              </div>
            )}
          </div>

          {/* ACTIVITY SUMMARY replaces mock nutrition */}
          <div className="bg-white rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-black/5">
            <div className="mb-8">
              <p className="text-sm text-black/50 mb-2">Activity Summary</p>
              <h2 className="text-3xl font-semibold">Your Progress</h2>
            </div>

            {loading ? (
              <div className="text-black/40 py-8 text-center">Loading...</div>
            ) : (
              <div className="space-y-7">
                {[
                  ["Workouts This Week", workoutsThisWeek, 7],
                  ["Rounds This Month", roundsThisMonth, 10],
                  ["Total Workouts", workouts.length, Math.max(workouts.length, 1)],
                  ["Total Rounds", rounds.length, Math.max(rounds.length, 1)],
                ].map(([label, value, max], index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-2">
                      <span>{label as string}</span>
                      <span className="text-black/60">{value as number}</span>
                    </div>
                    <div className="h-3 bg-black/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#B08D57] rounded-full"
                        style={{
                          width: `${Math.min(((value as number) / (max as number)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-10 bg-cream rounded-3xl p-6">
              <p className="text-sm text-black/50 mb-2">Reminder</p>
              <h3 className="text-2xl font-semibold mb-2">Stay Consistent</h3>
              <p className="text-black/60 leading-relaxed">
                Small daily habits create long-term athletic performance.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
