// Post-round match play analysis. Reads a stored `match_result` snapshot from
// the round row, or falls back to computing from round_player_holes if
// per-hole net scores are available.
// The active-round scorecard is intentionally kept clean of these figures.

import { useEffect, useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { StatusPill, Surface } from "@/components/ui";
import { matchHoleResult, matchStatusLabel } from "@/lib/handicap";
import { supabase } from "@/lib/supabase";

type Props = {
  roundId: string;
  sides?: Array<{ id: string; name: string | null; team_colour?: "blue" | "red" | null }>;
};

type PlayerHoleRow = {
  hole_number: number;
  side_id: string | null;
  net_score: number | null;
};

type StoredMatchResult = {
  sides?: Array<{ id: string; name: string; team_colour?: "blue" | "red" | null; won: number; lost: number; halved: number }>;
  result_label?: string;
  finish_hole?: number | null;
};

export default function PostRoundMatchAnalysis({ roundId, sides }: Props) {
  const [holes, setHoles] = useState<PlayerHoleRow[]>([]);
  const [stored, setStored] = useState<StoredMatchResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roundId) return;
    Promise.all([
      supabase.from("round_player_holes").select("hole_number, side_id, net_score").eq("round_id", roundId),
      supabase.from("rounds").select("match_result").eq("id", roundId).maybeSingle(),
    ]).then(([holesRes, roundRes]) => {
      setHoles((holesRes.data as PlayerHoleRow[]) || []);
      setStored((roundRes.data as { match_result?: StoredMatchResult } | null)?.match_result || null);
      setLoading(false);
    });
  }, [roundId]);

  const summary = useMemo(() => {
    if (stored?.sides?.length) return stored;
    if (!sides || sides.length < 2) return null;
    // Compute per-hole result relative to first side.
    const [refSide, oppSide] = sides;
    const byHole = new Map<number, { ref: number | null; opp: number | null }>();
    holes.forEach((h) => {
      const entry = byHole.get(h.hole_number) || { ref: null, opp: null };
      if (h.side_id === refSide.id) entry.ref = h.net_score ?? null;
      if (h.side_id === oppSide.id) entry.opp = h.net_score ?? null;
      byHole.set(h.hole_number, entry);
    });
    const perHole = Array.from(byHole.entries()).sort((a, b) => a[0] - b[0]);
    const results = perHole.map(([, v]) => matchHoleResult(v.ref, v.opp)).filter((v): v is -1 | 0 | 1 => v !== null);
    const holesRemaining = Math.max(0, 18 - results.length);
    const status = matchStatusLabel(results, holesRemaining);
    const won = results.filter((r) => r === 1).length;
    const lost = results.filter((r) => r === -1).length;
    const halved = results.filter((r) => r === 0).length;
    return {
      sides: [
        { id: refSide.id, name: refSide.name || "Blue", team_colour: refSide.team_colour || "blue" as const, won, lost, halved },
        { id: oppSide.id, name: oppSide.name || "Red",  team_colour: oppSide.team_colour || "red" as const,  won: lost, lost: won, halved },
      ],
      result_label: status.label,
      finish_hole: status.closeout ? results.length : null,
    };
  }, [holes, sides, stored]);

  if (loading) return <Surface><p className="text-sm text-muted">Loading match analysis...</p></Surface>;
  if (!summary || !summary.sides?.length) return null;

  return (
    <Surface data-testid="post-round-match-analysis">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-golf" />
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-golf">Match analysis</p>
      </div>
      <div className="mb-4 flex items-center gap-2">
        <StatusPill tone="golf">{summary.result_label || "Complete"}</StatusPill>
        {summary.finish_hole && <span className="text-xs text-muted">Closed on hole {summary.finish_hole}</span>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {summary.sides.map((s) => (
          <div
            key={s.id}
            data-testid={`match-side-${s.team_colour || s.id}`}
            className={`rounded-2xl border p-4 ${s.team_colour === "red" ? "border-red-300 bg-red-50" : "border-blue-300 bg-blue-50"}`}
          >
            <p className="text-sm font-semibold text-dark">{s.name}</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xl font-bold text-dark">{s.won}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Won</p>
              </div>
              <div>
                <p className="text-xl font-bold text-dark">{s.lost}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Lost</p>
              </div>
              <div>
                <p className="text-xl font-bold text-dark">{s.halved}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Halved</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}
