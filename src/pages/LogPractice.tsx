// Unified practice logger. Step 1: pick the practice type. Step 2: pick the
// data source (manual / TopTracer / Trackman / launch monitor / etc.).
// Step 3: mode-specific form. Everything saves to `practice_sessions`.

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, ChevronLeft, Circle, Flag, Monitor, Save, Sparkles, Target, Wind } from "lucide-react";
import { Button, FieldLabel, PageHeader, StatusPill, Surface, TextArea, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import PracticeModeForms from "@/components/PracticeModeForms";
import {
  PRACTICE_MODES, PRACTICE_SOURCES,
  type ClubAverage, type PracticeMetrics, type PracticeMode, type PracticeSource,
} from "@/lib/practiceTypes";

const iconFor: Record<PracticeMode, typeof Flag> = {
  on_course: Flag,
  driving_range: Target,
  short_game: Wind,
  putting: Circle,
  simulator: Monitor,
};

function parseParams() {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    initialMode: params.get("type") as PracticeMode | null,
    initialSource: params.get("source") as PracticeSource | null,
    initialSourceMode: params.get("source_mode") || undefined,
  };
}

export default function LogPractice() {
  const [, navigate] = useLocation();
  const { initialMode, initialSource, initialSourceMode } = parseParams();

  const [step, setStep] = useState<"type" | "source" | "details">(initialMode ? "source" : "type");
  const [mode, setMode] = useState<PracticeMode | null>(initialMode || null);
  const [source, setSource] = useState<PracticeSource>(initialSource || "manual");
  const [sourceMode, setSourceMode] = useState<string>(initialSourceMode || "");

  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [duration, setDuration] = useState("");
  const [location, setLocationText] = useState("");
  const [courseName, setCourseName] = useState("");
  const [handicap, setHandicap] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState("");

  const [clubAverages, setClubAverages] = useState<ClubAverage[]>([]);
  const [metrics, setMetrics] = useState<PracticeMetrics>({});

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  // Prefill handicap from profile once
  useEffect(() => {
    supabase
      .from("profiles")
      .select("golf_handicap")
      .maybeSingle()
      .then(({ data }) => {
        if (data && typeof (data as { golf_handicap?: number | null }).golf_handicap === "number") {
          setHandicap(String((data as { golf_handicap: number }).golf_handicap));
        }
      });
  }, []);

  async function save() {
    setSaving(true); setSaveError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !mode) { setSaveError("Missing user or mode"); setSaving(false); return; }

    const payload = {
      user_id: user.id,
      mode,
      source,
      source_mode: sourceMode || null,
      session_date: sessionDate,
      duration_minutes: duration ? parseInt(duration) : 0,
      location: location.trim() || null,
      course_name: courseName.trim() || null,
      handicap_at_session: handicap ? Number(handicap) : null,
      metrics,
      club_averages: clubAverages.filter((c) => c.club?.trim()),
      shots: [],
      notes: notes.trim() || null,
      rating: rating ? parseInt(rating) : null,
      // Fill legacy columns so the old PracticeHistory rendering still works.
      practice_type: PRACTICE_MODES.find((m) => m.value === mode)?.label || mode,
    };

    const { error } = await supabase.from("practice_sessions").insert(payload);
    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setSaved(true);
  }

  if (saved) {
    return (
      <main className="min-h-screen bg-cream px-4 py-10">
        <div className="mx-auto max-w-lg rounded-2xl border border-line bg-panel p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 h-1 w-16 rounded-full bg-pulse" />
          <h1 className="mb-3 text-3xl font-semibold text-dark">Practice logged</h1>
          <p className="mb-6 text-muted">Nice work - your session is saved and ready for AthletiAI to review.</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button variant="golf" onClick={() => { setSaved(false); setStep("type"); setMode(null); setMetrics({}); setClubAverages([]); }} data-testid="log-another">
              Log another
            </Button>
            <Button variant="primary" onClick={() => navigate("/golf/practice-history")} data-testid="view-history">
              View history
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-5 md:px-8 md:py-7" data-testid="log-practice-page">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => (step === "type" ? navigate("/golf") : setStep(step === "source" ? "type" : "source"))}
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted transition hover:text-dark"
          data-testid="back-btn"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <PageHeader
          eyebrow="Practice"
          title="Log a Practice Session"
          description="AthletiAI uses this data - the more precise the input, the smarter the insights."
          tone="text-golf"
        />

        <div className="mb-6 flex items-center gap-2 text-xs font-semibold" data-testid="step-indicator">
          <StepDot n={1} label="Type"    active={step === "type"}    done={step !== "type"} />
          <StepDot n={2} label="Source"  active={step === "source"}  done={step === "details"} />
          <StepDot n={3} label="Details" active={step === "details"} done={false} />
        </div>

        {step === "type" && (
          <Surface data-testid="type-step">
            <p className="text-lg font-semibold text-dark">What type of practice was this?</p>
            <p className="mt-1 text-sm text-muted">Pick one - it decides what we track.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PRACTICE_MODES.map((m) => {
                const Icon = iconFor[m.value];
                return (
                  <button
                    key={m.value}
                    type="button"
                    data-testid={`mode-${m.value}`}
                    onClick={() => { setMode(m.value); setStep("source"); }}
                    className={`group flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                      mode === m.value ? "border-golf bg-golf/10" : "border-line bg-white/70 hover:border-golf/40"
                    }`}
                  >
                    <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-golf/15 text-golf">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-base font-semibold text-dark">{m.label}</span>
                      <span className="mt-1 block text-xs text-muted">{m.blurb}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Surface>
        )}

        {step === "source" && mode && (
          <Surface data-testid="source-step">
            <div className="flex items-center gap-2">
              <StatusPill tone="golf">{PRACTICE_MODES.find((m) => m.value === mode)?.label}</StatusPill>
              <button type="button" onClick={() => setStep("type")} className="text-xs font-semibold text-muted hover:text-dark">Change</button>
            </div>
            <p className="mt-4 text-lg font-semibold text-dark">Where is the data coming from?</p>
            <p className="mt-1 text-sm text-muted">This lets us capture the right stats and, later, sync automatically.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" data-testid="source-list">
              {PRACTICE_SOURCES.map((src) => (
                <button
                  key={src.value}
                  type="button"
                  data-testid={`source-${src.value}`}
                  onClick={() => { setSource(src.value); setStep("details"); }}
                  className={`rounded-xl border p-3 text-left text-sm font-semibold transition ${
                    source === src.value ? "border-pulse bg-pulse/10 text-dark" : "border-line bg-white/70 text-muted hover:border-pulse/40"
                  }`}
                >
                  <span className="block text-dark">{src.label}</span>
                  {(src.value === "trackman" || src.value === "foresight" || src.value === "skytrak" || src.value === "toptracer") && (
                    <span className="mt-1 block text-[10px] font-medium uppercase tracking-wider text-golf">Auto-sync coming soon</span>
                  )}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button type="button" variant="pulse" onClick={() => setStep("details")}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Surface>
        )}

        {step === "details" && mode && (
          <div className="space-y-5" data-testid="details-step">
            <Surface>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <StatusPill tone="golf">{PRACTICE_MODES.find((m) => m.value === mode)?.label}</StatusPill>
                <StatusPill tone="pulse">{PRACTICE_SOURCES.find((s) => s.value === source)?.label}</StatusPill>
                <button type="button" onClick={() => setStep("source")} className="text-xs font-semibold text-muted hover:text-dark">Change source</button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <FieldLabel>Session date</FieldLabel>
                  <TextInput type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} data-testid="session-date" />
                </div>
                <div>
                  <FieldLabel>Duration (min)</FieldLabel>
                  <TextInput type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="45" />
                </div>
                <div>
                  <FieldLabel>{mode === "on_course" ? "Course" : "Location"}</FieldLabel>
                  <TextInput
                    value={mode === "on_course" ? courseName : location}
                    onChange={(e) => mode === "on_course" ? setCourseName(e.target.value) : setLocationText(e.target.value)}
                    placeholder={mode === "on_course" ? "e.g. Pine Hill GC" : "e.g. Topgolf, home range"}
                  />
                </div>
                <div>
                  <FieldLabel>Handicap at session</FieldLabel>
                  <TextInput type="number" step="0.1" value={handicap} onChange={(e) => setHandicap(e.target.value)} placeholder="e.g. 8.4" />
                </div>
              </div>
            </Surface>

            <Surface>
              <PracticeModeForms
                mode={mode}
                source={source}
                sourceMode={sourceMode}
                setSourceMode={setSourceMode}
                clubAverages={clubAverages}
                setClubAverages={setClubAverages}
                metrics={metrics}
                setMetrics={setMetrics}
              />
            </Surface>

            <Surface>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>Self rating (1-10)</FieldLabel>
                  <TextInput type="number" min="1" max="10" value={rating} onChange={(e) => setRating(e.target.value)} placeholder="7" />
                </div>
                <div>
                  <FieldLabel>Notes for AthletiAI</FieldLabel>
                  <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering - contact, feel, technique cues..." rows={3} />
                </div>
              </div>

              {saveError && <p className="mt-3 text-sm font-semibold text-danger" data-testid="save-error">{saveError}</p>}

              <div className="mt-5 flex flex-wrap justify-between gap-3">
                <Button type="button" variant="ghost" onClick={() => setStep("source")}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button type="button" variant="pulse" onClick={save} disabled={saving} data-testid="save-session">
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save session"}
                </Button>
              </div>

              <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
                <Sparkles className="h-3 w-3 text-pulse" /> AthletiAI reads mode + metrics + notes to generate insights.
              </p>
            </Surface>
          </div>
        )}
      </div>
    </main>
  );
}

function StepDot({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${active ? "bg-golf text-white" : done ? "bg-golf/15 text-golf" : "bg-line text-muted"}`}>
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/25 text-[10px] font-bold">{n}</span>
      {label}
    </span>
  );
}
