import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bike,
  Flame,
  Footprints,
  Heart,
  Mountain,
  RefreshCw,
  Route,
  Timer,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  FieldLabel,
  PageHeader,
  SelectInput,
  StatCard,
  Surface,
  TextArea,
  TextInput,
} from "@/components/ui";
import { todayIso } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import { useStrava } from "@/hooks/useStrava";
import type { CardioSession } from "@/lib/types";
import { isNativeApp, openExternalBrowser } from "@/lib/nativeApp";

type ActivityType = CardioSession["activity_type"];

type CardioForm = {
  activity_type: ActivityType;
  session_date: string;
  distance_km: string;
  duration_minutes: string;
  avg_heart_rate: string;
  calories: string;
  elevation_gain_meters: string;
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
  elevation_gain_meters: "",
  perceived_effort: "",
  route_name: "",
  notes: "",
};

const ACTIVITY_ICONS: Record<ActivityType, typeof Activity> = {
  run: Activity,
  walk: Footprints,
  hike: Mountain,
  cycle: Bike,
  other: Zap,
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  run: "Run",
  walk: "Walk",
  hike: "Hike",
  cycle: "Cycle",
  other: "Other",
};

const ACTIVITY_COLOURS: Record<ActivityType, string> = {
  run: "text-pulse bg-pulse/10",
  walk: "text-golf bg-golf/10",
  hike: "text-amber-600 bg-amber-50",
  cycle: "text-lab bg-lab/10",
  other: "text-muted bg-steel/8",
};

export default function Cardio() {
  const [sessions, setSessions] = useState<CardioSession[]>([]);
  const [form, setForm] = useState<CardioForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"log" | "history" | "analytics">("history");

  const { stravaConnection, loading: stravaLoading, disconnect, loadConnection } = useStrava();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadPage();
  }, []);

  async function handleSync() {
    setSyncing(true);
    setError("");
    const { error: syncError } = await supabase.functions.invoke("strava-import");
    if (syncError) {
      setError(syncError.message || "Strava sync failed.");
    } else {
      setSuccess("Activities synced from Strava!");
      await loadSessions();
      setTimeout(() => setSuccess(""), 4000);
    }
    setSyncing(false);
  }

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
      .limit(100);

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
      elevation_gain_meters: parseNumber(form.elevation_gain_meters),
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
    setSuccess("Session saved!");
    await loadSessions();
    setTimeout(() => setSuccess(""), 3000);
    setActiveTab("history");
  }

  async function deleteSession(id: string) {
    setError("");
    const { error: deleteError } = await supabase.from("cardio_sessions").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setSessions((current) => current.filter((session) => session.id !== id));
    setDeleteConfirm(null);
  }

  const stats = useMemo(() => getCardioStats(sessions), [sessions]);

  function handleConnect() {
    openExternalBrowser("https://edk4411-athletigolf-q5hm.bolt.host/connected-apps");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-muted">
        Loading activity data…
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-5 text-ink md:px-8 md:py-7">
      <PageHeader
        eyebrow="Performance Lab"
        title="Cardio"
        description="Log runs, walks, hikes and cycles. Import Strava activities. Track weekly mileage, pace trends and training load."
        tone="text-lab"
      />

      {/* Analytics strip */}
      <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="7-day distance"
          value={`${formatKm(stats.weekDistance)} km`}
          tone="bg-white"
          sub={`${stats.weekSessions} session${stats.weekSessions !== 1 ? "s" : ""}`}
        />
        <StatCard
          label="30-day distance"
          value={`${formatKm(stats.monthDistance)} km`}
          tone="bg-white"
          sub="rolling 30 days"
        />
        <StatCard
          label="Avg pace (7d)"
          value={stats.weekPace || "–"}
          tone="bg-white"
          sub="min/km"
        />
        <StatCard
          label="Training load (7d)"
          value={stats.weekLoad ? `${stats.weekLoad} min` : "–"}
          tone="bg-white"
          sub="active minutes"
        />
      </section>

      {/* Strava bar */}
      <StravaBar
        stravaConnection={stravaConnection}
        stravaLoading={stravaLoading}
        syncing={syncing}
        success={success}
        onSync={handleSync}
        onConnect={handleConnect}
        onDisconnect={disconnect}
        onRefresh={() => { loadConnection(); loadSessions(); }}
      />

      {/* Tab nav */}
      <div className="mb-5 flex gap-2 border-b border-line">
        {(["history", "log", "analytics"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-semibold capitalize transition ${
              activeTab === tab
                ? "border-b-2 border-lab text-lab"
                : "text-muted hover:text-ink"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
          {error}
        </div>
      )}

      {activeTab === "history" && (
        <SessionHistory
          sessions={sessions}
          deleteConfirm={deleteConfirm}
          onDeleteRequest={setDeleteConfirm}
          onDeleteConfirm={deleteSession}
          onDeleteCancel={() => setDeleteConfirm(null)}
        />
      )}

      {activeTab === "log" && (
        <Surface className="max-w-2xl">
          <div className="mb-5 flex items-start gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-lab/10 text-lab">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-lab">Log Activity</p>
              <h2 className="text-xl font-semibold text-dark">Add session</h2>
            </div>
          </div>

          <form onSubmit={saveSession} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Activity type</FieldLabel>
                <SelectInput
                  value={form.activity_type}
                  onChange={(e) => update("activity_type", e.target.value as ActivityType)}
                >
                  <option value="run">Run</option>
                  <option value="walk">Walk</option>
                  <option value="hike">Hike</option>
                  <option value="cycle">Cycle</option>
                  <option value="other">Other</option>
                </SelectInput>
              </div>
              <FormField label="Date" type="date" value={form.session_date} onChange={(v) => update("session_date", v)} />
              <FormField label="Distance (km)" type="number" value={form.distance_km} onChange={(v) => update("distance_km", v)} placeholder="5.0" />
              <FormField label="Duration (min)" type="number" value={form.duration_minutes} onChange={(v) => update("duration_minutes", v)} placeholder="28" />
              <FormField label="Avg heart rate" type="number" value={form.avg_heart_rate} onChange={(v) => update("avg_heart_rate", v)} placeholder="148" />
              <FormField label="Calories" type="number" value={form.calories} onChange={(v) => update("calories", v)} placeholder="360" />
              <FormField label="Elevation gain (m)" type="number" value={form.elevation_gain_meters} onChange={(v) => update("elevation_gain_meters", v)} placeholder="120" />
              <FormField label="Effort (1–10)" type="number" value={form.perceived_effort} onChange={(v) => update("perceived_effort", v)} placeholder="6" />
              <FormField label="Route / location" value={form.route_name} onChange={(v) => update("route_name", v)} placeholder="Park loop, treadmill…" />
            </div>

            <div>
              <FieldLabel>Notes</FieldLabel>
              <TextArea
                rows={3}
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Easy zone 2, intervals, legs heavy…"
              />
            </div>

            {success && (
              <p className="rounded-lg border border-golf/25 bg-golf/10 px-3 py-2 text-sm font-semibold text-golf">
                {success}
              </p>
            )}

            <Button type="submit" variant="gym" disabled={saving}>
              <Activity className="h-4 w-4" />
              {saving ? "Saving…" : "Save Session"}
            </Button>
          </form>
        </Surface>
      )}

      {activeTab === "analytics" && (
        <AnalyticsPanel sessions={sessions} stats={stats} />
      )}
    </main>
  );
}

// ─── Strava bar ──────────────────────────────────────────────────────────────

function StravaBar({
  stravaConnection,
  stravaLoading,
  syncing,
  success,
  onSync,
  onConnect,
  onDisconnect,
  onRefresh,
}: {
  stravaConnection: { athlete_name: string | null; last_imported_at: string | null } | null;
  stravaLoading: boolean;
  syncing: boolean;
  success: string;
  onSync: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
}) {
  return (
    <Surface className="mb-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#FC4C02]/10 text-[#FC4C02]">
            <Timer className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Integrations</p>
            <h2 className="font-semibold text-dark">
              Strava{stravaConnection?.athlete_name ? ` — ${stravaConnection.athlete_name}` : ""}
            </h2>
            {stravaConnection?.last_imported_at && (
              <p className="text-xs text-muted">
                Last synced {new Date(stravaConnection.last_imported_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {stravaConnection ? (
            <>
              <Button variant="secondary" onClick={onSync} disabled={syncing}>
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing…" : "Sync Activities"}
              </Button>
              <Button variant="secondary" onClick={onRefresh} disabled={stravaLoading}>
                Refresh
              </Button>
              <Button variant="secondary" onClick={onDisconnect}>
                Disconnect
              </Button>
            </>
          ) : (
            <Button variant="secondary" onClick={onConnect}>
              Connect Strava
            </Button>
          )}
        </div>
      </div>
      {success && (
        <p className="mt-3 text-sm font-semibold text-golf">{success}</p>
      )}
      {!stravaConnection && !stravaLoading && (
        <p className="mt-3 text-sm text-muted">
          Connect Strava to automatically import runs, walks, hikes and cycles. Activities are private and never shared.
        </p>
      )}
    </Surface>
  );
}

// ─── Session history ──────────────────────────────────────────────────────────

function SessionHistory({
  sessions,
  deleteConfirm,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  sessions: CardioSession[];
  deleteConfirm: string | null;
  onDeleteRequest: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  onDeleteCancel: () => void;
}) {
  if (!sessions.length) {
    return (
      <EmptyState
        title="No activities yet"
        description="Log your first run, walk, hike or cycle, or connect Strava to import your history."
      />
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          confirmingDelete={deleteConfirm === session.id}
          onDeleteRequest={() => onDeleteRequest(session.id)}
          onDeleteConfirm={() => onDeleteConfirm(session.id)}
          onDeleteCancel={onDeleteCancel}
        />
      ))}
    </div>
  );
}

function SessionCard({
  session,
  confirmingDelete,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  session: CardioSession;
  confirmingDelete: boolean;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  const activityType = (session.activity_type ?? "run") as CardioSession["activity_type"];
  const Icon = ACTIVITY_ICONS[activityType] ?? Activity;
  const colour = ACTIVITY_COLOURS[activityType] ?? ACTIVITY_COLOURS.other;
  const label = ACTIVITY_LABELS[activityType] ?? activityType;

  const pace = formatPace(session.distance_km, session.duration_minutes);
  const date = new Date(session.session_date).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${colour}`}>
          <Icon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-dark">
                {session.route_name || label}
              </p>
              <p className="text-xs text-muted">{date} · {label}</p>
            </div>
            <div className="flex gap-2">
              {session.source === "strava" && (
                <span className="rounded-full bg-[#FC4C02]/10 px-2.5 py-1 text-xs font-bold text-[#FC4C02]">
                  Strava
                </span>
              )}
              {!confirmingDelete ? (
                <button
                  type="button"
                  onClick={onDeleteRequest}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-danger/10 hover:text-danger"
                  aria-label="Delete session"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={onDeleteConfirm}
                    className="rounded-lg bg-danger px-3 py-1 text-xs font-bold text-white"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={onDeleteCancel}
                    className="rounded-lg border border-line bg-panel px-3 py-1 text-xs font-bold text-muted"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 md:grid-cols-5">
            {session.distance_km != null && session.distance_km > 0 && (
              <Metric icon={<Route className="h-3.5 w-3.5" />} label="Distance" value={`${formatKm(session.distance_km)} km`} />
            )}
            {session.duration_minutes != null && session.duration_minutes > 0 && (
              <Metric icon={<Timer className="h-3.5 w-3.5" />} label="Duration" value={formatDuration(session.duration_minutes)} />
            )}
            {pace && (
              <Metric icon={<TrendingUp className="h-3.5 w-3.5" />} label="Pace" value={pace} />
            )}
            {session.avg_heart_rate != null && (
              <Metric icon={<Heart className="h-3.5 w-3.5" />} label="Avg HR" value={`${session.avg_heart_rate} bpm`} />
            )}
            {session.calories != null && session.calories > 0 && (
              <Metric icon={<Flame className="h-3.5 w-3.5" />} label="Calories" value={`${session.calories} kcal`} />
            )}
            {session.elevation_gain_meters != null && session.elevation_gain_meters > 0 && (
              <Metric icon={<Mountain className="h-3.5 w-3.5" />} label="Elevation" value={`${session.elevation_gain_meters} m`} />
            )}
          </div>

          {session.notes && (
            <p className="mt-3 rounded-lg bg-steel/5 px-3 py-2 text-sm text-muted">{session.notes}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted">{icon}</span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
        <p className="text-sm font-semibold text-dark">{value}</p>
      </div>
    </div>
  );
}

// ─── Analytics panel ──────────────────────────────────────────────────────────

function AnalyticsPanel({ sessions, stats }: { sessions: CardioSession[]; stats: ReturnType<typeof getCardioStats> }) {
  // Weekly distance chart data (last 8 weeks)
  const weeklyData = useMemo(() => buildWeeklyData(sessions), [sessions]);
  const maxWeeklyKm = Math.max(...weeklyData.map((w) => w.km), 0.1);

  // HR distribution
  const hrBuckets = useMemo(() => buildHrBuckets(sessions), [sessions]);

  // Activity type breakdown
  const activityBreakdown = useMemo(() => buildActivityBreakdown(sessions), [sessions]);

  return (
    <div className="space-y-5">
      {/* Monthly + weekly summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Total sessions" value={sessions.length.toString()} sub="all time" />
        <MetricCard title="Total distance" value={`${formatKm(stats.totalDistance)} km`} sub="all time" />
        <MetricCard title="Monthly (30d)" value={`${formatKm(stats.monthDistance)} km`} sub={`${stats.monthSessions} sessions`} />
        <MetricCard title="Avg session" value={stats.avgSessionKm ? `${formatKm(stats.avgSessionKm)} km` : "–"} sub="distance" />
      </div>

      {/* Weekly distance bar chart */}
      <Card>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-muted">Weekly Distance (last 8 weeks)</h3>
        <div className="flex h-32 items-end gap-1">
          {weeklyData.map((week) => (
            <div key={week.label} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[9px] text-muted">{week.km > 0 ? `${formatKm(week.km)}` : ""}</span>
              <div
                className="w-full rounded-t-lg bg-lab/70 transition-all"
                style={{ height: `${(week.km / maxWeeklyKm) * 100}%`, minHeight: week.km > 0 ? "4px" : "0" }}
              />
              <span className="text-[9px] font-semibold text-muted">{week.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Activity breakdown */}
      {activityBreakdown.length > 0 && (
        <Card>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-muted">Activity Breakdown</h3>
          <div className="space-y-3">
            {activityBreakdown.map((row) => {
              const Icon = ACTIVITY_ICONS[row.type as ActivityType] ?? Activity;
              const colour = ACTIVITY_COLOURS[row.type as ActivityType] ?? ACTIVITY_COLOURS.other;
              return (
                <div key={row.type} className="flex items-center gap-3">
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${colour}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold capitalize text-dark">{ACTIVITY_LABELS[row.type as ActivityType] ?? row.type}</span>
                      <span className="text-sm text-muted">{row.count} session{row.count !== 1 ? "s" : ""} · {formatKm(row.km)} km</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-steel/10">
                      <div
                        className="h-full rounded-full bg-lab/60"
                        style={{ width: `${(row.count / sessions.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* HR trends */}
      {hrBuckets.total > 0 && (
        <Card>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-muted">Heart Rate Zones (recorded sessions)</h3>
          <div className="grid gap-2">
            {[
              { label: "Recovery (<120)", key: "recovery", colour: "bg-golf" },
              { label: "Aerobic (120–149)", key: "aerobic", colour: "bg-lab" },
              { label: "Tempo (150–169)", key: "tempo", colour: "bg-gold" },
              { label: "Threshold (170+)", key: "threshold", colour: "bg-pulse" },
            ].map(({ label, key, colour }) => {
              const count = hrBuckets[key as keyof typeof hrBuckets] as number;
              const pct = hrBuckets.total > 0 ? Math.round((count / hrBuckets.total) * 100) : 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 text-xs text-muted">{label}</span>
                  <div className="flex-1 rounded-full bg-steel/10">
                    <div className={`h-2 rounded-full ${colour}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-10 text-right text-xs font-semibold text-dark">{pct}%</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">Based on {hrBuckets.total} session{hrBuckets.total !== 1 ? "s" : ""} with recorded heart rate.</p>
        </Card>
      )}

      {sessions.length === 0 && (
        <EmptyState
          title="No data yet"
          description="Log activities or sync Strava to see analytics here."
        />
      )}
    </div>
  );
}

function MetricCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-dark">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </Card>
  );
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

function FormField({
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
      <TextInput
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

// ─── Stats calculation ────────────────────────────────────────────────────────

function getCardioStats(sessions: CardioSession[]) {
  const now = Date.now();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const weekSessions = sessions.filter((s) => new Date(s.session_date) >= weekAgo);
  const monthSessions = sessions.filter((s) => new Date(s.session_date) >= monthAgo);

  const weekDistance = weekSessions.reduce((sum, s) => sum + (s.distance_km || 0), 0);
  const weekMinutes = weekSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const monthDistance = monthSessions.reduce((sum, s) => sum + (s.distance_km || 0), 0);
  const totalDistance = sessions.reduce((sum, s) => sum + (s.distance_km || 0), 0);
  const avgSessionKm = sessions.length > 0 ? totalDistance / sessions.length : 0;

  return {
    weekSessions: weekSessions.length,
    monthSessions: monthSessions.length,
    weekDistance,
    weekMinutes,
    weekLoad: weekMinutes,
    weekPace: formatPace(weekDistance, weekMinutes),
    monthDistance,
    totalDistance,
    avgSessionKm,
  };
}

function buildWeeklyData(sessions: CardioSession[]) {
  const weeks: { label: string; km: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const start = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
    const km = sessions
      .filter((s) => {
        const d = new Date(s.session_date);
        return d >= start && d < end;
      })
      .reduce((sum, s) => sum + (s.distance_km || 0), 0);
    const label = start.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
    weeks.push({ label, km });
  }
  return weeks;
}

function buildHrBuckets(sessions: CardioSession[]) {
  const withHr = sessions.filter((s) => s.avg_heart_rate != null);
  let recovery = 0, aerobic = 0, tempo = 0, threshold = 0;
  withHr.forEach((s) => {
    const hr = s.avg_heart_rate!;
    if (hr < 120) recovery++;
    else if (hr < 150) aerobic++;
    else if (hr < 170) tempo++;
    else threshold++;
  });
  return { recovery, aerobic, tempo, threshold, total: withHr.length };
}

function buildActivityBreakdown(sessions: CardioSession[]) {
  const map = new Map<string, { count: number; km: number }>();
  sessions.forEach((s) => {
    const type = s.activity_type || "other";
    const existing = map.get(type) || { count: 0, km: 0 };
    map.set(type, { count: existing.count + 1, km: existing.km + (s.distance_km || 0) });
  });
  return Array.from(map.entries())
    .map(([type, data]) => ({ type, ...data }))
    .sort((a, b) => b.count - a.count);
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatKm(value: number) {
  if (!value) return "0";
  return value >= 10 ? value.toFixed(0) : value.toFixed(1);
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m > 0 ? `${m}m` : ""}`.trim();
}

function formatPace(distance?: number | null, minutes?: number | null) {
  if (!distance || !minutes || distance < 0.1) return null;
  const pace = minutes / distance;
  const whole = Math.floor(pace);
  const secs = Math.round((pace - whole) * 60);
  return `${whole}:${secs.toString().padStart(2, "0")} /km`;
}

function parseNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseInteger(value: string) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}
