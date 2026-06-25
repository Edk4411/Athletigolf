import { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type FairwayResult = "hit" | "left" | "right" | "miss" | "na";

type Hole = {
  par: number;
  score: string;
  fairway: FairwayResult;
  gir: boolean;
  putts: string;
};

const GOLF_GREEN = "#1F4D3A";
const COMP_ORANGE = "#D97706";
const GENERAL_BLUE = "#2563EB";

const defaultHoles: Hole[] = Array.from({ length: 18 }, () => ({
  par: 4,
  score: "",
  fairway: "na",
  gir: false,
  putts: "",
}));

export default function RoundTracker() {
  const [course, setCourse] = useState("");
  const [competition, setCompetition] = useState(false);
  const [teeColour, setTeeColour] = useState("");
  const [date, setDate] = useState("");
  const [penaltyShots, setPenaltyShots] = useState("");
  const [chipShots, setChipShots] = useState("");
  const [greensideBunkerShots, setGreensideBunkerShots] = useState("");
  const [holes, setHoles] = useState<Hole[]>(defaultHoles);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const updateHole = (
    index: number,
    field: keyof Hole,
    value: Hole[keyof Hole]
  ) => {
    setHoles((prev) =>
      prev.map((hole, i) => (i === index ? { ...hole, [field]: value } : hole))
    );
  };

  const stats = useMemo(() => {
    const completed = holes.filter((h) => h.score !== "");

    const totalPar = completed.reduce((sum, h) => sum + h.par, 0);
    const totalScore = completed.reduce(
      (sum, h) => sum + Number(h.score),
      0
    );
    const totalPutts = completed.reduce(
      (sum, h) => sum + Number(h.putts || 0),
      0
    );

    const frontNine = holes
      .slice(0, 9)
      .filter((h) => h.score !== "")
      .reduce((sum, h) => sum + Number(h.score), 0);

    const backNine = holes
      .slice(9, 18)
      .filter((h) => h.score !== "")
      .reduce((sum, h) => sum + Number(h.score), 0);

    const fairwayHoles = completed.filter((h) => h.fairway !== "na");
    const fairwaysHit = fairwayHoles.filter((h) => h.fairway === "hit").length;

    const girs = completed.filter((h) => h.gir).length;

    const par3Scores = completed.filter((h) => h.par === 3);
    const par4Scores = completed.filter((h) => h.par === 4);
    const par5Scores = completed.filter((h) => h.par === 5);
    const totalPenaltyShots = Number(penaltyShots || 0);
    const totalChipShots = Number(chipShots || 0);
    const totalGreensideBunkerShots = Number(greensideBunkerShots || 0);

    const average = (arr: Hole[]) =>
      arr.length
        ? (
            arr.reduce((sum, h) => sum + Number(h.score), 0) / arr.length
          ).toFixed(1)
        : "-";

    return {
      holesCompleted: completed.length,
      totalPar,
      totalScore,
      scoreToPar: totalScore - totalPar,
      frontNine,
      backNine,
      totalPutts,
      avgPutts: completed.length
        ? (totalPutts / completed.length).toFixed(1)
        : "-",
      fairwaysHit,
      fairwaysPossible: fairwayHoles.length,
      fairwayPercent: fairwayHoles.length
        ? Math.round((fairwaysHit / fairwayHoles.length) * 100)
        : 0,
      girs,
      girPercent: completed.length
        ? Math.round((girs / completed.length) * 100)
        : 0,
      penaltyShots: totalPenaltyShots,
      chipShots: totalChipShots,
      greensideBunkerShots: totalGreensideBunkerShots,
      par3Avg: average(par3Scores),
      par4Avg: average(par4Scores),
      par5Avg: average(par5Scores),
    };
  }, [holes, penaltyShots, chipShots, greensideBunkerShots]);

  const formatToPar = (score: number) => {
    if (!stats.holesCompleted) return "-";
    if (score === 0) return "E";
    return score > 0 ? `+${score}` : `${score}`;
  };

  const resetRound = () => {
    setCourse("");
    setCompetition(false);
    setTeeColour("");
    setDate("");
    setPenaltyShots("");
    setChipShots("");
    setGreensideBunkerShots("");
    setHoles(defaultHoles);
    setSubmitted(false);
    setSaveError("");
  };

  const finishRound = async () => {
    setSaving(true);
    setSaveError("");
    const { error } = await supabase.from("rounds").insert({
      course: course || null,
      date: date || null,
      score: stats.totalScore || null,
      fairways_hit: stats.fairwaysHit || null,
      greens_in_regulation: stats.girs || null,
      putts: stats.totalPutts || null,
      penalty_shots: stats.penaltyShots,
      chip_shots: stats.chipShots,
      greenside_bunker_shots: stats.greensideBunkerShots,
      scramble_percentage: null,
      is_competition: competition,
      notes: teeColour ? `Tee colour: ${teeColour}` : null,
    });
    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-cream p-6 text-dark">
        <div className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow-xl border border-[#1F4D3A]/10">
          <p className="mb-2 text-sm uppercase tracking-[0.25em] text-[#1F4D3A]/70">
            Round Summary
          </p>

          <h1 className="mb-2 text-4xl font-semibold">
            {course || "Golf Round"}
          </h1>

          <div className="mb-8 flex flex-wrap items-center gap-2 text-black/60">
            <span
              className={`rounded-full px-4 py-2 text-sm text-white ${
                competition ? "bg-[#D97706]" : "bg-[#2563EB]"
              }`}
            >
              {competition ? "Competition Round" : "General Play"}
            </span>

            {teeColour && <span>- {teeColour} tees</span>}
            {date && <span>- {date}</span>}
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Score" value={stats.totalScore || "-"} />
            <Stat label="To Par" value={formatToPar(stats.scoreToPar)} />
            <Stat label="Front 9" value={stats.frontNine || "-"} />
            <Stat label="Back 9" value={stats.backNine || "-"} />
            <Stat label="Putts" value={stats.totalPutts || "-"} />
            <Stat label="Avg Putts" value={stats.avgPutts} />
            <Stat
              label="Fairways"
              value={`${stats.fairwaysHit}/${stats.fairwaysPossible}`}
            />
            <Stat label="GIR" value={`${stats.girs}/${stats.holesCompleted}`} />
            <Stat label="FIR %" value={`${stats.fairwayPercent}%`} />
            <Stat label="GIR %" value={`${stats.girPercent}%`} />
            <Stat label="Par 3 Avg" value={stats.par3Avg} />
            <Stat label="Par 4 Avg" value={stats.par4Avg} />
            <Stat label="Par 5 Avg" value={stats.par5Avg} />
            <Stat label="Penalties" value={stats.penaltyShots} />
            <Stat label="Chip Shots" value={stats.chipShots} />
            <Stat label="Bunker Shots" value={stats.greensideBunkerShots} />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => setSubmitted(false)}
              className="rounded-xl bg-[#1F4D3A] px-6 py-3 text-white transition hover:scale-[1.02]"
            >
              Edit Round
            </button>

            <button
              onClick={resetRound}
              className="rounded-xl border border-[#1F4D3A]/20 px-6 py-3 transition hover:bg-[#1F4D3A]/5"
            >
              Start New Round
            </button>

            <a
              href="/golf"
              className="rounded-xl border border-[#1F4D3A]/20 px-6 py-3 transition hover:bg-[#1F4D3A]/5"
            >
              View Round History
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream p-6 text-dark">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="mb-2 text-sm uppercase tracking-[0.25em] text-[#1F4D3A]/70">
            Golf
          </p>

         <h1 className="text-4xl font-semibold text-[#1F4D3A]">
  Submit Round
</h1>
        </div>

        <div className="mb-6 grid gap-4 rounded-3xl bg-white p-6 shadow-xl border border-[#1F4D3A]/10 md:grid-cols-4">
          <input
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            placeholder="Course name"
            className="rounded-xl border border-black/10 p-3 outline-none focus:border-[#1F4D3A]"
          />

          <input
            value={teeColour}
            onChange={(e) => setTeeColour(e.target.value)}
            placeholder="Tee colour"
            className="rounded-xl border border-black/10 p-3 outline-none focus:border-[#1F4D3A]"
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-black/10 p-3 outline-none focus:border-[#1F4D3A]"
          />

          <label className="flex items-center gap-3 rounded-xl border border-[#1F4D3A]/20 p-3">
            <input
              type="checkbox"
              checked={competition}
              onChange={(e) => setCompetition(e.target.checked)}
            />
            Competition round?
          </label>
        </div>

        <div className="mb-6 grid gap-4 rounded-3xl bg-white p-6 shadow-xl border border-[#1F4D3A]/10 md:grid-cols-3">
          <input
            type="number"
            min={0}
            value={penaltyShots}
            onChange={(e) => setPenaltyShots(e.target.value)}
            placeholder="Penalty shots"
            className="rounded-xl border border-black/10 p-3 outline-none focus:border-[#1F4D3A]"
          />

          <input
            type="number"
            min={0}
            value={chipShots}
            onChange={(e) => setChipShots(e.target.value)}
            placeholder="Chip shots"
            className="rounded-xl border border-black/10 p-3 outline-none focus:border-[#1F4D3A]"
          />

          <input
            type="number"
            min={0}
            value={greensideBunkerShots}
            onChange={(e) => setGreensideBunkerShots(e.target.value)}
            placeholder="Greenside bunker shots"
            className="rounded-xl border border-black/10 p-3 outline-none focus:border-[#1F4D3A]"
          />
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-9">
          <Stat label="Score" value={stats.totalScore || "-"} />
          <Stat label="To Par" value={formatToPar(stats.scoreToPar)} />
          <Stat label="Holes" value={`${stats.holesCompleted}/18`} />
          <Stat label="Putts" value={stats.totalPutts || "-"} />
          <Stat label="FIR" value={`${stats.fairwayPercent}%`} />
          <Stat label="GIR" value={`${stats.girPercent}%`} />
          <Stat label="Penalties" value={stats.penaltyShots} />
          <Stat label="Chips" value={stats.chipShots} />
          <Stat label="Bunkers" value={stats.greensideBunkerShots} />
        </div>

        <div className="overflow-x-auto rounded-3xl bg-white p-4 shadow-xl border border-[#1F4D3A]/10">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-[#1F4D3A]/70">
                <th className="p-3">Hole</th>
                <th className="p-3">Par</th>
                <th className="p-3">Score</th>
                <th className="p-3">To Par</th>
                <th className="p-3">Fairway</th>
                <th className="p-3">GIR</th>
                <th className="p-3">Putts</th>
              </tr>
            </thead>

            <tbody>
              {holes.map((hole, index) => {
                const holeScore =
                  hole.score === "" ? null : Number(hole.score) - hole.par;

                return (
                  <tr key={index} className="border-b border-black/5">
                    <td className="p-3 font-medium">{index + 1}</td>

                    <td className="p-3">
                      <select
                        value={hole.par}
                        onChange={(e) =>
                          updateHole(index, "par", Number(e.target.value))
                        }
                        className="rounded-xl border border-black/10 p-2 outline-none focus:border-[#1F4D3A]"
                      >
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </td>

                    <td className="p-3">
                      <input
                        type="number"
                        min={1}
                        value={hole.score}
                        onChange={(e) =>
                          updateHole(index, "score", e.target.value)
                        }
                        className="w-20 rounded-xl border border-black/10 p-2 outline-none focus:border-[#1F4D3A]"
                      />
                    </td>

                    <td className="p-3 font-medium">
                      {holeScore === null ? "-" : formatToPar(holeScore)}
                    </td>

                    <td className="p-3">
                      <select
                        value={hole.fairway}
                        onChange={(e) =>
                          updateHole(
                            index,
                            "fairway",
                            e.target.value as FairwayResult
                          )
                        }
                        className="rounded-xl border border-black/10 p-2 outline-none focus:border-[#1F4D3A]"
                      >
                        <option value="na">N/A</option>
                        <option value="hit">Hit</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                        <option value="miss">Miss</option>
                      </select>
                    </td>

                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={hole.gir}
                        onChange={(e) =>
                          updateHole(index, "gir", e.target.checked)
                        }
                      />
                    </td>

                    <td className="p-3">
                      <input
                        type="number"
                        min={0}
                        value={hole.putts}
                        onChange={(e) =>
                          updateHole(index, "putts", e.target.value)
                        }
                        className="w-20 rounded-xl border border-black/10 p-2 outline-none focus:border-[#1F4D3A]"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {saveError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
            {saveError}
          </div>
        )}

        <button
          onClick={finishRound}
          disabled={saving}
          className="mt-8 w-full rounded-xl bg-[#1F4D3A] py-4 text-white transition hover:scale-[1.01] disabled:opacity-50 md:w-auto md:px-10"
        >
          {saving ? "Saving..." : "Finish Round"}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow border border-[#1F4D3A]/10">
      <p className="text-xs uppercase tracking-[0.2em] text-[#1F4D3A]/70">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
