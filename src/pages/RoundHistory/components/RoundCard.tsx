import { Eye, MessageCircle, Play, Edit3, Trash2 } from "lucide-react";
import ScoreBadge from "@/components/ScoreBadge";
import { Button } from "@/components/ui";
import { isCompleteScoringRound } from "@/lib/golfStats";
import type { Round } from "@/lib/types";

interface RoundCardProps {
  round: Round;
  onSelect: () => void;
  onLive: () => void;
  onResume: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function RoundCard({
  round,
  onSelect,
  onLive,
  onResume,
  onEdit,
  onDelete,
}: RoundCardProps) {
  return (
    <article className="border-b border-line p-5 last:border-b-0 hover:bg-steel/5">
      <div className="grid gap-4 lg:grid-cols-[1fr_92px_92px_92px_110px_110px_180px] lg:items-center">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-dark">{round.round_name || round.course || "Unknown Course"}</h2>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${round.is_competition ? "bg-gold/15 text-gold" : "bg-golf/10 text-golf"}`}>
              {round.is_competition ? "Competition" : "General"}
            </span>
            <RoundStatusBadge round={round} />
            {!isCompleteScoringRound(round) && (
              <span className="rounded-full bg-pulse/12 px-2.5 py-1 text-xs font-bold text-pulse">
                Unfinished
              </span>
            )}
          </div>
          <p className="text-sm text-muted">
            {round.course && round.round_name ? `${round.course} / ` : ""}
            {round.date || new Date(round.created_at).toLocaleDateString("en-GB")}
            {round.tee_colour ? ` / ${round.tee_colour} tees` : ""}
            {round.playing_partners ? ` / With ${round.playing_partners}` : ""}
          </p>
        </div>

        <Metric label="Score" value={<ScoreBadge score={round.score} scoreToPar={getRoundScoreToPar(round)} />} />
        <Metric label="FIR" value={`${round.fairways_hit ?? "-"}/${round.fairways_possible ?? "-"}`} />
        <Metric label="GIR" value={`${round.greens_in_regulation ?? "-"}/${round.holes_played ?? 18}`} />
        <Metric label="Scramble" value={round.scramble_percentage === null ? "-" : `${round.scramble_percentage}%`} />
        <Metric label="Pens" value={(round.penalty_shots ?? 0).toString()} danger={(round.penalty_shots ?? 0) > 0} />

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button variant="secondary" onClick={onSelect}><Eye className="h-4 w-4" />Details</Button>
          <Button variant="secondary" onClick={onLive}><MessageCircle className="h-4 w-4" />Live</Button>
          {!isCompleteScoringRound(round) && (
            <Button variant="golf" onClick={onResume}><Play className="h-4 w-4" />Resume</Button>
          )}
          <Button variant="ghost" onClick={onEdit} aria-label="Edit round"><Edit3 className="h-4 w-4" /></Button>
          <Button variant="ghost" onClick={onDelete} aria-label="Delete round" className="text-danger"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value, danger = false }: { label: string; value: React.ReactNode; danger?: boolean }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted lg:hidden">{label}</p>
      <p className={`font-semibold ${danger ? "text-danger" : "text-dark"}`}>{value}</p>
    </div>
  );
}

function RoundStatusBadge({ round }: { round: Round }) {
  if (round.live_status === "live") {
    return <span className="rounded-full bg-golf px-2.5 py-1 text-xs font-bold text-white">Live</span>;
  }
  if (round.live_status === "paused") {
    return <span className="rounded-full bg-gold/15 px-2.5 py-1 text-xs font-bold text-gold">Paused</span>;
  }
  if (round.live_status === "finished") {
    return <span className="rounded-full bg-steel/10 px-2.5 py-1 text-xs font-bold text-muted">Finished</span>;
  }
  return null;
}

function getRoundScoreToPar(round: Round) {
  if (round.score === null || round.score === undefined || !round.par_total) return null;
  return round.score - round.par_total;
}
