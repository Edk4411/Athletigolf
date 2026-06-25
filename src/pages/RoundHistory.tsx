import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Round } from "@/lib/types";

export default function RoundHistory() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRounds();
  }, []);

  const loadRounds = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("rounds")
      .select("*")
      .order("created_at", { ascending: false });
    setRounds((data as Round[]) || []);
    setLoading(false);
  };

  const roundsLogged = rounds.length;
  const avgScore =
    rounds.length > 0
      ? (rounds.reduce((sum, r) => sum + (r.score || 0), 0) / rounds.length).toFixed(1)
      : "-";
  const bestRound =
    rounds.length > 0
      ? Math.min(...rounds.map((r) => r.score || 999))
      : "-";

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
        <div className="mb-12">
          <p className="uppercase tracking-[0.25em] text-xs text-[#1F4D3A]/70 mb-4">
            Golf
          </p>

          <h1 className="text-5xl font-semibold mb-4">Round History</h1>

          <p className="text-black/60 text-lg">
            Review previous rounds and track performance trends over time.
          </p>

          <section className="grid md:grid-cols-4 gap-6 mb-12 mt-10">
            {[
              ["Rounds Logged", roundsLogged.toString()],
              ["Average Score", avgScore],
              ["Best Round", bestRound === 999 ? "-" : bestRound.toString()],
              ["Handicap", "-"],
            ].map(([label, value], index) => (
              <div
                key={index}
                className="bg-[#1F4D3A] text-white rounded-[2rem] p-6 shadow-sm border border-black/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <p className="text-sm mb-3 text-white/60">{label}</p>
                <h2 className="text-4xl font-semibold">{value}</h2>
              </div>
            ))}
          </section>
        </div>

        {rounds.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-10 text-center shadow-sm border border-black/5">
            <h2 className="text-3xl font-semibold mb-3">No rounds yet</h2>
            <p className="text-black/60 mb-6">
              Submit your first round to start building your round history.
            </p>
            <a
              href="/golf/submit"
              className="inline-block bg-[#1F4D3A] text-white px-6 py-3 rounded-full font-medium hover:bg-[#17392b] transition"
            >
              Submit Round
            </a>
          </div>
        ) : (
          <div className="grid gap-6">
            {rounds.map((round, index) => (
              <div
                key={round.id || index}
                className="bg-white rounded-[2rem] p-8 shadow-sm border border-black/5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                  <div className="flex items-center justify-center">
                    <button className="bg-[#1F4D3A] text-white px-3 py-8 rounded-2xl hover:opacity-90 transition font-medium">
                      <span
                        style={{
                          writingMode: "vertical-rl",
                          textOrientation: "mixed",
                        }}
                      >
                        DETAILS
                      </span>
                    </button>
                  </div>

                  <div className="flex-1">
                    <p className="text-sm text-black/50 mb-2">
                      {round.date || "-"}
                    </p>

                    <h2 className="text-3xl font-semibold mb-3">
                      {round.course || "Unknown Course"}
                    </h2>

                    <div
                      className={`inline-block px-4 py-2 rounded-full text-white text-sm ${
                        round.is_competition ? "bg-orange-400" : "bg-blue-400"
                      }`}
                    >
                      {round.is_competition ? "Competition Round" : "General Play"}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                      ["Score", round.score?.toString() || "-"],
                      ["GIR", round.greens_in_regulation?.toString() || "-"],
                      ["FIR", round.fairways_hit?.toString() || "-"],
                      ["Putts", round.putts?.toString() || "-"],
                      ["Penalties", (round.penalty_shots ?? 0).toString()],
                      ["Chip Shots", (round.chip_shots ?? 0).toString()],
                      ["Bunkers", (round.greenside_bunker_shots ?? 0).toString()],
                    ].map(([label, value], i) => (
                      <div
                        key={i}
                        className="bg-cream rounded-2xl px-6 py-5 min-w-[120px] border border-[#1F4D3A]/10"
                      >
                        <p className="text-sm text-[#1F4D3A]/70 mb-2">{label}</p>
                        <h3 className="text-2xl font-semibold">{value}</h3>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
