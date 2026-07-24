import { useEffect, useMemo, useState } from "react";
import { Activity, Footprints, Route, ShieldCheck, Timer, Trash2 } from "lucide-react";
import { Button, FieldLabel, PageHeader, SelectInput, StatCard, Surface, TextArea, TextInput } from "@/components/ui";
import { todayIso } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import { useStrava } from "@/hooks/useStrava";
import type { CardioSession } from "@/lib/types";
import { isNativeApp, openExternalBrowser } from "@/lib/nativeApp";

type CardioForm = {
  activity_type: CardioSession["activity_type"];
  session_date: string;
  distance_km: string;
  duration_minutes: string;
  avg_heart_rate: string;
  calories: string;
  perceived_effort: string;
  route_name: string;
  notes: string;
};

const emptyForm: CardioForm = {
  activity_type: "run",
  session_date: todayIso(),
  distance_km: "",
  duration_minutes: "",
  avg_heart_rate: "",
  calories: "",
  perceived_effort: "",
  route_name: "",
  notes: "",
};

export default function Cardio() {
  const [sessions, setSessions] = useState<CardioSession[]>([]);
  const [form, setForm] = useState<CardioForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const { stravaConnection } = useStrava();

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    await loadSessions();
    setLoading(false);
  }

  async function loadSessions() {
    const { data, error: loadError } = await supabase
      .from("cardio_sessions")
      .select("*")
      .order("session_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30);

    if (loadError) {
      setError(loadError.message);
    } else {
      setSessions((data as CardioSession[]) || []);
    }
  }

  function update<K extends keyof CardioForm>(key: K, value: CardioForm[K]) {
    setError("");
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveSession(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      activity_type: form.activity_type,
      session_date: form.session_date,
      distance_km: parseNumber(form.distance_km) ?? 0,
      duration_minutes: parseInteger(form.duration_minutes) ?? 0,
      avg_heart_rate: parseInteger(form.avg_heart_rate),
      calories: parseInteger(form.calories),
      perceived_effort: parseInteger(form.perceived_effort),
      route_name: form.route_name.trim() || null,
      notes: form.notes.trim() || null,
      source: "manual",
    };

    const { error: saveError } = await supabase.from("cardio_sessions").insert(payload);
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setForm({ ...emptyForm, activity_type: form.activity_type });
    await loadSessions();
  }

  async function deleteSession(id: string) {
    setError("");
    const { error: deleteError } = await supabase.from("cardio_sessions").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setSessions((current) => current.filter((session) => session.id !== id));
  }

  const stats = useMemo(() => getCardioStats(sessions), [sessions]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-muted">
        Loading cardio...
      </div>
    );
  }

  function handleConnect() {
    openExternalBrowser("https://edk4411-athletigolf-q5hm.bolt.host/connected-apps");
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-5 text-ink md:px-8 md:py-7">
      <PageHeader
        eyebrow="Performance Lab"
        title="Cardio"
        description="Track running and walking volume, import private Strava runs/walks/hikes, and keep aerobic work visible."
        tone="text-lab"
      />

      <section className="mb-5 grid gap-4 md:grid-cols-4">
        <StatCard label="Private 7-day distance" value={`${formatNumber(stats.weekDistance)} km`} tone="bg-white" sub="manual + Strava" />
        <StatCard label="Private 7-day time" value={`${stats.weekMinutes} min`} tone="bg-white" sub="manual + Strava" />
        <StatCard label="Private avg pace" value={stats.averagePace || "-"} tone="bg-white" sub="manual + Strava" />
        <StatCard label="Private sessions" value={sessions.length} tone="bg-white" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <Surface>
            <div className="mb-5 flex items-start gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-lab/10 text-lab">
                <Footprints className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-lab">Log Cardio</p>
                <h2 className="text-xl font-semibold text-dark">Run or walk</h2>
              </div>
            </div>

            <form onSubmit={saveSession} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Activity</FieldLabel>
                  <SelectInput value={form.activity_type} onChange={(event) => update("activity_type", event.target.value as CardioSession["activity_type"])}>
                    <option value="run">Run</option>
                    <option value="walk">Walk</option>
                  </SelectInput>
                </div>
                <Field label="Date" type="date" value={form.session_date} onChange={(value) => update("session_date", value)} />
                <Field label="Distance (km)" type="number" value={form.distance_km} onChange={(value) => update("distance_km", value)} placeholder="5.0" />
                <Field label="Duration (minutes)" type="number" value={form.duration_minutes} onChange={(value) => update("duration_minutes", value)} placeholder="28" />
                <Field label="Avg heart rate" type="number" value={form.avg_heart_rate} onChange={(value) => update("avg_heart_rate", value)} placeholder="148" />
                <Field label="Calories" type="number" value={form.calories} onChange={(value) => update("calories", value)} placeholder="360" />
                <Field label="Effort (1-10)" type="number" value={form.perceived_effort} onChange={(value) => update("perceived_effort", value)} placeholder="6" />
                <Field label="Route" value={form.route_name} onChange={(value) => update("route_name", value)} placeholder="Park loop, treadmill..." />
              </div>

              <div>
                <FieldLabel>Notes</FieldLabel>
                <TextArea rows={3} value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Easy zone 2, intervals, legs heavy..." />
              </div>

              {error && <p className="rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm font-semibold text-danger">{error}</p>}

              <Button type="submit" variant="pulse" disabled={saving}>
                <Activity className="h-4 w-4" />
                {saving ? "Saving..." : "Save Cardio"}
              </Button>
            </form>
          </Surface>
        </div>
        <div className="space-y-5">
            <Surface>
                <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Recent Cardio</p>
                        <h2 className="text-xl font-semibold text-dark">Runs and walks</h2>
                    </div>
                </div>
            </Surface>
            
            <Surface>
                <div className="mb-5 flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pulse/10 text-pulse">
                        <Timer className="h-5 w-5" />
                    </span>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Integrations</p>
                        <h2 className="text-xl font-semibold text-dark">Strava</h2>
                    </div>
                </div>
                
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted">
                        {stravaConnection ? "Connected ✓" : "Not connected"}
                    </p>
                    {!stravaConnection && (
                        <Button variant="secondary" onClick={handleConnect}>
                            Manage in Connected Apps
                        </Button>
                    )}
                </div>
            </Surface>
        </div>
      </section>
    </main>
  );
}


function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <TextInput type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function getCardioStats(sessions: CardioSession[]) {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekSessions = sessions.filter((session) => new Date(session.session_date) >= weekAgo);
  const weekDistance = weekSessions.reduce((sum, session) => sum + (session.distance_km || 0), 0);
  const weekMinutes = weekSessions.reduce((sum, session) => sum + (session.duration_minutes || 0), 0);
  const totalDistance = sessions.reduce((sum, session) => sum + (session.distance_km || 0), 0);

  return {
    weekDistance,
    weekMinutes,
    totalDistance,
    averagePace: formatPace(weekDistance, weekMinutes),
  };
}

function formatPace(distance?: number | null, minutes?: number | null) {
  if (!distance || !minutes) return "-";
  const pace = minutes / distance;
  const wholeMinutes = Math.floor(pace);
  const seconds = Math.round((pace - wholeMinutes) * 60);
  return `${wholeMinutes}:${seconds.toString().padStart(2, "0")} /km`;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
