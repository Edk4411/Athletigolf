import { useState } from "react";
import { Link } from "wouter";
import { Button, FieldLabel, SelectInput, TextArea, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { PracticeDrill } from "@/lib/types";

type PracticeType = "Driving Range" | "Putting" | "Chipping" | "Short Game" | "On Course";
type PracticeDrillForm = {
  name: string;
  distance: string;
  attempts: string;
  successes: string;
};

const focusOptionsMap: Record<PracticeType, string[]> = {
  "Driving Range": ["Driver", "Woods", "Long Irons", "Mid Irons", "Wedges", "Shot Shape"],
  "Putting": ["Short Putts", "Lag Putting", "Green Reading", "Start Line", "Speed Control"],
  "Chipping": ["Bump and Run", "Standard Chip", "Flop Shot", "Contact", "Landing Spot"],
  "Short Game": ["Pitching", "Bunker Play", "Wedge Distance", "Up and Downs"],
  "On Course": ["Course Strategy", "Pre-shot Routine", "Scoring", "Shot Selection"],
};

const drillOptionsMap: Record<PracticeType, string[]> = {
  "Driving Range": ["Fairway Finder", "Start Line", "Target Greens", "Shot Shape Ladder"],
  "Putting": ["3ft Makes", "6ft Makes", "10ft Makes", "Lag Circle"],
  "Chipping": ["Up-and-Down Ladder", "Landing Spot", "One-Putt Conversion", "Contact Control"],
  "Short Game": ["Bunker Saves", "Wedge Ladder", "Pitch Proximity", "Random Lies"],
  "On Course": ["Penalty-Free Holes", "Conservative Targets", "Par Saves", "Routine Reps"],
};

export default function PracticeSession() {
  const [practiceType, setPracticeType] = useState<PracticeType>("Driving Range");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [focusArea, setFocusArea] = useState("");
  const [drills, setDrills] = useState<PracticeDrillForm[]>([]);
  const [rating, setRating] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    const cleanedDrills = drills
      .map(toPracticeDrill)
      .filter((drill) => drill.name || drill.distance || drill.attempts !== null || drill.successes !== null);
    const firstDrill = cleanedDrills[0];

    const { error } = await supabase.from("practice_sessions").insert({
      practice_type: practiceType,
      duration_minutes: parseInt(durationMinutes) || 0,
      focus_area: focusArea,
      drills: cleanedDrills,
      drill_name: firstDrill?.name || null,
      drill_attempts: firstDrill?.attempts ?? null,
      drill_successes: firstDrill?.successes ?? null,
      drill_distance: firstDrill?.distance || null,
      rating: parseInt(rating) || null,
      notes: notes || null,
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
      <div className="flex min-h-screen items-center justify-center bg-cream p-6 text-ink">
        <div className="w-full max-w-xl rounded-xl border border-line bg-panel p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 h-1 w-16 rounded-full bg-pulse" />
          <h1 className="mb-4 text-4xl font-semibold">Practice Logged</h1>
          <p className="mb-8 text-muted">Nice work. Your practice session has been saved.</p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/golf/practice"><a><Button variant="golf">Log Another</Button></a></Link>
            <Link href="/golf/practice-history"><a><Button variant="primary">View History</Button></a></Link>
          </div>
        </div>
      </div>
    );
  }

  const focusOptions = focusOptionsMap[practiceType];
  const drillOptions = drillOptionsMap[practiceType];

  const addDrill = () => {
    setDrills((prev) => [...prev, { name: "", distance: "", attempts: "", successes: "" }]);
  };

  const updateDrill = (index: number, key: keyof PracticeDrillForm, value: string) => {
    setDrills((prev) =>
      prev.map((drill, drillIndex) =>
        drillIndex === index ? { ...drill, [key]: value } : drill
      )
    );
  };

  const removeDrill = (index: number) => {
    setDrills((prev) => prev.filter((_, drillIndex) => drillIndex !== index));
  };

  return (
    <div className="min-h-screen bg-cream p-5 text-ink md:p-7">
      <div className="mx-auto max-w-4xl">
        <div className="mb-7 border-b border-line pb-6">
          <Link href="/dashboard">
            <button className="mb-4 text-sm font-medium text-muted transition hover:text-dark">
              Back to Dashboard
            </button>
          </Link>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-golf">Golf Practice</p>
          <h1 className="mb-3 text-4xl font-semibold tracking-tight text-dark">Log Practice</h1>
          <p className="text-muted">Track your range, putting, chipping and short game sessions.</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-line bg-panel p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <FieldLabel>Practice Type</FieldLabel>
              <SelectInput
                value={practiceType}
                onChange={(e) => {
                  setPracticeType(e.target.value as PracticeType);
                  setFocusArea("");
                  setDrills([]);
                }}
              >
                <option>Driving Range</option>
                <option>Putting</option>
                <option>Chipping</option>
                <option>Short Game</option>
                <option>On Course</option>
              </SelectInput>
            </div>

            <div>
              <FieldLabel>Duration (minutes)</FieldLabel>
              <TextInput
                type="number"
                min="1"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="e.g. 45"
                required
              />
            </div>

            <div>
              <FieldLabel>Focus Area</FieldLabel>
              <SelectInput value={focusArea} onChange={(e) => setFocusArea(e.target.value)} required>
                <option value="">Select focus</option>
                {focusOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </SelectInput>
            </div>

            <div>
              <FieldLabel>Session Rating</FieldLabel>
              <SelectInput value={rating} onChange={(e) => setRating(e.target.value)} required>
                <option value="">Rate session</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <option key={num} value={num}>{num}/10</option>
                ))}
              </SelectInput>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-line bg-white/55 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-golf">
                  Optional Drill Tracking
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-dark">
                  Add drills only if you did them
                </h2>
                <p className="mt-2 text-sm text-muted">
                  Practice can still be logged without a drill. Add one or more if you want the numbers.
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={addDrill}>
                {drills.length === 0 ? "+ Add drill" : "+ Add another drill"}
              </Button>
            </div>

            {drills.length > 0 && (
              <div className="mt-5 space-y-4">
                {drills.map((drill, index) => {
                  const rate = getDrillSuccessRate(drill);
                  return (
                    <div key={index} className="rounded-xl border border-line bg-panel p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-dark">Drill {index + 1}</p>
                          {rate !== null && (
                            <p className="text-sm text-golf">{rate}% success rate</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDrill(index)}
                          className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-steel/10 hover:text-dark"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <FieldLabel>Drill</FieldLabel>
                          <SelectInput
                            value={drill.name}
                            onChange={(e) => updateDrill(index, "name", e.target.value)}
                          >
                            <option value="">Select drill</option>
                            {drillOptions.map((option) => (
                              <option key={option}>{option}</option>
                            ))}
                          </SelectInput>
                        </div>

                        <div>
                          <FieldLabel>Distance / target</FieldLabel>
                          <TextInput
                            value={drill.distance}
                            onChange={(e) => updateDrill(index, "distance", e.target.value)}
                            placeholder="e.g. 6ft, 100yd, fairway target"
                          />
                        </div>

                        <div>
                          <FieldLabel>Attempts</FieldLabel>
                          <TextInput
                            type="number"
                            min="0"
                            value={drill.attempts}
                            onChange={(e) => updateDrill(index, "attempts", e.target.value)}
                            placeholder="e.g. 20"
                          />
                        </div>

                        <div>
                          <FieldLabel>Successes</FieldLabel>
                          <TextInput
                            type="number"
                            min="0"
                            value={drill.successes}
                            onChange={(e) => updateDrill(index, "successes", e.target.value)}
                            placeholder="e.g. 14"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6">
            <FieldLabel>Notes</FieldLabel>
            <TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What felt good? What needs work?"
              rows={5}
            />
          </div>

          {saveError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {saveError}
            </div>
          )}

          <Button type="submit" disabled={saving} variant="golf" className="mt-8 w-full">
            {saving ? "Saving..." : "Save Practice Session"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function toPracticeDrill(drill: PracticeDrillForm): PracticeDrill {
  return {
    name: drill.name.trim(),
    distance: drill.distance.trim() || null,
    attempts: drill.attempts === "" ? null : Number(drill.attempts),
    successes: drill.successes === "" ? null : Number(drill.successes),
  };
}

function getDrillSuccessRate(drill: PracticeDrillForm) {
  const attempts = Number(drill.attempts);
  if (!attempts || attempts <= 0 || drill.successes === "") return null;
  return Math.round((Number(drill.successes) / attempts) * 100);
}
