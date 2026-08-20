import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Flag } from "lucide-react";
import { Button, ConfirmDialog, EmptyState, PageHeader, StatCard, Surface } from "@/components/ui";
import { formatAverage, getGolfStats, isCompleteScoringRound } from "@/lib/golfStats";
import { supabase } from "@/lib/supabase";
import type { Round, RoundHole } from "@/lib/types";

import RoundCard from "./components/RoundCard";
import RoundDetailsDrawer from "./components/RoundDetailsDrawer";
import RoundEditDrawer from "./components/RoundEditDrawer";

export default function RoundHistory() {
  const [, navigate] = useLocation();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundHoles, setRoundHoles] = useState<Record<string, RoundHole[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [pendingDeleteRound, setPendingDeleteRound] = useState<Round | null>(null);
  const [roundError, setRoundError] = useState("");

  useEffect(() => {
    loadRounds();
  }, []);

  const loadRounds = async () => {
    setLoading(true);
    const { data } = await supabase.from("rounds").select("*").order("created_at", { ascending: false });
    const loadedRounds = (data as Round[]) || [];
    setRounds(loadedRounds);

    if (loadedRounds.length > 0) {
      const { data: holesData } = await supabase
        .from("round_holes")
        .select("*")
        .in("round_id", loadedRounds.map((round) => round.id))
        .order("hole_number", { ascending: true });

      const grouped = ((holesData as RoundHole[]) || []).reduce<Record<string, RoundHole[]>>((acc, hole) => {
        acc[hole.round_id] = [...(acc[hole.round_id] || []), hole];
        return acc;
      }, {});
      setRoundHoles(grouped);
    } else {
      setRoundHoles({});
    }

    setLoading(false);
  };

  const deleteRound = async () => {
    if (!pendingDeleteRound) return;

    setRoundError("");
    const { error } = await supabase.from("rounds").delete().eq("id", pendingDeleteRound.id);

    if (error) {
      setRoundError(error.message);
      return;
    }

    setSelectedRound(null);
    setEditingRound(null);
    setPendingDeleteRound(null);
    setRounds((prev) => prev.filter((item) => item.id !== pendingDeleteRound.id));
  };

  const golfStats = getGolfStats(rounds);
  const completedRounds = rounds.filter(isCompleteScoringRound);
  const unfinishedRounds = rounds.filter((round) => !isCompleteScoringRound(round));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-lg text-muted">Loading round history...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-5 text-ink md:px-8 md:py-7">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Golf"
          title="Round History"
          description="Review finished scorecards, resume live rounds, and keep your golf record clean."
          tone="text-golf"
          actions={<Button variant="golf" onClick={() => navigate("/golf/submit")}><Flag className="h-4 w-4" />Start Round</Button>}
        />

        <section className="mb-5 grid gap-4 grid-cols-2 md:grid-cols-4">
          <StatCard label="Completed Rounds" value={completedRounds.length} sub={unfinishedRounds.length ? `${unfinishedRounds.length} unfinished` : "all scoring rounds"} />
          <StatCard label="Average Score" value={formatAverage(golfStats.avgScore)} sub="18-hole equivalent" />
          <StatCard label="Best Round" value={golfStats.bestScore === null ? "-" : golfStats.bestScore} sub="9s doubled, partials ignored" />
          <StatCard label="Avg Drive" value={golfStats.avgDrivingDistance === null ? "-" : `${Math.round(golfStats.avgDrivingDistance)} yd`} />
        </section>

        {roundError && (
          <div className="mb-5 rounded-xl border border-danger/25 bg-danger/10 p-4 text-sm font-semibold text-danger">
            {roundError}
          </div>
        )}

        {rounds.length === 0 ? (
          <EmptyState
            title="No rounds yet"
            description="Start your first live round to begin building your golf logbook."
            action={<Button variant="golf" onClick={() => navigate("/golf/submit")}>Start Round</Button>}
          />
        ) : (
          <Surface className="overflow-hidden p-0">
            <div className="hidden grid-cols-[1fr_92px_92px_92px_110px_110px_180px] gap-4 border-b border-line bg-steel/5 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-muted lg:grid">
              <span>Round</span>
              <span>Score</span>
              <span>FIR</span>
              <span>GIR</span>
              <span>Scramble</span>
              <span>Penalties</span>
              <span />
            </div>

            {rounds.map((round) => (
              <RoundCard 
                key={round.id}
                round={round}
                onSelect={() => setSelectedRound(round)}
                onLive={() => navigate(`/golf/rounds/${round.id}`)}
                onResume={() => navigate(`/golf/submit?resume=${round.id}`)}
                onEdit={() => setEditingRound(round)}
                onDelete={() => setPendingDeleteRound(round)}
              />
            ))}
          </Surface>
        )}
      </div>

      {selectedRound && (
        <RoundDetailsDrawer
          round={selectedRound}
          holes={roundHoles[selectedRound.id] || []}
          onClose={() => setSelectedRound(null)}
          onEdit={() => setEditingRound(selectedRound)}
          onDelete={() => setPendingDeleteRound(selectedRound)}
        />
      )}

      {editingRound && (
        <RoundEditDrawer
          round={editingRound}
          initialHoles={roundHoles[editingRound.id] || []}
          onClose={() => setEditingRound(null)}
          onSaveSuccess={loadRounds}
          onDelete={() => setPendingDeleteRound(editingRound)}
        />
      )}
      <ConfirmDialog
        open={!!pendingDeleteRound}
        title="Delete round?"
        description={`This will permanently delete ${pendingDeleteRound?.course || "this round"} and its hole-by-hole stats. This cannot be undone.`}
        confirmLabel="Delete Round"
        onConfirm={deleteRound}
        onCancel={() => setPendingDeleteRound(null)}
      />
    </main>
  );
}
