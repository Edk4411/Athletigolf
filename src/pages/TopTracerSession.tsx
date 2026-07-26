import { useEffect, useState } from "react";
import { Plus, Save, Target, Trash2 } from "lucide-react";
import { Button, EmptyState, FieldLabel, PageHeader, StatusPill, Surface, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";

type Mode = "warm_up" | "toptracer_30" | "toptracer_12" | "my_practice";

type ClubAverage = {
  club: string;
  avg_carry_yards: string;
  avg_total_yards: string;
  dispersion_yards: string;
  shots: string;
};

type ChallengeResult = {
  total_score: string;
  closest_to_pin_ft: string;
  longest_drive_yards: string;
  targets_hit: string;
  shots_taken: string;
  holes: string;
};

type StoredSession = {
  id: string;
  session_date: string;
  mode: Mode;
  notes: string | null;
  club_averages: ClubAverage[];
  challenge_result: ChallengeResult | null;
  created_at: string;
};

const modes: Array<{ value: Mode; label: string; blurb: string }> = [
  { value: "warm_up", label: "Warm-Up", blurb: "Quick pre-round warm-up. Log averages for the clubs you hit." },
  { value: "toptracer_30", label: "TopTracer 30", blurb: "30-shot challenge. Log your score and challenge stats." },
  { value: "toptracer_12", label: "TopTracer 12", blurb: "12-shot challenge. Log your score and challenge stats." },
  { value: "my_practice", label: "My Practice", blurb: "Full range session. Log averages for every club you used." },
];

const emptyClub: ClubAverage = { club: "", avg_carry_yards: "", avg_total_yards: "", dispersion_yards: "", shots: "" };
const emptyChallenge: ChallengeResult = {
  total_score: "", closest_to_pin_ft: "", longest_drive_yards: "",
  targets_hit: "", shots_taken: "", holes: "",
};

const showsClubAverages = (mode: Mode) => mode === "warm_up" || mode === "my_practice";
const showsChallenge = (mode: Mode) => mode === "toptracer_30" || mode === "toptracer_12";

export default function TopTracerSession() {
  const [mode, setMode] = useState<Mode>("my_practice");
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [clubs, setClubs] = useState<ClubAverage[]>([{ ...emptyClub }]);
  const [challenge, setChallenge] = useState<ChallengeResult>({ ...emptyChallenge });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSessions(); }, []);

  async function loadSessions() {
    setLoading(true);
    const { data } = await supabase
      .from("toptracer_sessions")
      .select("*")
      .order("session_date", { ascending: false })
      .limit(20);
    setSessions((data as StoredSession[]) || []);
    setLoading(false);
  }

  function updateClub(idx: number, field: keyof ClubAverage, value: string) {
    setClubs((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  }
  function addClub() { setClubs((prev) => [...prev, { ...emptyClub }]); }
  function removeClub(idx: number) { setClubs((prev) => prev.filter((_, i) => i !== idx)); }

  async function saveSession() {
    setSaving(true);
    setSaveMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaveMessage("You need to sign in first."); setSaving(false); return; }

    const cleanClubs = showsClubAverages(mode)
      ? clubs.filter((c) => c.club.trim()).map((c) => ({
          club: c.club.trim(),
          avg_carry_yards: c.avg_carry_yards || null,
          avg_total_yards: c.avg_total_yards || null,
          dispersion_yards: c.dispersion_yards || null,
          shots: c.shots || null,
        }))
      : [];

    const cleanChallenge = showsChallenge(mode)
      ? {
          total_score: challenge.total_score || null,
          closest_to_pin_ft: challenge.closest_to_pin_ft || null,
          longest_drive_yards: challenge.longest_drive_yards || null,
          targets_hit: challenge.targets_hit || null,
          shots_taken: challenge.shots_taken || null,
          holes: challenge.holes || null,
        }
      : null;

    const { error } = await supabase.from("toptracer_sessions").insert({
      user_id: user.id,
      session_date: sessionDate,
      mode,
      notes: notes.trim() || null,
      club_averages: cleanClubs,
      challenge_result: cleanChallenge,
    });

    setSaving(false);
    if (error) { setSaveMessage(error.message); return; }
    setSaveMessage("Session saved");
    setClubs([{ ...emptyClub }]);
    setChallenge({ ...emptyChallenge });
    setNotes("");
    await loadSessions();
    setTimeout(() => setSaveMessage(""), 2500);
  }

  const currentModeInfo = modes.find((m) => m.value === mode)!;

  return (
    <main className="min-h-screen bg-cream px-4 py-5 md:px-8 md:py-7">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          eyebrow="Range Tracking"
          title="TopTracer Session"
          description="Log range sessions - the mode you pick decides what gets tracked."
          tone="text-pulse"
        />

        <Surface className="mb-6">
          <FieldLabel>Session mode</FieldLabel>
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" data-testid="mode-selector">
            {modes.map((m) => (
              <button
                key={m.value}
                type="button"
                data-testid={`mode-${m.value}`}
                onClick={() => setMode(m.value)}
                className={`rounded-xl border p-3 text-left transition ${
                  mode === m.value ? "border-pulse bg-pulse/10 text-dark" : "border-line bg-white/70 hover:border-pulse/40"
                }`}
              >
                <p className="font-semibold text-dark">{m.label}</p>
                <p className="mt-1 text-xs text-muted">{m.blurb}</p>
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel>Session date</FieldLabel>
              <TextInput type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} data-testid="session-date" />
            </div>
            <div>
              <FieldLabel>Notes (optional)</FieldLabel>
              <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering" data-testid="session-notes" />
            </div>
          </div>

          {showsClubAverages(mode) && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <FieldLabel>Club averages</FieldLabel>
                <Button type="button" variant="secondary" onClick={addClub} data-testid="add-club">
                  <Plus className="h-4 w-4" /> Add club
                </Button>
              </div>
              <div className="space-y-3">
                {clubs.map((c, idx) => (
                  <div key={idx} className="grid gap-2 rounded-xl border border-line bg-white/70 p-3 sm:grid-cols-[1.2fr_1fr_1fr_1fr_0.8fr_auto]">
                    <TextInput value={c.club} onChange={(e) => updateClub(idx, "club", e.target.value)} placeholder="Club (e.g. 7 iron)" data-testid={`club-name-${idx}`} />
                    <TextInput value={c.avg_carry_yards} onChange={(e) => updateClub(idx, "avg_carry_yards", e.target.value)} placeholder="Avg carry (yd)" inputMode="decimal" />
                    <TextInput value={c.avg_total_yards} onChange={(e) => updateClub(idx, "avg_total_yards", e.target.value)} placeholder="Avg total (yd)" inputMode="decimal" />
                    <TextInput value={c.dispersion_yards} onChange={(e) => updateClub(idx, "dispersion_yards", e.target.value)} placeholder="Dispersion (yd)" inputMode="decimal" />
                    <TextInput value={c.shots} onChange={(e) => updateClub(idx, "shots", e.target.value)} placeholder="Shots" inputMode="numeric" />
                    <button type="button" onClick={() => removeClub(idx)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-line text-muted hover:border-danger hover:text-danger" aria-label="Remove club">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showsChallenge(mode) && (
            <div className="mt-6">
              <FieldLabel>{currentModeInfo.label} result</FieldLabel>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div><FieldLabel>Total score</FieldLabel><TextInput value={challenge.total_score} onChange={(e) => setChallenge({ ...challenge, total_score: e.target.value })} placeholder="e.g. 68" data-testid="challenge-score" /></div>
                <div><FieldLabel>Closest to pin (ft)</FieldLabel><TextInput value={challenge.closest_to_pin_ft} onChange={(e) => setChallenge({ ...challenge, closest_to_pin_ft: e.target.value })} placeholder="ft" /></div>
                <div><FieldLabel>Longest drive (yd)</FieldLabel><TextInput value={challenge.longest_drive_yards} onChange={(e) => setChallenge({ ...challenge, longest_drive_yards: e.target.value })} placeholder="yd" /></div>
                <div><FieldLabel>Targets hit</FieldLabel><TextInput value={challenge.targets_hit} onChange={(e) => setChallenge({ ...challenge, targets_hit: e.target.value })} placeholder="e.g. 7 / 12" /></div>
                <div><FieldLabel>Shots taken</FieldLabel><TextInput value={challenge.shots_taken} onChange={(e) => setChallenge({ ...challenge, shots_taken: e.target.value })} placeholder={mode === "toptracer_30" ? "30" : "12"} /></div>
                <div><FieldLabel>Holes (if applicable)</FieldLabel><TextInput value={challenge.holes} onChange={(e) => setChallenge({ ...challenge, holes: e.target.value })} placeholder="e.g. 9" /></div>
              </div>
            </div>
          )}

          {saveMessage && <p className="mt-4 text-sm font-semibold text-golf" data-testid="save-message">{saveMessage}</p>}
          <div className="mt-6 flex justify-end">
            <Button type="button" variant="pulse" onClick={saveSession} disabled={saving} data-testid="save-session">
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save session"}
            </Button>
          </div>
        </Surface>

        <PageHeader eyebrow="History" title="Recent sessions" tone="text-lab" />
        {loading ? (
          <p className="text-muted">Loading...</p>
        ) : sessions.length === 0 ? (
          <EmptyState title="No sessions yet" description="Save your first TopTracer or range session and it'll appear here." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {sessions.map((s) => (
              <Surface key={s.id} data-testid={`session-${s.id}`}>
                <div className="flex items-center justify-between">
                  <StatusPill tone="pulse">{modes.find((m) => m.value === s.mode)?.label || s.mode}</StatusPill>
                  <span className="text-xs text-muted">{s.session_date}</span>
                </div>
                {s.club_averages?.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {s.club_averages.map((c, i) => (
                      <p key={i} className="text-sm text-ink"><span className="font-semibold">{c.club}:</span> {c.avg_carry_yards ? `${c.avg_carry_yards}yd carry` : ""}{c.dispersion_yards ? ` / +/- ${c.dispersion_yards}yd` : ""}</p>
                    ))}
                  </div>
                )}
                {s.challenge_result && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                    {s.challenge_result.total_score && <span className="rounded-full bg-pulse/10 px-2 py-0.5 font-semibold text-pulse">Score {s.challenge_result.total_score}</span>}
                    {s.challenge_result.targets_hit && <span>Targets {s.challenge_result.targets_hit}</span>}
                    {s.challenge_result.longest_drive_yards && <span>Long drive {s.challenge_result.longest_drive_yards}yd</span>}
                  </div>
                )}
                {s.notes && <p className="mt-3 text-sm text-muted">{s.notes}</p>}
              </Surface>
            ))}
          </div>
        )}

        <p className="mt-6 text-xs text-muted"><Target className="mr-1 inline h-3 w-3" /> New modes can be added later - the storage is JSON-based so future migrations only need to add new mode options.</p>
      </div>
    </main>
  );
}
