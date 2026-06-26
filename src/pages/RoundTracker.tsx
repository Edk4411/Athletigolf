import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, Flag, Save } from "lucide-react";
import { Button, Card, PageHeader, StatCard } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { FairwayResult } from "@/lib/types";

type Step = "setup" | "holes" | "review" | "saved";

type Hole = {
  par: number;
  score: string;
  fairway: FairwayResult;
  gir: boolean;
  putts: string;
  penaltyShots: string;
  chipShots: string;
  greensideBunkerShots: string;
};

const createHoles = (count: number): Hole[] =>
  Array.from({ length: count }, () => ({
    par: 4,
    score: "",
    fairway: "na",
    gir: false,
    putts: "",
    penaltyShots: "",
    chipShots: "",
    greensideBunkerShots: "",
  }));

const parseStat = (value: string) => Number(value || 0);

export default function RoundTracker() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("setup");
  const [holesPlayed, setHolesPlayed] = useState<9 | 18>(18);
  const [course, setCourse] = useState("");
  const [competition, setCompetition] = useState(false);
  const [teeColour, setTeeColour] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [holes, setHoles] = useState<Hole[]>(createHoles(18));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const updateHole = <K extends keyof Hole>(index: number, field: K, value: Hole[K]) => {
    setHoles((prev) =>
      prev.map((hole, i) => (i === index ? { ...hole, [field]: value } : hole))
    );
  };

  const startRound = () => {
    setHoles(createHoles(holesPlayed));
    setSaveError("");
    setStep("holes");
  };

  const stats = useMemo(() => {
    const completed = holes.filter((hole) => hole.score !== "");
    const totalPar = completed.reduce((sum, hole) => sum + hole.par, 0);
    const totalScore = completed.reduce((sum, hole) => sum + Number(hole.score), 0);
    const totalPutts = completed.reduce((sum, hole) => sum + parseStat(hole.putts), 0);
    const fairwayHoles = completed.filter((hole) => hole.par !== 3);
    const fairwaysHit = fairwayHoles.filter((hole) => hole.fairway === "hit").length;
    const girs = completed.filter((hole) => hole.gir).length;
    const penaltyShots = completed.reduce(
      (sum, hole) => sum + parseStat(hole.penaltyShots),
      0
    );
    const chipShots = completed.reduce((sum, hole) => sum + parseStat(hole.chipShots), 0);
    const greensideBunkerShots = completed.reduce(
      (sum, hole) => sum + parseStat(hole.greensideBunkerShots),
      0
    );
    const frontNine = holes
      .slice(0, 9)
      .filter((hole) => hole.score !== "")
      .reduce((sum, hole) => sum + Number(hole.score), 0);
    const backNine = holes
      .slice(9, 18)
      .filter((hole) => hole.score !== "")
      .reduce((sum, hole) => sum + Number(hole.score), 0);

    return {
      holesCompleted: completed.length,
      totalPar,
      totalScore,
      scoreToPar: totalScore - totalPar,
      totalPutts,
      fairwaysHit,
      fairwaysPossible: fairwayHoles.length,
      girs,
      penaltyShots,
      chipShots,
      greensideBunkerShots,
      frontNine,
      backNine,
      fairwayPercent: fairwayHoles.length
        ? Math.round((fairwaysHit / fairwayHoles.length) * 100)
        : 0,
      girPercent: completed.length ? Math.round((girs / completed.length) * 100) : 0,
    };
  }, [holes]);

  const formatToPar = (score: number) => {
    if (!stats.holesCompleted) return "-";
    if (score === 0) return "E";
    return score > 0 ? `+${score}` : `${score}`;
  };

  const finishRound = async () => {
    if (!user) return;
    if (stats.holesCompleted !== holesPlayed) {
      setSaveError(`Complete all ${holesPlayed} holes before saving.`);
      return;
    }

    setSaving(true);
    setSaveError("");

    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .insert({
        user_id: user.id,
        course: course || null,
        date: date || null,
        score: stats.totalScore || null,
        fairways_hit: stats.fairwaysHit,
        fairways_possible: stats.fairwaysPossible,
        greens_in_regulation: stats.girs,
        putts: stats.totalPutts,
        penalty_shots: stats.penaltyShots,
        chip_shots: stats.chipShots,
        greenside_bunker_shots: stats.greensideBunkerShots,
        holes_played: holesPlayed,
        tee_colour: teeColour || null,
        scramble_percentage: null,
        is_competition: competition,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (roundError || !round) {
      setSaving(false);
      setSaveError(roundError?.message || "Could not save round.");
      return;
    }

    const holeRows = holes.map((hole, index) => ({
      round_id: round.id,
      user_id: user.id,
      hole_number: index + 1,
      par: hole.par,
      score: hole.score === "" ? null : Number(hole.score),
      fairway_result: hole.par === 3 ? "na" : hole.fairway,
      gir: hole.gir,
      putts: parseStat(hole.putts),
      penalty_shots: parseStat(hole.penaltyShots),
      chip_shots: parseStat(hole.chipShots),
      greenside_bunker_shots: parseStat(hole.greensideBunkerShots),
    }));

    const { error: holesError } = await supabase.from("round_holes").insert(holeRows);
    setSaving(false);

    if (holesError) {
      setSaveError(holesError.message);
      return;
    }

    setStep("saved");
  };

  const resetRound = () => {
    setCourse("");
    setCompetition(false);
    setTeeColour("");
    setDate("");
    setNotes("");
    setHolesPlayed(18);
    setHoles(createHoles(18));
    setSaveError("");
    setStep("setup");
  };

  if (step === "saved") {
    return (
      <div className="min-h-screen bg-cream p-6 text-dark">
        <Card className="mx-auto max-w-4xl p-8 text-center">
          <CheckCircle2 className="mx-auto mb-5 h-12 w-12 text-[#1F4D3A]" />
          <h1 className="mb-3 text-4xl font-semibold">Round Saved</h1>
          <p className="mx-auto mb-8 max-w-xl text-black/60">
            Your round and hole-by-hole stats have been logged.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={resetRound} className="bg-[#1F4D3A] hover:bg-[#17392b]">
              Start New Round
            </Button>
            <Link href="/golf">
              <a className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3 font-semibold text-black transition hover:bg-black/5">
                View Round History
              </a>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream p-6 text-dark md:p-10">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Golf"
          title="Submit Round"
          description="Start with the round setup, then log each hole with the details that actually drive performance."
          tone="text-[#1F4D3A]"
        />

        {step === "setup" ? (
          <Card className="max-w-4xl p-8">
            <div className="mb-8 grid gap-4 md:grid-cols-2">
              <button
                onClick={() => setHolesPlayed(9)}
                className={`rounded-[2rem] border p-6 text-left transition ${
                  holesPlayed === 9
                    ? "border-[#1F4D3A] bg-[#1F4D3A] text-white"
                    : "border-[#1F4D3A]/10 bg-cream text-black"
                }`}
              >
                <p className="mb-2 text-sm opacity-70">Round Length</p>
                <h2 className="text-3xl font-semibold">9 Holes</h2>
              </button>

              <button
                onClick={() => setHolesPlayed(18)}
                className={`rounded-[2rem] border p-6 text-left transition ${
                  holesPlayed === 18
                    ? "border-[#1F4D3A] bg-[#1F4D3A] text-white"
                    : "border-[#1F4D3A]/10 bg-cream text-black"
                }`}
              >
                <p className="mb-2 text-sm opacity-70">Round Length</p>
                <h2 className="text-3xl font-semibold">18 Holes</h2>
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Course name" value={course} onChange={setCourse} />
              <Field label="Tees played" value={teeColour} onChange={setTeeColour} />
              <Field label="Date" value={date} onChange={setDate} type="date" />
              <label className="flex items-center gap-3 rounded-2xl border border-black/10 px-5 py-4">
                <input
                  type="checkbox"
                  checked={competition}
                  onChange={(event) => setCompetition(event.target.checked)}
                />
                <span className="font-medium">Competition round</span>
              </label>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-black/50">Round notes</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-black/10 px-5 py-4 outline-none focus:border-[#1F4D3A]"
                />
              </div>
            </div>

            <Button
              onClick={startRound}
              className="mt-8 bg-[#1F4D3A] hover:bg-[#17392b]"
            >
              <Flag className="h-4 w-4" />
              Start Hole Entry
            </Button>
          </Card>
        ) : (
          <>
            <section className="mb-8 grid gap-4 md:grid-cols-4 xl:grid-cols-8">
              <StatCard label="Score" value={stats.totalScore || "-"} tone="bg-white" />
              <StatCard label="To Par" value={formatToPar(stats.scoreToPar)} tone="bg-white" />
              <StatCard label="Holes" value={`${stats.holesCompleted}/${holesPlayed}`} tone="bg-white" />
              <StatCard label="Putts" value={stats.totalPutts || "-"} tone="bg-white" />
              <StatCard label="FIR" value={`${stats.fairwayPercent}%`} tone="bg-white" />
              <StatCard label="GIR" value={`${stats.girPercent}%`} tone="bg-white" />
              <StatCard label="Penalties" value={stats.penaltyShots} tone="bg-white" />
              <StatCard label="Bunkers" value={stats.greensideBunkerShots} tone="bg-white" />
            </section>

            {step === "review" && (
              <Card className="mb-6 border-[#1F4D3A]/20 bg-[#1F4D3A]/5">
                <h2 className="mb-2 text-2xl font-semibold text-[#1F4D3A]">
                  Review Before Saving
                </h2>
                <p className="text-black/60">
                  Check the summary and hole details below. If everything looks right,
                  save the round.
                </p>
              </Card>
            )}

            <div className="grid gap-4">
              {holes.map((hole, index) => {
                const holeScore =
                  hole.score === "" ? null : Number(hole.score) - hole.par;

                return (
                  <Card key={index} className="p-5">
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm text-[#1F4D3A]/70">Hole {index + 1}</p>
                        <h2 className="text-2xl font-semibold">
                          {hole.score ? formatToPar(holeScore ?? 0) : "Not scored"}
                        </h2>
                      </div>
                      {index === 8 && holesPlayed === 18 && (
                        <span className="rounded-full bg-[#1F4D3A]/10 px-4 py-2 text-sm font-medium text-[#1F4D3A]">
                          Turn after this hole
                        </span>
                      )}
                    </div>

                    <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
                      <SelectField
                        label="Par"
                        value={hole.par.toString()}
                        onChange={(value) => {
                          const nextPar = Number(value);
                          updateHole(index, "par", nextPar);
                          if (nextPar === 3) updateHole(index, "fairway", "na");
                        }}
                        options={["3", "4", "5"]}
                      />
                      <Field
                        label="Score"
                        type="number"
                        value={hole.score}
                        onChange={(value) => updateHole(index, "score", value)}
                      />
                      <SelectField
                        label="Fairway"
                        value={hole.fairway}
                        disabled={hole.par === 3}
                        onChange={(value) =>
                          updateHole(index, "fairway", value as FairwayResult)
                        }
                        options={["na", "hit", "left", "right", "miss"]}
                      />
                      <label className="flex items-center gap-3 rounded-2xl border border-black/10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={hole.gir}
                          onChange={(event) => updateHole(index, "gir", event.target.checked)}
                        />
                        <span className="text-sm font-medium">GIR</span>
                      </label>
                      <Field
                        label="Putts"
                        type="number"
                        value={hole.putts}
                        onChange={(value) => updateHole(index, "putts", value)}
                      />
                      <Field
                        label="Penalties"
                        type="number"
                        value={hole.penaltyShots}
                        onChange={(value) => updateHole(index, "penaltyShots", value)}
                      />
                      <Field
                        label="Chips"
                        type="number"
                        value={hole.chipShots}
                        onChange={(value) => updateHole(index, "chipShots", value)}
                      />
                      <Field
                        label="Bunkers"
                        type="number"
                        value={hole.greensideBunkerShots}
                        onChange={(value) =>
                          updateHole(index, "greensideBunkerShots", value)
                        }
                      />
                    </div>
                  </Card>
                );
              })}
            </div>

            {saveError && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-red-700">
                {saveError}
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button variant="secondary" onClick={() => setStep("setup")}>
                <ArrowLeft className="h-4 w-4" />
                Back To Setup
              </Button>
              <div className="flex flex-col gap-3 sm:flex-row">
                {step === "holes" ? (
                  <Button
                    onClick={() => setStep("review")}
                    className="bg-[#1F4D3A] hover:bg-[#17392b]"
                  >
                    Review Round
                  </Button>
                ) : (
                  <Button
                    onClick={finishRound}
                    disabled={saving}
                    className="bg-[#1F4D3A] hover:bg-[#17392b]"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Round"}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
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
        min={type === "number" ? 0 : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-[#1F4D3A]"
      />
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
      <label className="mb-2 block text-sm text-black/50">{label}</label>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 capitalize outline-none focus:border-[#1F4D3A] disabled:bg-black/5 disabled:text-black/35"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
