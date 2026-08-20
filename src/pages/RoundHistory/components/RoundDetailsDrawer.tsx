import { Edit3, Trash2, X } from "lucide-react";
import ScoreBadge from "@/components/ScoreBadge";
import { Button } from "@/components/ui";
import type { Round, RoundHole } from "@/lib/types";

interface RoundDetailsDrawerProps {
  round: Round;
  holes: RoundHole[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function RoundDetailsDrawer({
  round,
  holes,
  onClose,
  onEdit,
  onDelete,
}: RoundDetailsDrawerProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button onClick={onClose} className="absolute inset-0 bg-black/50" aria-label="Close round details" />
      <aside className="relative z-10 h-full w-full max-w-4xl overflow-y-auto border-l border-line bg-panel p-6 shadow-2xl">
        <DrawerHeader eyebrow="Round Details" title={round.round_name || round.course || "Unknown Course"} onClose={onClose} />

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailTile label="Score" value={<ScoreBadge score={round.score} scoreToPar={getRoundScoreToPar(round)} size="lg" />} />
          <DetailTile label="Holes" value={(round.holes_played ?? 18).toString()} />
          <DetailTile label="FIR" value={`${round.fairways_hit ?? "-"}/${round.fairways_possible ?? "-"}`} />
          <DetailTile label="GIR" value={`${round.greens_in_regulation ?? "-"}/${round.holes_played ?? 18}`} />
          <DetailTile label="Scramble" value={round.scramble_percentage === null ? "-" : `${round.scramble_percentage}%`} />
          <DetailTile label="Avg Drive" value={round.average_driving_distance ? `${round.average_driving_distance} yd` : "-"} />
          <DetailTile label="Longest" value={round.longest_drive ? `${round.longest_drive} yd` : "-"} />
          <DetailTile label="Putts" value={round.putts?.toString() || "-"} />
          <DetailTile label="Penalties" value={(round.penalty_shots ?? 0).toString()} danger={(round.penalty_shots ?? 0) > 0} />
        </div>

        {(round.course || round.playing_partners) && (
          <div className="mb-5 rounded-xl border border-line bg-steel/5 p-4">
            {round.course && <p className="text-sm text-muted"><span className="font-semibold text-dark">Course:</span> {round.course}</p>}
            {round.playing_partners && <p className="mt-1 text-sm text-muted"><span className="font-semibold text-dark">Played with:</span> {round.playing_partners}</p>}
          </div>
        )}

        {holes.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-steel/5 text-muted">
                <tr>
                  {["Hole", "Par", "Score", "Fairway", "Tee lie", "GIR", "Putts", "Pen", "Chips", "Bunkers", "Recovery"].map((heading) => (
                    <th key={heading} className="p-3 text-xs font-bold uppercase tracking-[0.14em]">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holes.map((hole) => (
                  <tr key={hole.id} className="border-t border-line">
                    <td className="p-3 font-semibold">{hole.hole_number}</td>
                    <td className="p-3">{hole.par}</td>
                    <td className="p-3"><ScoreBadge score={hole.score} par={hole.par} size="sm" /></td>
                    <td className="p-3 capitalize">{formatCell(hole.fairway_result || "na")}</td>
                    <td className="p-3 capitalize">{formatCell(hole.tee_shot_location || "-")}</td>
                    <td className="p-3">{hole.gir ? "Yes" : "No"}</td>
                    <td className="p-3">{hole.putts ?? 0}</td>
                    <td className="p-3">{hole.penalty_shots ?? 0}</td>
                    <td className="p-3">{hole.chip_shots ?? 0}</td>
                    <td className="p-3">{hole.greenside_bunker_shots ?? 0}</td>
                    <td className="p-3 capitalize">{formatCell(hole.recovery_shot_type || "-")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {round.notes && (
          <div className="mt-5 rounded-xl border border-line bg-steel/5 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">Notes</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{round.notes}</p>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button variant="danger" onClick={onDelete}><Trash2 className="h-4 w-4" />Delete</Button>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button variant="golf" onClick={onEdit}><Edit3 className="h-4 w-4" />Edit Round</Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export function DrawerHeader({ eyebrow, title, onClose }: { eyebrow: string; title: string; onClose: () => void }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 border-b border-line pb-5">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-golf">{eyebrow}</p>
        <h2 className="text-3xl font-semibold tracking-tight text-dark">{title}</h2>
      </div>
      <button onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-steel/10 hover:text-dark" aria-label={`Close ${eyebrow}`}>
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

export function DetailTile({ label, value, danger = false }: { label: string; value: React.ReactNode; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-steel/5 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${danger ? "text-danger" : "text-dark"}`}>{value}</p>
    </div>
  );
}

export function formatCell(value: string) {
  if (value === "na") return "N/A";
  if (value === "none") return "None";
  return value.replaceAll("_", " ");
}

function getRoundScoreToPar(round: Round) {
  if (round.score === null || round.score === undefined || !round.par_total) return null;
  return round.score - round.par_total;
}
