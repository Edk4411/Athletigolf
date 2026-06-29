import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Edit3, Plus, Trash2, X } from "lucide-react";
import { Button, Card, PageHeader, StatCard } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { PracticeDrill, PracticeSession } from "@/lib/types";

type PracticeType = "Driving Range" | "Putting" | "Chipping" | "Short Game" | "On Course";
type PracticeDrillForm = {
  name: string;
  distance: string;
  attempts: string;
  successes: string;
};

const practiceTypes: PracticeType[] = [
  "Driving Range",
  "Putting",
  "Chipping",
  "Short Game",
  "On Course",
];

const blankDrill = (): PracticeDrillForm => ({
  name: "",
  distance: "",
  attempts: "",
  successes: "",
});

export default function PracticeHistory() {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingSession, setEditingSession] = useState<PracticeSession | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    practice_type: "Driving Range" as PracticeType,
    duration_minutes: "",
    focus_area: "",
    drills: [] as PracticeDrillForm[],
    rating: "",
    notes: "",
  });

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setLoading(true);
    const { data, error } = await supabase
      .from("practice_sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) setError(error.message);
    else setSessions((data as PracticeSession[]) ?? []);
    setLoading(false);
  }

  const openEditor = (session: PracticeSession) => {
    setError("");
    setEditingSession(session);
    setEditForm({
      practice_type: toPracticeType(session.practice_type),
      duration_minutes: session.duration_minutes?.toString() || "",
      focus_area: session.focus_area || "",
      drills: normalisePracticeDrills(session).map(toPracticeDrillForm),
      rating: session.rating?.toString() || "",
      notes: session.notes || "",
    });
  };

  const saveSession = async () => {
    if (!editingSession) return;

    setSaving(true);
    setError("");
    const cleanedDrills = editForm.drills
      .map(toPracticeDrill)
      .filter((drill) => drill.name || drill.distance || drill.attempts !== null || drill.successes !== null);
    const firstDrill = cleanedDrills[0];

    const { error } = await supabase
      .from("practice_sessions")
      .update({
        practice_type: editForm.practice_type,
        duration_minutes: Number(editForm.duration_minutes || 0),
        focus_area: editForm.focus_area || null,
        drills: cleanedDrills,
        drill_name: firstDrill?.name || null,
        drill_attempts: firstDrill?.attempts ?? null,
        drill_successes: firstDrill?.successes ?? null,
        drill_distance: firstDrill?.distance || null,
        rating: editForm.rating ? Number(editForm.rating) : null,
        notes: editForm.notes || null,
      })
      .eq("id", editingSession.id);

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setEditingSession(null);
    await loadSessions();
  };

  const deleteSession = async (session: PracticeSession) => {
    const confirmed = window.confirm(
      `Delete this ${session.practice_type} session? This cannot be undone.`
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("practice_sessions")
      .delete()
      .eq("id", session.id);

    if (error) {
      setError(error.message);
      return;
    }

    setEditingSession(null);
    setSessions((prev) => prev.filter((s) => s.id !== session.id));
  };

  const totalSessions = sessions.length;
  const puttingSessions = sessions.filter((s) => s.practice_type === "Putting").length;
  const rangeSessions = sessions.filter((s) => s.practice_type === "Driving Range").length;
  const shortGameSessions = sessions.filter(
    (s) => s.practice_type === "Chipping" || s.practice_type === "Short Game"
  ).length;
  const drillSessions = sessions.filter((s) => normalisePracticeDrills(s).length > 0).length;

  const addEditDrill = () => {
    setEditForm((prev) => ({ ...prev, drills: [...prev.drills, blankDrill()] }));
  };

  const updateEditDrill = (index: number, key: keyof PracticeDrillForm, value: string) => {
    setEditForm((prev) => ({
      ...prev,
      drills: prev.drills.map((drill, drillIndex) =>
        drillIndex === index ? { ...drill, [key]: value } : drill
      ),
    }));
  };

  const removeEditDrill = (index: number) => {
    setEditForm((prev) => ({
      ...prev,
      drills: prev.drills.filter((_, drillIndex) => drillIndex !== index),
    }));
  };

  return (
    <div className="min-h-screen bg-cream p-6 text-ink">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <PageHeader
            eyebrow="Golf Practice"
            title="Practice History"
            description="See your recent golf practice, edit sessions and keep the log accurate."
            tone="text-golf"
          />

          <Link href="/golf/practice">
            <a className="inline-flex items-center justify-center rounded-2xl bg-golf px-6 py-3 font-medium text-white transition hover:bg-golf/90">
              <Plus className="mr-2 h-4 w-4" />
              Log Practice
            </a>
          </Link>
        </div>

        <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Total Sessions" value={totalSessions} tone="bg-white" />
          <StatCard label="Putting" value={puttingSessions} tone="bg-white" />
          <StatCard label="Range" value={rangeSessions} tone="bg-white" />
          <StatCard label="Short Game" value={shortGameSessions} tone="bg-white" />
          <StatCard label="Drills" value={drillSessions} tone="bg-white" />
        </section>

        {loading ? (
          <Card className="p-10 text-center">
            <p className="text-black/50">Loading sessions...</p>
          </Card>
        ) : error ? (
          <Card className="border-red-100 p-10 text-center">
            <p className="text-red-600">{error}</p>
          </Card>
        ) : sessions.length === 0 ? (
          <Card className="p-10 text-center">
            <h2 className="mb-3 text-3xl font-semibold">No practice sessions yet</h2>
            <p className="mb-6 text-black/60">
              Log your first session to start building your practice history.
            </p>

            <Link href="/golf/practice">
            <a className="inline-flex items-center justify-center rounded-2xl bg-golf px-6 py-3 font-medium text-white transition hover:bg-golf/90">
                Log Practice
              </a>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-5">
            {sessions.map((session) => {
              const sessionDrills = normalisePracticeDrills(session);
              return (
              <Card
                key={session.id}
                className="transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="mb-2 text-sm text-black/50">
                      {new Date(session.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <h2 className="mb-2 text-3xl font-semibold">
                      {session.practice_type}
                    </h2>
                    {session.focus_area && (
                      <p className="text-black/60">Focus: {session.focus_area}</p>
                    )}
                  </div>

                  <div className="grid min-w-[260px] grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-cream p-4">
                      <p className="text-sm text-black/50">Duration</p>
                      <p className="text-xl font-semibold">
                        {session.duration_minutes} min
                      </p>
                    </div>

                    <div className="rounded-2xl bg-cream p-4">
                      <p className="text-sm text-black/50">Rating</p>
                      <p className="text-xl font-semibold">
                        {session.rating ? `${session.rating}/10` : "-"}
                      </p>
                    </div>
                  </div>

                  <Button variant="secondary" onClick={() => openEditor(session)}>
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </Button>
                </div>

                {sessionDrills.length > 0 && (
                  <div className="mt-5 space-y-3 rounded-2xl border border-line bg-cream p-4">
                    <p className="text-sm font-semibold text-dark">
                      {sessionDrills.length === 1 ? "Drill" : `${sessionDrills.length} drills`}
                    </p>
                    {sessionDrills.map((drill, index) => (
                      <div key={`${drill.name}-${index}`} className="grid gap-4 rounded-xl border border-line bg-panel p-4 md:grid-cols-4">
                        <div>
                          <p className="text-sm text-black/50">Drill</p>
                          <p className="font-semibold">{drill.name || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-black/50">Target</p>
                          <p className="font-semibold">{drill.distance || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-black/50">Score</p>
                          <p className="font-semibold">
                            {drill.successes ?? "-"}/{drill.attempts ?? "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-black/50">Success</p>
                          <p className="font-semibold">{formatDrillRate(drill)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {session.notes && (
                  <div className="mt-5 rounded-2xl bg-cream p-4">
                    <p className="mb-1 text-sm text-black/50">Notes</p>
                    <p className="text-muted">{session.notes}</p>
                  </div>
                )}
              </Card>
              );
            })}
          </div>
        )}
      </div>

      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <button
            onClick={() => setEditingSession(null)}
            className="absolute inset-0 bg-black/50"
            aria-label="Close practice editor"
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm uppercase tracking-[0.25em] text-golf/70">
                  Edit Practice
                </p>
                <h2 className="text-4xl font-semibold text-golf">
                  {editForm.practice_type}
                </h2>
              </div>
              <button
                onClick={() => setEditingSession(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-muted transition hover:bg-steel/10 hover:text-dark"
                aria-label="Close practice editor"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-black/50">Practice Type</label>
                <select
                  value={editForm.practice_type}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      practice_type: event.target.value as PracticeType,
                    }))
                  }
                  className="w-full rounded-2xl border border-line bg-white px-5 py-4 outline-none focus:border-golf"
                >
                  {practiceTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>

              <Field
                label="Duration"
                type="number"
                value={editForm.duration_minutes}
                onChange={(value) =>
                  setEditForm((prev) => ({ ...prev, duration_minutes: value }))
                }
              />
              <Field
                label="Focus Area"
                value={editForm.focus_area}
                onChange={(value) => setEditForm((prev) => ({ ...prev, focus_area: value }))}
              />
              <Field
                label="Rating"
                type="number"
                value={editForm.rating}
                onChange={(value) => setEditForm((prev) => ({ ...prev, rating: value }))}
              />
              <div className="md:col-span-2">
                <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-line bg-cream p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-dark">Drills</p>
                    <p className="text-sm text-muted">Add drills only if this practice session included them.</p>
                  </div>
                  <Button type="button" variant="secondary" onClick={addEditDrill}>
                    {editForm.drills.length === 0 ? "+ Add drill" : "+ Add another drill"}
                  </Button>
                </div>

                {editForm.drills.length > 0 && (
                  <div className="space-y-3">
                    {editForm.drills.map((drill, index) => (
                      <div key={index} className="rounded-2xl border border-line bg-panel p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-dark">Drill {index + 1}</p>
                            <p className="text-sm text-golf">{formatDrillRate(toPracticeDrill(drill))}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEditDrill(index)}
                            className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-steel/10 hover:text-dark"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <Field
                            label="Drill"
                            value={drill.name}
                            onChange={(value) => updateEditDrill(index, "name", value)}
                          />
                          <Field
                            label="Distance / target"
                            value={drill.distance}
                            onChange={(value) => updateEditDrill(index, "distance", value)}
                          />
                          <Field
                            label="Attempts"
                            type="number"
                            value={drill.attempts}
                            onChange={(value) => updateEditDrill(index, "attempts", value)}
                          />
                          <Field
                            label="Successes"
                            type="number"
                            value={drill.successes}
                            onChange={(value) => updateEditDrill(index, "successes", value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm text-black/50">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  rows={5}
                  className="w-full rounded-2xl border border-line px-5 py-4 outline-none focus:border-golf"
                />
              </div>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button variant="danger" onClick={() => deleteSession(editingSession)}>
                <Trash2 className="h-4 w-4" />
                Delete Session
              </Button>
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button variant="secondary" onClick={() => setEditingSession(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={saveSession}
                  disabled={saving}
                  className="bg-golf hover:bg-golf/90"
                >
                  {saving ? "Saving..." : "Save Session"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
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
        className="w-full rounded-2xl border border-line px-5 py-4 outline-none focus:border-golf"
      />
    </div>
  );
}

function formatDrillRate(drill: PracticeDrill) {
  if (!drill.attempts || drill.attempts <= 0 || drill.successes === null || drill.successes === undefined) {
    return "-";
  }
  return `${Math.round((drill.successes / drill.attempts) * 100)}%`;
}

function normalisePracticeDrills(session: PracticeSession): PracticeDrill[] {
  if (Array.isArray(session.drills) && session.drills.length > 0) {
    return session.drills;
  }
  if (!session.drill_name && !session.drill_distance && !session.drill_attempts && !session.drill_successes) {
    return [];
  }
  return [
    {
      name: session.drill_name || "",
      distance: session.drill_distance || null,
      attempts: session.drill_attempts ?? null,
      successes: session.drill_successes ?? null,
    },
  ];
}

function toPracticeDrillForm(drill: PracticeDrill): PracticeDrillForm {
  return {
    name: drill.name || "",
    distance: drill.distance || "",
    attempts: drill.attempts?.toString() || "",
    successes: drill.successes?.toString() || "",
  };
}

function toPracticeDrill(drill: PracticeDrillForm): PracticeDrill {
  return {
    name: drill.name.trim(),
    distance: drill.distance.trim() || null,
    attempts: drill.attempts === "" ? null : Number(drill.attempts),
    successes: drill.successes === "" ? null : Number(drill.successes),
  };
}

function toPracticeType(value: string): PracticeType {
  return practiceTypes.includes(value as PracticeType)
    ? (value as PracticeType)
    : "Driving Range";
}
