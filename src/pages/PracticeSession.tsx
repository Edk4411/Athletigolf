import { useState } from "react";
import { Link } from "wouter";
import { Button, FieldLabel, SelectInput, TextArea, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";

type PracticeType = "Driving Range" | "Putting" | "Chipping" | "Short Game" | "On Course";

const focusOptionsMap: Record<PracticeType, string[]> = {
  "Driving Range": ["Driver", "Woods", "Long Irons", "Mid Irons", "Wedges", "Shot Shape"],
  "Putting": ["Short Putts", "Lag Putting", "Green Reading", "Start Line", "Speed Control"],
  "Chipping": ["Bump and Run", "Standard Chip", "Flop Shot", "Contact", "Landing Spot"],
  "Short Game": ["Pitching", "Bunker Play", "Wedge Distance", "Up and Downs"],
  "On Course": ["Course Strategy", "Pre-shot Routine", "Scoring", "Shot Selection"],
};

export default function PracticeSession() {
  const [practiceType, setPracticeType] = useState<PracticeType>("Driving Range");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [focusArea, setFocusArea] = useState("");
  const [rating, setRating] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");

    const { error } = await supabase.from("practice_sessions").insert({
      practice_type: practiceType,
      duration_minutes: parseInt(durationMinutes) || 0,
      focus_area: focusArea,
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
