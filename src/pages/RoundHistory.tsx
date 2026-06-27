import { useEffect, useState } from "react";
import { Edit3, Eye, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatAverage, getGolfStats } from "@/lib/golfStats";
import { Button, Card, PageHeader, StatCard } from "@/components/ui";
import type { Round, RoundHole } from "@/lib/types";

export default function RoundHistory() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundHoles, setRoundHoles] = useState<Record<string, RoundHole[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [saving, setSaving] = useState(false);
  const [roundError, setRoundError] = useState("");
  const [editForm, setEditForm] = useState({
    course: "",
    date: "",
    score: "",
    fairways_hit: "",
    greens_in_regulation: "",
    putts: "",
    fairways_possible: "",
    holes_played: "18",
    tee_colour: "",
    average_driving_distance: "",
    longest_drive: "",
    tee_shot_quality: "",
    penalty_shots: "",
    chip_shots: "",
    greenside_bunker_shots: "",
    is_competition: false,
    notes: "",
  });

  useEffect(() => {
    loadRounds();
  }, []);

  const loadRounds = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("rounds")
      .select("*")
      .order("created_at", { ascending: false });
    const loadedRounds = (data as Round[]) || [];
    setRounds(loadedRounds);

    if (loadedRounds.length > 0) {
      const { data: holesData } = await supabase
        .from("round_holes")
        .select("*")
        .in(
          "round_id",
          loadedRounds.map((round) => round.id)
        )
        .order("hole_number", { ascending: true });

      const grouped = ((holesData as RoundHole[]) || []).reduce<Record<string, RoundHole[]>>(
        (acc, hole) => {
          acc[hole.round_id] = [...(acc[hole.round_id] || []), hole];
          return acc;
        },
        {}
      );
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
    setEditForm({
      course: round.course || "",
      date: round.date || "",
      score: round.score?.toString() || "",
      fairways_hit: round.fairways_hit?.toString() || "",
      greens_in_regulation: round.greens_in_regulation?.toString() || "",
      putts: round.putts?.toString() || "",
      fairways_possible: round.fairways_possible?.toString() || "",
      holes_played: round.holes_played?.toString() || "18",
      tee_colour: round.tee_colour || "",
      average_driving_distance: round.average_driving_distance?.toString() || "",
      longest_drive: round.longest_drive?.toString() || "",
      tee_shot_quality: round.tee_shot_quality || "",
      penalty_shots: round.penalty_shots?.toString() || "",
      chip_shots: round.chip_shots?.toString() || "",
      greenside_bunker_shots: round.greenside_bunker_shots?.toString() || "",
      is_competition: round.is_competition,
      notes: round.notes || "",
    });
  };

  const parseNumber = (value: string) => (value === "" ? null : Number(value));

  const saveRound = async () => {
    if (!editingRound) return;

    setSaving(true);
    setRoundError("");

    const { error } = await supabase
      .from("rounds")
      .update({
        course: editForm.course || null,
        date: editForm.date || null,
        score: parseNumber(editForm.score),
        fairways_hit: parseNumber(editForm.fairways_hit),
        fairways_possible: parseNumber(editForm.fairways_possible),
        greens_in_regulation: parseNumber(editForm.greens_in_regulation),
        putts: parseNumber(editForm.putts),
        holes_played: parseNumber(editForm.holes_played),
        tee_colour: editForm.tee_colour || null,
        average_driving_distance: parseNumber(editForm.average_driving_distance),
        longest_drive: parseNumber(editForm.longest_drive),
        tee_shot_quality: editForm.tee_shot_quality || null,
        penalty_shots: parseNumber(editForm.penalty_shots),
        chip_shots: parseNumber(editForm.chip_shots),
        greenside_bunker_shots: parseNumber(editForm.greenside_bunker_shots),
        is_competition: editForm.is_competition,
        notes: editForm.notes || null,
      })
      .eq("id", editingRound.id);

    setSaving(false);

    if (error) {
      setRoundError(error.message);
      return;
    }

    setEditingRound(null);
    await loadRounds();
  };

  const deleteRound = async (round: Round) => {
    const confirmed = window.confirm(
      `Delete ${round.course || "this round"}? This cannot be undone.`
    );
    if (!confirmed) return;

    setRoundError("");
    const { error } = await supabase.from("rounds").delete().eq("id", round.id);

    if (error) {
      setRoundError(error.message);
      return;
    }

    setSelectedRound(null);
    setEditingRound(null);
    setRounds((prev) => prev.filter((item) => item.id !== round.id));
  };

  const roundsLogged = rounds.length;
  const golfStats = getGolfStats(rounds);
  const avgScore = formatAverage(golfStats.avgScore);
  const bestRound = golfStats.bestScore;

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
          <PageHeader
            eyebrow="Golf"
            title="Round History"
            description="Review previous rounds, inspect performance details and update your scoring record."
            tone="text-[#1F4D3A]"
          />
          <section className="grid md:grid-cols-4 gap-6 mb-12 mt-10">
            {[
              ["Rounds Logged", roundsLogged.toString()],
              ["Average Score", avgScore],
              ["Best Round", bestRound === null ? "-" : bestRound.toString()],
              ["Handicap", "-"],
            ].map(([label, value], index) => (
              <StatCard
                key={index}
                label={label}
                value={value}
                tone="bg-[#1F4D3A] text-white"
              />
            ))}
          </section>
        </div>

        {roundError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {roundError}
          </div>
        )}

        {rounds.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center shadow-sm border border-line">
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
              <Card
                key={round.id || index}
                className="transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
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

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      ["Score", round.score?.toString() || "-"],
                      ["GIR", `${round.greens_in_regulation ?? "-"}/${round.holes_played ?? 18}`],
                      [
                        "FIR",
                        `${round.fairways_hit ?? "-"}/${round.fairways_possible ?? "-"}`,
                      ],
                      ["Scramble", round.scramble_percentage === null ? "-" : `${round.scramble_percentage}%`],
                      ["Avg Drive", round.average_driving_distance ? `${round.average_driving_distance} yd` : "-"],
                      ["Longest", round.longest_drive ? `${round.longest_drive} yd` : "-"],
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

                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={() => setSelectedRound(round)}
                      className="bg-[#1F4D3A] hover:bg-[#17392b]"
                    >
                      <Eye className="h-4 w-4" />
                      Details
                    </Button>
                    <Button variant="secondary" onClick={() => openEdit(round)}>
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedRound && (
        <RoundDetailsModal
          round={selectedRound}
          holes={roundHoles[selectedRound.id] || []}
          onClose={() => setSelectedRound(null)}
          onEdit={() => openEdit(selectedRound)}
          onDelete={() => deleteRound(selectedRound)}
        />
      )}

      {editingRound && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <button
            onClick={() => setEditingRound(null)}
            className="absolute inset-0 bg-black/50"
            aria-label="Close round editor"
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm uppercase tracking-[0.25em] text-[#1F4D3A]/70">
                  Edit Round
                </p>
                <h2 className="text-4xl font-semibold text-[#1F4D3A]">
                  {editingRound.course || "Golf Round"}
                </h2>
              </div>
              <button
                onClick={() => setEditingRound(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-black/50 transition hover:bg-black/5 hover:text-black"
                aria-label="Close round editor"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Course"
                value={editForm.course}
                onChange={(value) => setEditForm((prev) => ({ ...prev, course: value }))}
              />
              <Field
                label="Date"
                type="date"
                value={editForm.date}
                onChange={(value) => setEditForm((prev) => ({ ...prev, date: value }))}
              />
              <Field
                label="Score"
                type="number"
                value={editForm.score}
                onChange={(value) => setEditForm((prev) => ({ ...prev, score: value }))}
              />
              <Field
                label="Putts"
                type="number"
                value={editForm.putts}
                onChange={(value) => setEditForm((prev) => ({ ...prev, putts: value }))}
              />
              <Field
                label="Fairways Hit"
                type="number"
                value={editForm.fairways_hit}
                onChange={(value) => setEditForm((prev) => ({ ...prev, fairways_hit: value }))}
              />
              <Field
                label="Fairways Possible"
                type="number"
                value={editForm.fairways_possible}
                onChange={(value) =>
                  setEditForm((prev) => ({ ...prev, fairways_possible: value }))
                }
              />
              <Field
                label="Greens in Regulation"
                type="number"
                value={editForm.greens_in_regulation}
                onChange={(value) =>
                  setEditForm((prev) => ({ ...prev, greens_in_regulation: value }))
                }
              />
              <Field
                label="Holes Played"
                type="number"
                value={editForm.holes_played}
                onChange={(value) => setEditForm((prev) => ({ ...prev, holes_played: value }))}
              />
              <Field
                label="Tees Played"
                value={editForm.tee_colour}
                onChange={(value) => setEditForm((prev) => ({ ...prev, tee_colour: value }))}
              />
              <Field
                label="Average Driving Distance"
                type="number"
                value={editForm.average_driving_distance}
                onChange={(value) =>
                  setEditForm((prev) => ({ ...prev, average_driving_distance: value }))
                }
              />
              <Field
                label="Longest Drive"
                type="number"
                value={editForm.longest_drive}
                onChange={(value) => setEditForm((prev) => ({ ...prev, longest_drive: value }))}
              />
              <Field
                label="Tee Shot Quality"
                value={editForm.tee_shot_quality}
                onChange={(value) => setEditForm((prev) => ({ ...prev, tee_shot_quality: value }))}
              />
              <Field
                label="Penalty Shots"
                type="number"
                value={editForm.penalty_shots}
                onChange={(value) => setEditForm((prev) => ({ ...prev, penalty_shots: value }))}
              />
              <Field
                label="Chip Shots"
                type="number"
                value={editForm.chip_shots}
                onChange={(value) => setEditForm((prev) => ({ ...prev, chip_shots: value }))}
              />
              <Field
                label="Greenside Bunker Shots"
                type="number"
                value={editForm.greenside_bunker_shots}
                onChange={(value) =>
                  setEditForm((prev) => ({ ...prev, greenside_bunker_shots: value }))
                }
              />
              <label className="flex items-center gap-3 rounded-2xl border border-line px-5 py-4">
                <input
                  type="checkbox"
                  checked={editForm.is_competition}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      is_competition: event.target.checked,
                    }))
                  }
                />
                <span className="font-medium">Competition round</span>
              </label>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-black/50">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  rows={4}
                  className="w-full rounded-2xl border border-line px-5 py-4 outline-none focus:border-[#1F4D3A]"
                />
              </div>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button variant="danger" onClick={() => deleteRound(editingRound)}>
                <Trash2 className="h-4 w-4" />
                Delete Round
              </Button>
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button variant="secondary" onClick={() => setEditingRound(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={saveRound}
                  disabled={saving}
                  className="bg-[#1F4D3A] hover:bg-[#17392b]"
                >
                  {saving ? "Saving..." : "Save Round"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoundDetailsModal({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
        aria-label="Close round details"
      />
      <div className="relative z-10 w-full max-w-4xl rounded-xl bg-white p-8 shadow-2xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-sm uppercase tracking-[0.25em] text-[#1F4D3A]/70">
              Round Details
            </p>
            <h2 className="text-4xl font-semibold text-[#1F4D3A]">
              {round.course || "Unknown Course"}
            </h2>
            <p className="mt-2 text-black/55">{round.date || "No date saved"}</p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-black/50 transition hover:bg-black/5 hover:text-black"
            aria-label="Close round details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            ["Score", round.score?.toString() || "-"],
            ["Fairways", `${round.fairways_hit ?? "-"}/${round.fairways_possible ?? "-"}`],
            ["GIR", `${round.greens_in_regulation ?? "-"}/${round.holes_played ?? 18}`],
            ["Scramble", round.scramble_percentage === null ? "-" : `${round.scramble_percentage}%`],
            ["Avg Drive", round.average_driving_distance ? `${round.average_driving_distance} yd` : "-"],
            ["Longest", round.longest_drive ? `${round.longest_drive} yd` : "-"],
            ["Putts", round.putts?.toString() || "-"],
            ["Penalties", (round.penalty_shots ?? 0).toString()],
            ["Chip Shots", (round.chip_shots ?? 0).toString()],
            ["Bunkers", (round.greenside_bunker_shots ?? 0).toString()],
            ["Type", round.is_competition ? "Competition" : "General"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-cream p-5">
              <p className="mb-2 text-sm text-[#1F4D3A]/70">{label}</p>
              <h3 className="text-2xl font-semibold">{value}</h3>
            </div>
          ))}
        </div>

        {holes.length > 0 && (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-[#1F4D3A]/10">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-[#1F4D3A]/5 text-[#1F4D3A]">
                <tr>
                  <th className="p-3">Hole</th>
                  <th className="p-3">Par</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Fairway</th>
                  <th className="p-3">GIR</th>
                  <th className="p-3">Putts</th>
                  <th className="p-3">Pen</th>
                  <th className="p-3">Chips</th>
                  <th className="p-3">Bunkers</th>
                </tr>
              </thead>
              <tbody>
                {holes.map((hole) => (
                  <tr key={hole.id} className="border-t border-line">
                    <td className="p-3 font-medium">{hole.hole_number}</td>
                    <td className="p-3">{hole.par}</td>
                    <td className="p-3">{hole.score ?? "-"}</td>
                    <td className="p-3 capitalize">{hole.fairway_result || "na"}</td>
                    <td className="p-3">{hole.gir ? "Yes" : "No"}</td>
                    <td className="p-3">{hole.putts ?? 0}</td>
                    <td className="p-3">{hole.penalty_shots ?? 0}</td>
                    <td className="p-3">{hole.chip_shots ?? 0}</td>
                    <td className="p-3">{hole.greenside_bunker_shots ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {round.notes && (
          <div className="mt-6 rounded-2xl bg-cream p-5">
            <p className="mb-2 text-sm text-[#1F4D3A]/70">Notes</p>
            <p className="text-black/70">{round.notes}</p>
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button variant="danger" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button onClick={onEdit} className="bg-[#1F4D3A] hover:bg-[#17392b]">
              <Edit3 className="h-4 w-4" />
              Edit Round
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-black/50">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-line px-5 py-4 outline-none focus:border-[#1F4D3A]"
      />
    </div>
  );
}
