import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Edit3, Eye, Flag, MessageCircle, Play, Trash2, X } from "lucide-react";
import { Button, ConfirmDialog, EmptyState, FieldLabel, PageHeader, StatCard, Surface, TextArea, TextInput } from "@/components/ui";
import { formatAverage, getGolfStats, isCompleteScoringRound } from "@/lib/golfStats";
import { supabase } from "@/lib/supabase";
import type { FairwayResult, Round, RoundHole, TeeShotLocation } from "@/lib/types";

type RoundForm = {
  round_name: string;
  course: string;
  date: string;
  score: string;
  fairways_hit: string;
  fairways_possible: string;
  greens_in_regulation: string;
  putts: string;
  holes_played: string;
  tee_colour: string;
  average_driving_distance: string;
  longest_drive: string;
  tee_shot_quality: string;
  penalty_shots: string;
  chip_shots: string;
  greenside_bunker_shots: string;
  is_competition: boolean;
  playing_partners: string;
  notes: string;
};

type HoleForm = {
  id?: string;
  hole_number: number;
  par: string;
  score: string;
  fairway_result: FairwayResult;
  tee_shot_location: "" | TeeShotLocation;
  gir: boolean;
  putts: string;
  penalty_shots: string;
  chip_shots: string;
  greenside_bunker_shots: string;
  recovery_shot_type: "" | "chip" | "sand";
};

const emptyForm: RoundForm = {
  round_name: "",
  course: "",
  date: "",
  score: "",
  fairways_hit: "",
  fairways_possible: "",
  greens_in_regulation: "",
  putts: "",
  holes_played: "18",
  tee_colour: "",
  average_driving_distance: "",
  longest_drive: "",
  tee_shot_quality: "",
  penalty_shots: "",
  chip_shots: "",
  greenside_bunker_shots: "",
  is_competition: false,
  playing_partners: "",
  notes: "",
};

const fairwayOptions: FairwayResult[] = ["na", "hit", "left", "right", "miss"];
const teeLocationOptions: Array<"" | TeeShotLocation> = ["", "rough", "fairway_bunker", "woods", "water", "out_of_bounds", "other_fairway", "other"];

export default function RoundHistory() {
  const [, navigate] = useLocation();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundHoles, setRoundHoles] = useState<Record<string, RoundHole[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [pendingDeleteRound, setPendingDeleteRound] = useState<Round | null>(null);
  const [saving, setSaving] = useState(false);
  const [roundError, setRoundError] = useState("");
  const [editForm, setEditForm] = useState<RoundForm>(emptyForm);
  const [editHoles, setEditHoles] = useState<HoleForm[]>([]);
  const [selectedHoleIndex, setSelectedHoleIndex] = useState(0);

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

  const openEdit = (round: Round) => {
    setRoundError("");
    setSelectedRound(null);
    setEditingRound(round);
    setSelectedHoleIndex(0);
    setEditForm(toRoundForm(round));
    setEditHoles(toHoleForms(round, roundHoles[round.id] || []));
  };

  const updateHole = <K extends keyof HoleForm>(index: number, key: K, value: HoleForm[K]) => {
    setEditHoles((prev) =>
      prev.map((hole, holeIndex) => {
        if (holeIndex !== index) return hole;
        const next = { ...hole, [key]: value };
        if (key === "par" && value === "3") {
          next.fairway_result = "na";
          next.tee_shot_location = "";
        }
        if (key === "fairway_result" && (value === "hit" || value === "na")) {
          next.tee_shot_location = "";
        }
        return next;
      })
    );
  };

  const parseNumber = (value: string) => (value === "" ? null : Number(value));

  const saveRound = async () => {
    if (!editingRound) return;
    setSaving(true);
    setRoundError("");

    const holeStats = calculateHoleStats(editHoles);
    const hasHoleScores = holeStats.holesCompleted > 0;
    const targetHoles = editingRound.target_holes || editHoles.length || Number(editForm.holes_played || 18);
    const nextStatus = hasHoleScores && holeStats.holesCompleted === targetHoles ? "completed" : "unfinished";

    const { error } = await supabase
      .from("rounds")
      .update({
        status: nextStatus,
        target_holes: targetHoles,
        completed_at: nextStatus === "completed" ? editingRound.completed_at || new Date().toISOString() : null,
        round_name: editForm.round_name || null,
        course: editForm.course || null,
        date: editForm.date || null,
        score: hasHoleScores ? holeStats.totalScore : parseNumber(editForm.score),
        fairways_hit: hasHoleScores ? holeStats.fairwaysHit : parseNumber(editForm.fairways_hit),
        fairways_possible: hasHoleScores ? holeStats.fairwaysPossible : parseNumber(editForm.fairways_possible),
        greens_in_regulation: hasHoleScores ? holeStats.girs : parseNumber(editForm.greens_in_regulation),
        putts: hasHoleScores ? holeStats.putts : parseNumber(editForm.putts),
        holes_played: hasHoleScores ? holeStats.holesCompleted : parseNumber(editForm.holes_played),
        tee_colour: editForm.tee_colour || null,
        average_driving_distance: parseNumber(editForm.average_driving_distance),
        longest_drive: parseNumber(editForm.longest_drive),
        tee_shot_quality: editForm.tee_shot_quality || null,
        penalty_shots: hasHoleScores ? holeStats.penalties : parseNumber(editForm.penalty_shots),
        chip_shots: hasHoleScores ? holeStats.chips : parseNumber(editForm.chip_shots),
        greenside_bunker_shots: hasHoleScores ? holeStats.bunkers : parseNumber(editForm.greenside_bunker_shots),
        scramble_percentage: hasHoleScores ? holeStats.scramblePercent : editingRound.scramble_percentage,
        is_competition: editForm.is_competition,
        playing_partners: editForm.playing_partners || null,
        notes: editForm.notes || null,
      })
      .eq("id", editingRound.id);

    if (error) {
      setSaving(false);
      setRoundError(error.message);
      return;
    }

    for (const hole of editHoles) {
      const payload = {
        round_id: editingRound.id,
        user_id: editingRound.user_id,
        hole_number: hole.hole_number,
        par: Number(hole.par || 4),
        score: parseNumber(hole.score),
        fairway_result: hole.par === "3" ? "na" : hole.fairway_result,
        tee_shot_location: hole.par === "3" || hole.fairway_result === "hit" || hole.fairway_result === "na" ? null : hole.tee_shot_location || null,
        gir: hole.gir,
        putts: parseNumber(hole.putts) ?? 0,
        penalty_shots: parseNumber(hole.penalty_shots) ?? 0,
        chip_shots: parseNumber(hole.chip_shots) ?? 0,
        greenside_bunker_shots: parseNumber(hole.greenside_bunker_shots) ?? 0,
        recovery_shot_type: hole.recovery_shot_type || null,
      };

      const result = hole.id
        ? await supabase.from("round_holes").update(payload).eq("id", hole.id)
        : hasAnyHoleData(hole)
          ? await supabase.from("round_holes").insert(payload)
          : { error: null };

      if (result.error) {
        setSaving(false);
        setRoundError(result.error.message);
        return;
      }
    }

    setSaving(false);
    setEditingRound(null);
    await loadRounds();
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

        <section className="mb-5 grid gap-4 md:grid-cols-4">
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
              <article key={round.id} className="border-b border-line p-5 last:border-b-0 hover:bg-steel/5">
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

                  <Metric label="Score" value={round.score?.toString() || "-"} />
                  <Metric label="FIR" value={`${round.fairways_hit ?? "-"}/${round.fairways_possible ?? "-"}`} />
                  <Metric label="GIR" value={`${round.greens_in_regulation ?? "-"}/${round.holes_played ?? 18}`} />
                  <Metric label="Scramble" value={round.scramble_percentage === null ? "-" : `${round.scramble_percentage}%`} />
                  <Metric label="Pens" value={(round.penalty_shots ?? 0).toString()} danger={(round.penalty_shots ?? 0) > 0} />

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button variant="secondary" onClick={() => setSelectedRound(round)}><Eye className="h-4 w-4" />Details</Button>
                    <Button variant="secondary" onClick={() => navigate(`/golf/rounds/${round.id}`)}><MessageCircle className="h-4 w-4" />Live</Button>
                    {!isCompleteScoringRound(round) && (
                      <Button variant="golf" onClick={() => navigate(`/golf/submit?resume=${round.id}`)}><Play className="h-4 w-4" />Resume</Button>
                    )}
                    <Button variant="ghost" onClick={() => openEdit(round)} aria-label="Edit round"><Edit3 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </article>
            ))}
          </Surface>
        )}
      </div>

      {selectedRound && (
        <RoundDetailsDrawer
          round={selectedRound}
          holes={roundHoles[selectedRound.id] || []}
          onClose={() => setSelectedRound(null)}
          onEdit={() => openEdit(selectedRound)}
          onDelete={() => setPendingDeleteRound(selectedRound)}
        />
      )}

      {editingRound && (
        <RoundEditDrawer
          form={editForm}
          holes={editHoles}
          selectedHoleIndex={selectedHoleIndex}
          saving={saving}
          title={editingRound.round_name || editingRound.course || "Golf Round"}
          setForm={setEditForm}
          setSelectedHoleIndex={setSelectedHoleIndex}
          updateHole={updateHole}
          onClose={() => setEditingRound(null)}
          onSave={saveRound}
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

function Metric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
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

function RoundDetailsDrawer({
  round,
  holes,
  onClose,
  onEdit,
  onDelete,
}: {
  round: Round;
  holes: RoundHole[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button onClick={onClose} className="absolute inset-0 bg-black/50" aria-label="Close round details" />
      <aside className="relative z-10 h-full w-full max-w-4xl overflow-y-auto border-l border-line bg-panel p-6 shadow-2xl">
        <DrawerHeader eyebrow="Round Details" title={round.round_name || round.course || "Unknown Course"} onClose={onClose} />

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailTile label="Score" value={round.score?.toString() || "-"} />
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
                    <td className="p-3">{hole.score ?? "-"}</td>
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

function RoundEditDrawer({
  form,
  holes,
  selectedHoleIndex,
  title,
  saving,
  setForm,
  setSelectedHoleIndex,
  updateHole,
  onClose,
  onSave,
  onDelete,
}: {
  form: RoundForm;
  holes: HoleForm[];
  selectedHoleIndex: number;
  title: string;
  saving: boolean;
  setForm: React.Dispatch<React.SetStateAction<RoundForm>>;
  setSelectedHoleIndex: (index: number) => void;
  updateHole: <K extends keyof HoleForm>(index: number, key: K, value: HoleForm[K]) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const selectedHole = holes[selectedHoleIndex];
  const stats = useMemo(() => calculateHoleStats(holes), [holes]);
  const setField = <K extends keyof RoundForm>(key: K, value: RoundForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button onClick={onClose} className="absolute inset-0 bg-black/50" aria-label="Close round editor" />
      <aside className="relative z-10 h-full w-full max-w-5xl overflow-y-auto border-l border-line bg-panel p-6 shadow-2xl">
        <DrawerHeader eyebrow="Edit Scorecard" title={title} onClose={onClose} />

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailTile label="Score" value={stats.holesCompleted ? stats.totalScore.toString() : form.score || "-"} />
          <DetailTile label="Holes" value={`${stats.holesCompleted}/${holes.length || form.holes_played || 18}`} />
          <DetailTile label="Putts" value={stats.holesCompleted ? stats.putts.toString() : form.putts || "-"} />
          <DetailTile label="Penalties" value={stats.holesCompleted ? stats.penalties.toString() : form.penalty_shots || "0"} danger={(stats.penalties || Number(form.penalty_shots || 0)) > 0} />
        </div>

        <div className="mb-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Round name" value={form.round_name} onChange={(value) => setField("round_name", value)} />
          <Field label="Course" value={form.course} onChange={(value) => setField("course", value)} />
          <Field label="Date" type="date" value={form.date} onChange={(value) => setField("date", value)} />
          <Field label="Tees Played" value={form.tee_colour} onChange={(value) => setField("tee_colour", value)} />
          <Field label="Playing partners" value={form.playing_partners} onChange={(value) => setField("playing_partners", value)} />
          <Field label="Average Driving Distance" type="number" value={form.average_driving_distance} onChange={(value) => setField("average_driving_distance", value)} />
          <Field label="Longest Drive" type="number" value={form.longest_drive} onChange={(value) => setField("longest_drive", value)} />
          <Field label="Tee Shot Quality" value={form.tee_shot_quality} onChange={(value) => setField("tee_shot_quality", value)} />
          <label className="flex items-center gap-3 rounded-lg border border-line bg-steel/5 px-4 py-3">
            <input type="checkbox" checked={form.is_competition} onChange={(event) => setField("is_competition", event.target.checked)} />
            <span className="font-medium text-dark">Competition round</span>
          </label>
        </div>

        <Surface className="mb-5 p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-golf">Hole-by-hole edit</p>
              <h3 className="mt-1 text-2xl font-semibold text-dark">
                {selectedHole ? `Hole ${selectedHole.hole_number}` : "No holes available"}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {holes.map((hole, index) => (
                <button
                  key={hole.hole_number}
                  onClick={() => setSelectedHoleIndex(index)}
                  className={`h-10 w-10 rounded-lg border text-sm font-semibold transition ${
                    index === selectedHoleIndex
                      ? "border-golf bg-golf text-white"
                      : hole.score
                        ? "border-golf/30 bg-golf/10 text-golf"
                        : "border-line bg-panel text-muted hover:border-golf/40"
                  }`}
                  aria-label={`Edit hole ${hole.hole_number}`}
                >
                  {hole.hole_number}
                </button>
              ))}
            </div>
          </div>

          {selectedHole && (
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
              <SelectField label="Par" value={selectedHole.par} onChange={(value) => updateHole(selectedHoleIndex, "par", value)} options={["3", "4", "5"]} />
              <Field label="Score" type="number" value={selectedHole.score} onChange={(value) => updateHole(selectedHoleIndex, "score", value)} />
              <SelectField
                label="Fairway"
                value={selectedHole.fairway_result}
                disabled={selectedHole.par === "3"}
                onChange={(value) => updateHole(selectedHoleIndex, "fairway_result", value as FairwayResult)}
                options={fairwayOptions}
              />
              {selectedHole.par !== "3" && selectedHole.fairway_result !== "hit" && selectedHole.fairway_result !== "na" && (
                <SelectField
                  label="Where did it finish?"
                  value={selectedHole.tee_shot_location}
                  onChange={(value) => updateHole(selectedHoleIndex, "tee_shot_location", value as "" | TeeShotLocation)}
                  options={teeLocationOptions}
                />
              )}
              <label className="flex items-center gap-3 rounded-lg border border-line bg-steel/5 px-4 py-3">
                <input type="checkbox" checked={selectedHole.gir} onChange={(event) => updateHole(selectedHoleIndex, "gir", event.target.checked)} />
                <span className="font-medium text-dark">GIR</span>
              </label>
              <Field label="Putts" type="number" value={selectedHole.putts} onChange={(value) => updateHole(selectedHoleIndex, "putts", value)} />
              <Field label="Penalties" type="number" value={selectedHole.penalty_shots} onChange={(value) => updateHole(selectedHoleIndex, "penalty_shots", value)} />
              <Field label="Chips" type="number" value={selectedHole.chip_shots} onChange={(value) => updateHole(selectedHoleIndex, "chip_shots", value)} />
              <Field label="Bunkers" type="number" value={selectedHole.greenside_bunker_shots} onChange={(value) => updateHole(selectedHoleIndex, "greenside_bunker_shots", value)} />
              <SelectField
                label="Recovery counted as"
                value={selectedHole.recovery_shot_type}
                onChange={(value) => updateHole(selectedHoleIndex, "recovery_shot_type", value as "" | "chip" | "sand")}
                options={["", "chip", "sand"]}
              />
            </div>
          )}
        </Surface>

        <div>
          <FieldLabel>Notes</FieldLabel>
          <TextArea value={form.notes} onChange={(event) => setField("notes", event.target.value)} rows={4} />
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button variant="danger" onClick={onDelete}><Trash2 className="h-4 w-4" />Delete Round</Button>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="golf" onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save Scorecard"}</Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function DrawerHeader({ eyebrow, title, onClose }: { eyebrow: string; title: string; onClose: () => void }) {
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

function DetailTile({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-steel/5 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${danger ? "text-danger" : "text-dark"}`}>{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <TextInput type={type} min={type === "number" ? 0 : undefined} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm capitalize text-ink outline-none transition focus:border-pulse/50 focus:ring-4 focus:ring-pulse/10 disabled:bg-steel/5 disabled:text-muted"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {formatCell(option || "none")}
          </option>
        ))}
      </select>
    </div>
  );
}

function toRoundForm(round: Round): RoundForm {
  return {
    round_name: round.round_name || "",
    course: round.course || "",
    date: round.date || "",
    score: round.score?.toString() || "",
    fairways_hit: round.fairways_hit?.toString() || "",
    fairways_possible: round.fairways_possible?.toString() || "",
    greens_in_regulation: round.greens_in_regulation?.toString() || "",
    putts: round.putts?.toString() || "",
    holes_played: round.holes_played?.toString() || "18",
    tee_colour: round.tee_colour || "",
    average_driving_distance: round.average_driving_distance?.toString() || "",
    longest_drive: round.longest_drive?.toString() || "",
    tee_shot_quality: round.tee_shot_quality || "",
    penalty_shots: round.penalty_shots?.toString() || "",
    chip_shots: round.chip_shots?.toString() || "",
    greenside_bunker_shots: round.greenside_bunker_shots?.toString() || "",
    is_competition: round.is_competition,
    playing_partners: round.playing_partners || "",
    notes: round.notes || "",
  };
}

function toHoleForms(round: Round, holes: RoundHole[]): HoleForm[] {
  if (holes.length > 0) {
    return holes.map((hole) => ({
      id: hole.id,
      hole_number: hole.hole_number,
      par: hole.par?.toString() || "4",
      score: hole.score?.toString() || "",
      fairway_result: hole.fairway_result || "na",
      tee_shot_location: hole.tee_shot_location || "",
      gir: hole.gir,
      putts: hole.putts?.toString() || "",
      penalty_shots: hole.penalty_shots?.toString() || "",
      chip_shots: hole.chip_shots?.toString() || "",
      greenside_bunker_shots: hole.greenside_bunker_shots?.toString() || "",
      recovery_shot_type: hole.recovery_shot_type || "",
    }));
  }

  const holeCount = Math.max(1, Math.min(round.holes_played || 18, 18));
  return Array.from({ length: holeCount }, (_, index) => ({
    hole_number: index + 1,
    par: "4",
    score: "",
    fairway_result: "na",
    tee_shot_location: "",
    gir: false,
    putts: "",
    penalty_shots: "",
    chip_shots: "",
    greenside_bunker_shots: "",
    recovery_shot_type: "",
  }));
}

function calculateHoleStats(holes: HoleForm[]) {
  const completed = holes.filter((hole) => hole.score !== "");
  const fairwayHoles = completed.filter((hole) => hole.par !== "3");
  const scrambleChances = completed.filter((hole) => !hole.gir);
  const successfulScrambles = scrambleChances.filter((hole) => Number(hole.score) <= Number(hole.par || 4)).length;

  return {
    holesCompleted: completed.length,
    totalScore: completed.reduce((sum, hole) => sum + Number(hole.score || 0), 0),
    fairwaysHit: fairwayHoles.filter((hole) => hole.fairway_result === "hit").length,
    fairwaysPossible: fairwayHoles.length,
    girs: completed.filter((hole) => hole.gir).length,
    putts: completed.reduce((sum, hole) => sum + Number(hole.putts || 0), 0),
    penalties: completed.reduce((sum, hole) => sum + Number(hole.penalty_shots || 0), 0),
    chips: completed.reduce((sum, hole) => sum + Number(hole.chip_shots || 0), 0),
    bunkers: completed.reduce((sum, hole) => sum + Number(hole.greenside_bunker_shots || 0), 0),
    scramblePercent: scrambleChances.length ? Math.round((successfulScrambles / scrambleChances.length) * 100) : null,
  };
}

function hasAnyHoleData(hole: HoleForm) {
  return Boolean(
    hole.score ||
      hole.putts ||
      hole.penalty_shots ||
      hole.chip_shots ||
      hole.greenside_bunker_shots ||
      hole.gir ||
      hole.fairway_result !== "na" ||
      hole.tee_shot_location ||
      hole.recovery_shot_type
  );
}

function formatCell(value: string) {
  if (value === "na") return "N/A";
  if (value === "none") return "None";
  return value.replaceAll("_", " ");
}
