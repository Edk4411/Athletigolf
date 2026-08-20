import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import ScoreBadge from "@/components/ScoreBadge";
import { Button, FieldLabel, Surface, TextArea, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { Round, RoundHole } from "@/lib/types";
import HoleRowEditor, { type HoleForm } from "./HoleRowEditor";
import { DrawerHeader, DetailTile } from "./RoundDetailsDrawer";

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

interface RoundEditDrawerProps {
  round: Round;
  initialHoles: RoundHole[];
  onClose: () => void;
  onSaveSuccess: () => Promise<void>;
  onDelete: () => void;
}

export default function RoundEditDrawer({
  round,
  initialHoles,
  onClose,
  onSaveSuccess,
  onDelete,
}: RoundEditDrawerProps) {
  const [form, setForm] = useState<RoundForm>(emptyForm);
  const [holes, setHoles] = useState<HoleForm[]>([]);
  const [selectedHoleIndex, setSelectedHoleIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(toRoundForm(round));
    setHoles(toHoleForms(round, initialHoles));
    setSelectedHoleIndex(0);
    setError("");
  }, [round, initialHoles]);

  const selectedHole = holes[selectedHoleIndex];
  const stats = useMemo(() => calculateHoleStats(holes), [holes]);

  const setField = <K extends keyof RoundForm>(key: K, value: RoundForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateHole = <K extends keyof HoleForm>(index: number, key: K, value: HoleForm[K]) => {
    setHoles((prev) =>
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

  const saveRound = async () => {
    setSaving(true);
    setError("");

    const holeStats = calculateHoleStats(holes);
    const hasHoleScores = holeStats.holesCompleted > 0;
    const targetHoles = round.target_holes || holes.length || Number(form.holes_played || 18);
    const nextStatus = hasHoleScores && holeStats.holesCompleted === targetHoles ? "completed" : "unfinished";

    const { error: saveError } = await supabase
      .from("rounds")
      .update({
        status: nextStatus,
        target_holes: targetHoles,
        completed_at: nextStatus === "completed" ? round.completed_at || new Date().toISOString() : null,
        round_name: form.round_name || null,
        course: form.course || null,
        date: form.date || null,
        score: hasHoleScores ? holeStats.totalScore : parseNumber(form.score),
        fairways_hit: hasHoleScores ? holeStats.fairwaysHit : parseNumber(form.fairways_hit),
        fairways_possible: hasHoleScores ? holeStats.fairwaysPossible : parseNumber(form.fairways_possible),
        greens_in_regulation: hasHoleScores ? holeStats.girs : parseNumber(form.greens_in_regulation),
        putts: hasHoleScores ? holeStats.putts : parseNumber(form.putts),
        holes_played: hasHoleScores ? holeStats.holesCompleted : parseNumber(form.holes_played),
        tee_colour: form.tee_colour || null,
        average_driving_distance: parseNumber(form.average_driving_distance),
        longest_drive: parseNumber(form.longest_drive),
        tee_shot_quality: form.tee_shot_quality || null,
        penalty_shots: hasHoleScores ? holeStats.penalties : parseNumber(form.penalty_shots),
        chip_shots: hasHoleScores ? holeStats.chips : parseNumber(form.chip_shots),
        greenside_bunker_shots: hasHoleScores ? holeStats.bunkers : parseNumber(form.greenside_bunker_shots),
        scramble_percentage: hasHoleScores ? holeStats.scramblePercent : round.scramble_percentage,
        is_competition: form.is_competition,
        playing_partners: form.playing_partners || null,
        notes: form.notes || null,
      })
      .eq("id", round.id);

    if (saveError) {
      setSaving(false);
      setError(saveError.message);
      return;
    }

    for (const hole of holes) {
      const payload = {
        round_id: round.id,
        user_id: round.user_id,
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
        setError(result.error.message);
        return;
      }
    }

    setSaving(false);
    onClose();
    await onSaveSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button onClick={onClose} className="absolute inset-0 bg-black/50" aria-label="Close round editor" />
      <aside className="relative z-10 h-full w-full max-w-5xl overflow-y-auto border-l border-line bg-panel p-6 shadow-2xl">
        <DrawerHeader eyebrow="Edit Scorecard" title={form.round_name || form.course || "Golf Round"} onClose={onClose} />

        {error && (
          <div className="mb-5 rounded-xl border border-danger/25 bg-danger/10 p-4 text-sm font-semibold text-danger">
            {error}
          </div>
        )}

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DetailTile label="Score" value={<ScoreBadge score={stats.holesCompleted ? stats.totalScore : form.score || null} scoreToPar={stats.holesCompleted ? stats.totalScore - stats.totalPar : null} size="lg" />} />
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
            <HoleRowEditor
              selectedHole={selectedHole}
              selectedHoleIndex={selectedHoleIndex}
              updateHole={updateHole}
            />
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
            <Button variant="golf" onClick={saveRound} disabled={saving}>{saving ? "Saving..." : "Save Scorecard"}</Button>
          </div>
        </div>
      </aside>
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
    totalPar: completed.reduce((sum, hole) => sum + Number(hole.par || 4), 0),
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

const parseNumber = (value: string) => (value === "" ? null : Number(value));
