import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useLocation } from "wouter";
import { Edit3, Eye, NotebookPen, Plus, Trash2, X } from "lucide-react";
import { Button, ConfirmDialog, EmptyState, FieldLabel, PageHeader, StatCard, Surface, TextArea, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { PracticeDrill, PracticeSession } from "@/lib/types";

type PracticeType = "Driving Range" | "Putting" | "Chipping" | "Short Game" | "On Course";
type PracticeDrillForm = {
  name: string;
  distance: string;
  attempts: string;
  successes: string;
};

const practiceTypes: PracticeType[] = ["Driving Range", "Putting", "Chipping", "Short Game", "On Course"];

const blankDrill = (): PracticeDrillForm => ({
  name: "",
  distance: "",
  attempts: "",
  successes: "",
});

export default function PracticeHistory() {
  const [, navigate] = useLocation();
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSession, setSelectedSession] = useState<PracticeSession | null>(null);
  const [editingSession, setEditingSession] = useState<PracticeSession | null>(null);
  const [pendingDeleteSession, setPendingDeleteSession] = useState<PracticeSession | null>(null);
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
    const { data, error } = await supabase.from("practice_sessions").select("*").order("created_at", { ascending: false });
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

  const deleteSession = async () => {
    if (!pendingDeleteSession) return;

    const { error } = await supabase.from("practice_sessions").delete().eq("id", pendingDeleteSession.id);

    if (error) {
      setError(error.message);
      return;
    }

    setEditingSession(null);
    setSelectedSession(null);
    setPendingDeleteSession(null);
    setSessions((prev) => prev.filter((s) => s.id !== pendingDeleteSession.id));
  };

  const totalMinutes = sessions.reduce((sum, session) => sum + (session.duration_minutes || 0), 0);
  const drillCount = sessions.reduce((sum, session) => sum + normalisePracticeDrills(session).length, 0);
  const avgRating = average(sessions.map((session) => session.rating).filter(isNumber));
  const shortGameSessions = sessions.filter((s) => s.practice_type === "Chipping" || s.practice_type === "Short Game").length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-lg text-muted">Loading practice history...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-5 text-ink md:px-8 md:py-7">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Golf Practice"
          title="Practice History"
          description="Review range work, drills, ratings, and the practice signals feeding your golf progress."
          tone="text-golf"
          actions={<Button variant="golf" onClick={() => navigate("/golf/practice")}><NotebookPen className="h-4 w-4" />Log Practice</Button>}
        />

        <section className="mb-5 grid gap-4 md:grid-cols-4">
          <StatCard label="Sessions" value={sessions.length} />
          <StatCard label="Minutes" value={totalMinutes} />
          <StatCard label="Drills" value={drillCount} />
          <StatCard label="Avg Rating" value={avgRating === null ? "-" : `${avgRating.toFixed(1)}/10`} />
        </section>

        {error && (
          <div className="mb-5 rounded-xl border border-danger/25 bg-danger/10 p-4 text-sm font-semibold text-danger">
            {error}
          </div>
        )}

        {sessions.length === 0 ? (
          <EmptyState
            title="No practice sessions yet"
            description="Log a practice session to start building your practice logbook."
            action={<Button variant="golf" onClick={() => navigate("/golf/practice")}>Log Practice</Button>}
          />
        ) : (
          <section className="grid gap-5 xl:grid-cols-[1fr_320px]">
            <Surface className="overflow-hidden p-0">
              <div className="hidden grid-cols-[1fr_110px_110px_110px_110px] gap-4 border-b border-line bg-steel/5 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-muted lg:grid">
                <span>Session</span>
                <span>Duration</span>
                <span>Rating</span>
                <span>Drills</span>
                <span />
              </div>

              {sessions.map((session) => {
                const drills = normalisePracticeDrills(session);
                const bestDrill = getBestDrill(drills);
                return (
                  <article key={session.id} className="border-b border-line p-5 last:border-b-0 hover:bg-steel/5">
                    <div className="grid gap-4 lg:grid-cols-[1fr_110px_110px_110px_110px] lg:items-center">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-semibold text-dark">{session.practice_type}</h2>
                          {session.focus_area && (
                            <span className="rounded-full bg-golf/10 px-2.5 py-1 text-xs font-bold text-golf">
                              {session.focus_area}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted">
                          {new Date(session.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                          {bestDrill ? ` / Best drill ${bestDrill}` : ""}
                        </p>
                      </div>
                      <Metric label="Duration" value={`${session.duration_minutes} min`} />
                      <Metric label="Rating" value={session.rating ? `${session.rating}/10` : "-"} />
                      <Metric label="Drills" value={`${drills.length}`} />
                      <div className="flex gap-2 lg:justify-end">
                        <Button variant="secondary" onClick={() => setSelectedSession(session)}><Eye className="h-4 w-4" />View</Button>
                        <Button variant="secondary" onClick={() => openEditor(session)}><Edit3 className="h-4 w-4" />Edit</Button>
                      </div>
                    </div>

                    {drills.length > 0 && (
                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {drills.slice(0, 3).map((drill, index) => (
                          <div key={`${drill.name}-${index}`} className="rounded-xl border border-line bg-steel/5 p-4">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{drill.name || "Drill"}</p>
                            <p className="mt-2 text-sm text-ink">{drill.distance || "No target saved"}</p>
                            <p className="mt-2 text-sm font-semibold text-golf">{formatDrillRate(drill)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </Surface>

            <Surface className="h-fit bg-dark text-white">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-pulse">Practice Mix</p>
              <h2 className="mt-2 text-2xl font-semibold">Current pattern</h2>
              <div className="mt-5 space-y-4">
                <PracticeMix label="Short game" value={shortGameSessions} total={sessions.length} />
                <PracticeMix label="Range" value={sessions.filter((s) => s.practice_type === "Driving Range").length} total={sessions.length} />
                <PracticeMix label="Putting" value={sessions.filter((s) => s.practice_type === "Putting").length} total={sessions.length} />
              </div>
            </Surface>
          </section>
        )}
      </div>

      {selectedSession && (
        <PracticeDetailsDrawer
          session={selectedSession}
          drills={normalisePracticeDrills(selectedSession)}
          onClose={() => setSelectedSession(null)}
          onEdit={() => {
            const session = selectedSession;
            setSelectedSession(null);
            openEditor(session);
          }}
          onDelete={() => setPendingDeleteSession(selectedSession)}
        />
      )}

      {editingSession && (
        <PracticeEditDrawer
          form={editForm}
          saving={saving}
          setForm={setEditForm}
          onClose={() => setEditingSession(null)}
          onSave={saveSession}
          onDelete={() => setPendingDeleteSession(editingSession)}
          addDrill={() => setEditForm((prev) => ({ ...prev, drills: [...prev.drills, blankDrill()] }))}
          updateDrill={(index, key, value) =>
            setEditForm((prev) => ({
              ...prev,
              drills: prev.drills.map((drill, drillIndex) => (drillIndex === index ? { ...drill, [key]: value } : drill)),
            }))
          }
          removeDrill={(index) => setEditForm((prev) => ({ ...prev, drills: prev.drills.filter((_, drillIndex) => drillIndex !== index) }))}
        />
      )}
      <ConfirmDialog
        open={!!pendingDeleteSession}
        title="Delete practice session?"
        description={`This will permanently delete this ${pendingDeleteSession?.practice_type || "practice"} session. This cannot be undone.`}
        confirmLabel="Delete Session"
        onConfirm={deleteSession}
        onCancel={() => setPendingDeleteSession(null)}
      />
    </main>
  );
}

function PracticeDetailsDrawer({
  session,
  drills,
  onClose,
  onEdit,
  onDelete,
}: {
  session: PracticeSession;
  drills: PracticeDrill[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button onClick={onClose} className="absolute inset-0 bg-black/50" aria-label="Close practice details" />
      <aside className="relative z-10 h-full w-full max-w-3xl overflow-y-auto border-l border-line bg-panel p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-golf">Practice Details</p>
            <h2 className="text-3xl font-semibold tracking-tight text-dark">{session.practice_type}</h2>
            <p className="mt-2 text-sm text-muted">
              {new Date(session.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <button onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-steel/10 hover:text-dark" aria-label="Close practice details">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <DetailTile label="Duration" value={`${session.duration_minutes || 0} min`} />
          <DetailTile label="Rating" value={session.rating ? `${session.rating}/10` : "-"} />
          <DetailTile label="Drills" value={drills.length.toString()} />
        </div>

        {session.focus_area && (
          <div className="mb-5 rounded-xl border border-line bg-steel/5 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">Focus Area</p>
            <p className="text-sm font-semibold text-dark">{session.focus_area}</p>
          </div>
        )}

        <div className="mb-5 rounded-xl border border-line bg-steel/5 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted">Notes</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {session.notes || "No notes saved for this practice session."}
          </p>
        </div>

        <div className="rounded-xl border border-line bg-steel/5 p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted">Drills</p>
          {drills.length === 0 ? (
            <p className="text-sm text-muted">No measured drills were added.</p>
          ) : (
            <div className="space-y-3">
              {drills.map((drill, index) => (
                <div key={`${drill.name}-${index}`} className="rounded-xl border border-line bg-panel p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-semibold text-dark">{drill.name || `Drill ${index + 1}`}</p>
                      <p className="mt-1 text-sm text-muted">{drill.distance || "No target saved"}</p>
                    </div>
                    <span className="rounded-full bg-golf/10 px-3 py-1 text-xs font-bold text-golf">
                      {formatDrillRate(drill)}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <p className="text-muted">Attempts <span className="font-semibold text-dark">{drill.attempts ?? "-"}</span></p>
                    <p className="text-muted">Successes <span className="font-semibold text-dark">{drill.successes ?? "-"}</span></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button variant="danger" onClick={onDelete}><Trash2 className="h-4 w-4" />Delete Session</Button>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button variant="golf" onClick={onEdit}><Edit3 className="h-4 w-4" />Edit Session</Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function PracticeEditDrawer({
  form,
  saving,
  setForm,
  onClose,
  onSave,
  onDelete,
  addDrill,
  updateDrill,
  removeDrill,
}: {
  form: {
    practice_type: PracticeType;
    duration_minutes: string;
    focus_area: string;
    drills: PracticeDrillForm[];
    rating: string;
    notes: string;
  };
  saving: boolean;
  setForm: Dispatch<SetStateAction<{
    practice_type: PracticeType;
    duration_minutes: string;
    focus_area: string;
    drills: PracticeDrillForm[];
    rating: string;
    notes: string;
  }>>;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  addDrill: () => void;
  updateDrill: (index: number, key: keyof PracticeDrillForm, value: string) => void;
  removeDrill: (index: number) => void;
}) {
  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button onClick={onClose} className="absolute inset-0 bg-black/50" aria-label="Close practice editor" />
      <aside className="relative z-10 h-full w-full max-w-3xl overflow-y-auto border-l border-line bg-panel p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-golf">Edit Practice</p>
            <h2 className="text-3xl font-semibold tracking-tight text-dark">{form.practice_type}</h2>
          </div>
          <button onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-steel/10 hover:text-dark" aria-label="Close practice editor">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel>Practice Type</FieldLabel>
            <select
              value={form.practice_type}
              onChange={(event) => setField("practice_type", event.target.value as PracticeType)}
              className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-pulse/50 focus:ring-4 focus:ring-pulse/10"
            >
              {practiceTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>
          <Field label="Duration" type="number" value={form.duration_minutes} onChange={(value) => setField("duration_minutes", value)} />
          <Field label="Focus Area" value={form.focus_area} onChange={(value) => setField("focus_area", value)} />
          <Field label="Rating" type="number" value={form.rating} onChange={(value) => setField("rating", value)} />
        </div>

        <div className="mt-5 rounded-xl border border-line bg-steel/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-dark">Drills</p>
              <p className="text-sm text-muted">Add drills only if this session included measurable practice.</p>
            </div>
            <Button type="button" variant="secondary" onClick={addDrill}>
              {form.drills.length === 0 ? <Plus className="h-4 w-4" /> : null}
              {form.drills.length === 0 ? "Add Drill" : "Add Another Drill"}
            </Button>
          </div>

          {form.drills.length > 0 && (
            <div className="mt-4 space-y-3">
              {form.drills.map((drill, index) => (
                <div key={index} className="rounded-xl border border-line bg-panel p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-dark">Drill {index + 1}</p>
                      <p className="text-sm text-golf">{formatDrillRate(toPracticeDrill(drill))}</p>
                    </div>
                    <button type="button" onClick={() => removeDrill(index)} className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-steel/10 hover:text-dark">
                      Remove
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Drill" value={drill.name} onChange={(value) => updateDrill(index, "name", value)} />
                    <Field label="Distance / target" value={drill.distance} onChange={(value) => updateDrill(index, "distance", value)} />
                    <Field label="Attempts" type="number" value={drill.attempts} onChange={(value) => updateDrill(index, "attempts", value)} />
                    <Field label="Successes" type="number" value={drill.successes} onChange={(value) => updateDrill(index, "successes", value)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5">
          <FieldLabel>Notes</FieldLabel>
          <TextArea value={form.notes} onChange={(event) => setField("notes", event.target.value)} rows={5} />
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button variant="danger" onClick={onDelete}><Trash2 className="h-4 w-4" />Delete Session</Button>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="golf" onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save Session"}</Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted lg:hidden">{label}</p>
      <p className="font-semibold text-dark">{value}</p>
    </div>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-steel/5 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-dark">{value}</p>
    </div>
  );
}

function PracticeMix({ label, value, total }: { label: string; value: number; total: number }) {
  const width = total > 0 ? `${Math.round((value / total) * 100)}%` : "0%";
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-white/64">{label}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className="h-full rounded-full bg-pulse" style={{ width }} />
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <TextInput type={type} min={type === "number" ? 0 : undefined} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function formatDrillRate(drill: PracticeDrill) {
  if (!drill.attempts || drill.attempts <= 0 || drill.successes === null || drill.successes === undefined) return "-";
  return `${Math.round((drill.successes / drill.attempts) * 100)}% success`;
}

function getBestDrill(drills: PracticeDrill[]) {
  const scored = drills
    .map((drill) => ({ name: drill.name, rate: drill.attempts && drill.successes !== null && drill.successes !== undefined ? Math.round((drill.successes / drill.attempts) * 100) : null }))
    .filter((drill): drill is { name: string; rate: number } => !!drill.name && drill.rate !== null)
    .sort((a, b) => b.rate - a.rate);
  return scored[0] ? `${scored[0].name} ${scored[0].rate}%` : "";
}

function normalisePracticeDrills(session: PracticeSession): PracticeDrill[] {
  if (Array.isArray(session.drills) && session.drills.length > 0) return session.drills;
  if (!session.drill_name && !session.drill_distance && !session.drill_attempts && !session.drill_successes) return [];
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
  return practiceTypes.includes(value as PracticeType) ? (value as PracticeType) : "Driving Range";
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function isNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}
