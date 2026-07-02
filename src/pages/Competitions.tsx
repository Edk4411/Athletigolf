import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { CalendarDays, CheckCircle2, Edit3, Plus, Trophy, X } from "lucide-react";
import { Button, ConfirmDialog, EmptyState, FieldLabel, PageHeader, SelectInput, Surface, TextArea, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { Competition } from "@/lib/types";

const blankForm = {
  name: "",
  course: "",
  competition_date: "",
  start_time: "",
  priority: "medium",
  target_score: "",
  focus_area: "",
  notes: "",
};

export default function Competitions() {
  const [, navigate] = useLocation();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(blankForm);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [confirmWithdrawOpen, setConfirmWithdrawOpen] = useState(false);
  const [editForm, setEditForm] = useState(blankForm);

  useEffect(() => {
    loadCompetitions();
  }, []);

  async function loadCompetitions() {
    setLoading(true);
    const { data } = await supabase
      .from("competitions")
      .select("*")
      .order("competition_date", { ascending: true });
    setCompetitions((data as Competition[]) || []);
    setLoading(false);
  }

  async function saveCompetition(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const { error: saveError } = await supabase.from("competitions").insert({
      name: form.name.trim(),
      course: form.course.trim() || null,
      competition_date: form.competition_date,
      start_time: form.start_time || null,
      priority: form.priority,
      target_score: form.target_score ? Number(form.target_score) : null,
      focus_area: form.focus_area || null,
      notes: form.notes.trim() || null,
      status: "upcoming",
    });

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setForm(blankForm);
    await loadCompetitions();
  }

  async function updateCompetition(id: string, values: Partial<Competition>) {
    const { error: updateError } = await supabase
      .from("competitions")
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    await loadCompetitions();
    return true;
  }

  function openEditor(competition: Competition) {
    setError("");
    setEditingCompetition(competition);
    setEditForm({
      name: competition.name || "",
      course: competition.course || "",
      competition_date: competition.competition_date || "",
      start_time: competition.start_time || "",
      priority: competition.priority || "medium",
      target_score: competition.target_score?.toString() || "",
      focus_area: competition.focus_area || "",
      notes: competition.notes || "",
    });
  }

  async function saveEditedCompetition(event: React.FormEvent) {
    event.preventDefault();
    if (!editingCompetition) return;

    setSaving(true);
    setError("");

    const saved = await updateCompetition(editingCompetition.id, {
      name: editForm.name.trim(),
      course: editForm.course.trim() || null,
      competition_date: editForm.competition_date,
      start_time: editForm.start_time || null,
      priority: editForm.priority as Competition["priority"],
      target_score: editForm.target_score ? Number(editForm.target_score) : null,
      focus_area: editForm.focus_area || null,
      notes: editForm.notes.trim() || null,
    });

    setSaving(false);
    if (saved) setEditingCompetition(null);
  }

  async function withdrawCompetition() {
    if (!editingCompetition) return;

    setSaving(true);
    setError("");
    const saved = await updateCompetition(editingCompetition.id, { status: "cancelled" });
    setSaving(false);
    if (saved) {
      setConfirmWithdrawOpen(false);
      setEditingCompetition(null);
    }
  }

  const upcoming = useMemo(
    () => competitions.filter((competition) => competition.status === "upcoming"),
    [competitions]
  );
  const completed = useMemo(
    () => competitions.filter((competition) => competition.status === "completed"),
    [competitions]
  );
  const cancelled = useMemo(
    () => competitions.filter((competition) => competition.status === "cancelled"),
    [competitions]
  );
  const nextCompetition = upcoming[0] || null;
  const todayCompetition = upcoming.find((competition) => isToday(competition.competition_date)) || null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-muted">
        Loading competition planner...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-5 text-ink md:px-8 md:py-7">
      <PageHeader
        eyebrow="Golf Calendar"
        title="Competition Planner"
        description="Plan upcoming events, keep prep focused, then review what worked once the card is in."
        tone="text-golf"
      />

      <section className="mb-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Surface className="h-fit">
          <div className="mb-5 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-golf/10 text-golf">
              <Plus className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">New Event</p>
              <h2 className="text-xl font-semibold text-dark">Add competition</h2>
            </div>
          </div>

          <form onSubmit={saveCompetition} className="grid gap-4">
            <Field label="Competition name" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} placeholder="Club medal" required />
            <Field label="Course" value={form.course} onChange={(value) => setForm((prev) => ({ ...prev, course: value }))} placeholder="Home course" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date" type="date" value={form.competition_date} onChange={(value) => setForm((prev) => ({ ...prev, competition_date: value }))} required />
              <Field label="Start time" type="time" value={form.start_time} onChange={(value) => setForm((prev) => ({ ...prev, start_time: value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Priority</FieldLabel>
                <SelectInput value={form.priority} onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </SelectInput>
              </div>
              <Field label="Target score" type="number" value={form.target_score} onChange={(value) => setForm((prev) => ({ ...prev, target_score: value }))} placeholder="78" />
            </div>
            <div>
              <FieldLabel>Prep focus</FieldLabel>
              <SelectInput value={form.focus_area} onChange={(event) => setForm((prev) => ({ ...prev, focus_area: event.target.value }))}>
                <option value="">Let AthletiGolf suggest</option>
                <option>Driving accuracy</option>
                <option>Approach play</option>
                <option>Short game</option>
                <option>Putting</option>
                <option>Course strategy</option>
              </SelectInput>
            </div>
            <div>
              <FieldLabel>Notes</FieldLabel>
              <TextArea rows={3} value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Format, goals, anything to remember..." />
            </div>
            {error && <p className="rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm font-semibold text-danger">{error}</p>}
            <Button type="submit" variant="golf" disabled={saving || !form.name || !form.competition_date}>
              {saving ? "Saving..." : "Save Competition"}
            </Button>
          </form>
        </Surface>

        <Surface className="bg-dark text-white">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <Trophy className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Next Up</p>
              <h2 className="mt-1 text-2xl font-semibold">{nextCompetition?.name || "No competition planned"}</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/64">
                {nextCompetition
                  ? getPrepLine(nextCompetition)
                  : "Add a competition and AthletiGolf will start shaping your dashboard and practice plan around it."}
              </p>
            </div>
          </div>
          {nextCompetition && (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <DarkMetric label="Date" value={formatDate(nextCompetition.competition_date)} />
                <DarkMetric label="Target" value={nextCompetition.target_score || "-"} />
                <DarkMetric label="Focus" value={nextCompetition.focus_area || "Auto"} />
              </div>
              <PrepChecklist competition={nextCompetition} />
            </>
          )}
        </Surface>
      </section>

      {todayCompetition && (
        <section className="mb-5 overflow-hidden rounded-2xl border border-gold/25 bg-dark text-white shadow-sm">
          <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Today</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">{todayCompetition.name}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/64">
                Stay boring in the best way: commit to the focus, avoid the big miss, then come back here for the review.
              </p>
              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
                <DarkMetric label="Focus" value={todayCompetition.focus_area || "Course strategy"} />
                <DarkMetric label="Target" value={todayCompetition.target_score || "-"} />
                <DarkMetric label="Start" value={todayCompetition.start_time || "TBC"} />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
              <Button variant="gold" onClick={() => navigate("/golf/submit")}>
                Start Scorecard
              </Button>
              <Button variant="secondary" onClick={() => openEditor(todayCompetition)} className="border-white/15 bg-white/10 text-white hover:bg-white/15">
                Edit Plan
              </Button>
              <Button variant="secondary" onClick={() => navigate("/golf/practice-plan")} className="border-white/15 bg-white/10 text-white hover:bg-white/15">
                Warm-up Plan
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <Surface>
          <div className="mb-5 flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-golf" />
            <h2 className="text-xl font-semibold text-dark">Upcoming competitions</h2>
          </div>
          {upcoming.length ? (
            <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white/70">
              {upcoming.map((competition) => (
                <CompetitionRow
                  key={competition.id}
                  competition={competition}
                  onComplete={(score) =>
                    updateCompetition(competition.id, {
                      status: "completed",
                      result_score: score,
                    })
                  }
                  onEdit={() => openEditor(competition)}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No upcoming comps" description="Add one above and it will appear on the planner and dashboard." />
          )}
        </Surface>

        <Surface>
          <div className="mb-5 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-pulse" />
            <h2 className="text-xl font-semibold text-dark">Post-comp reviews</h2>
          </div>
          {completed.length ? (
            <div className="space-y-3">
              {completed.map((competition) => (
                <ReviewCard key={competition.id} competition={competition} onUpdate={(values) => updateCompetition(competition.id, values)} />
              ))}
            </div>
          ) : (
            <EmptyState title="No reviews yet" description="Completed competitions will sit here with score and reflection notes." />
          )}
        </Surface>
      </section>

      {cancelled.length > 0 && (
        <section className="mt-5">
          <Surface>
            <div className="mb-5 flex items-center gap-3">
              <X className="h-5 w-5 text-muted" />
              <h2 className="text-xl font-semibold text-dark">Withdrawn competitions</h2>
            </div>
            <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white/70">
              {cancelled.map((competition) => (
                <div key={competition.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <h3 className="font-semibold text-dark">{competition.name}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {competition.course || "Course TBC"} - {formatDate(competition.competition_date)}
                    </p>
                  </div>
                  <Button type="button" variant="secondary" onClick={() => updateCompetition(competition.id, { status: "upcoming" })}>
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          </Surface>
        </section>
      )}

      {editingCompetition && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            onClick={() => setEditingCompetition(null)}
            className="absolute inset-0 bg-black/50"
            aria-label="Close competition editor"
          />
          <aside className="relative z-10 h-full w-full max-w-xl overflow-y-auto border-l border-line bg-panel p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4 border-b border-line pb-5">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-golf">Edit Competition</p>
                <h2 className="text-3xl font-semibold tracking-tight text-dark">{editingCompetition.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingCompetition(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-steel/10 hover:text-dark"
                aria-label="Close competition editor"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveEditedCompetition} className="grid gap-4">
              <Field label="Competition name" value={editForm.name} onChange={(value) => setEditForm((prev) => ({ ...prev, name: value }))} required />
              <Field label="Course" value={editForm.course} onChange={(value) => setEditForm((prev) => ({ ...prev, course: value }))} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Date" type="date" value={editForm.competition_date} onChange={(value) => setEditForm((prev) => ({ ...prev, competition_date: value }))} required />
                <Field label="Start time" type="time" value={editForm.start_time} onChange={(value) => setEditForm((prev) => ({ ...prev, start_time: value }))} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Priority</FieldLabel>
                  <SelectInput value={editForm.priority} onChange={(event) => setEditForm((prev) => ({ ...prev, priority: event.target.value }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </SelectInput>
                </div>
                <Field label="Target score" type="number" value={editForm.target_score} onChange={(value) => setEditForm((prev) => ({ ...prev, target_score: value }))} />
              </div>
              <div>
                <FieldLabel>Prep focus</FieldLabel>
                <SelectInput value={editForm.focus_area} onChange={(event) => setEditForm((prev) => ({ ...prev, focus_area: event.target.value }))}>
                  <option value="">Let AthletiGolf suggest</option>
                  <option>Driving accuracy</option>
                  <option>Approach play</option>
                  <option>Short game</option>
                  <option>Putting</option>
                  <option>Course strategy</option>
                </SelectInput>
              </div>
              <div>
                <FieldLabel>Notes</FieldLabel>
                <TextArea rows={4} value={editForm.notes} onChange={(event) => setEditForm((prev) => ({ ...prev, notes: event.target.value }))} />
              </div>

              <div className="mt-4 grid gap-3 border-t border-line pt-5 sm:grid-cols-[1fr_auto_auto]">
                <Button type="button" variant="danger" onClick={() => setConfirmWithdrawOpen(true)} disabled={saving}>
                  Withdraw
                </Button>
                <Button type="button" variant="secondary" onClick={() => setEditingCompetition(null)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" variant="golf" disabled={saving || !editForm.name || !editForm.competition_date}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </aside>
        </div>
      )}
      <ConfirmDialog
        open={confirmWithdrawOpen}
        title="Withdraw from competition?"
        description={`This will move ${editingCompetition?.name || "this competition"} out of upcoming competitions. You can restore it later from the withdrawn section.`}
        confirmLabel="Withdraw"
        onConfirm={withdrawCompetition}
        onCancel={() => setConfirmWithdrawOpen(false)}
      />
    </main>
  );
}

function CompetitionRow({
  competition,
  onComplete,
  onEdit,
}: {
  competition: Competition;
  onComplete: (score: number | null) => void;
  onEdit: () => void;
}) {
  const [score, setScore] = useState("");
  return (
    <div className="grid gap-3 p-4 lg:grid-cols-[1fr_120px_120px_280px] lg:items-center">
      <div>
        <h3 className="font-semibold text-dark">{competition.name}</h3>
        <p className="mt-1 text-sm text-muted">
          {competition.course || "Course TBC"} - {getDaysUntil(competition.competition_date)}
        </p>
      </div>
      <p className="text-sm font-semibold text-muted">{formatDate(competition.competition_date)}</p>
      <p className={`rounded-full px-3 py-1 text-center text-sm font-semibold ${getPriorityClass(competition.priority)}`}>
        {competition.priority}
      </p>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <TextInput type="number" value={score} onChange={(event) => setScore(event.target.value)} placeholder="Score" />
        <Button type="button" variant="secondary" onClick={onEdit}>
          <Edit3 className="h-4 w-4" />
          Edit
        </Button>
        <Button type="button" variant="secondary" onClick={() => onComplete(score ? Number(score) : null)}>
          Done
        </Button>
      </div>
    </div>
  );
}

function PrepChecklist({ competition }: { competition: Competition }) {
  const focus = competition.focus_area || "Course strategy";
  const items = [
    `Practice focus: ${focus}`,
    competition.target_score ? `Target score: ${competition.target_score}` : "Set a realistic scoring target",
    competition.start_time ? `Start time: ${competition.start_time}` : "Confirm tee time",
  ];

  return (
    <div className="mt-5 rounded-xl border border-white/10 bg-white/8 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">Prep checklist</p>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm text-white/72">
            <CheckCircle2 className="h-4 w-4 text-gold" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewCard({ competition, onUpdate }: { competition: Competition; onUpdate: (values: Partial<Competition>) => void }) {
  const [strength, setStrength] = useState(competition.reflection_strength || "");
  const [weakness, setWeakness] = useState(competition.reflection_weakness || "");
  return (
    <div className="rounded-xl border border-line bg-white/70 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-dark">{competition.name}</h3>
          <p className="mt-1 text-sm text-muted">
            {formatDate(competition.competition_date)} - score {competition.result_score || "-"}
          </p>
        </div>
      </div>
      <div className="grid gap-3">
        <TextArea rows={2} value={strength} onChange={(event) => setStrength(event.target.value)} placeholder="Strongest part of the round..." />
        <TextArea rows={2} value={weakness} onChange={(event) => setWeakness(event.target.value)} placeholder="What cost shots..." />
        <Button type="button" variant="pulse" onClick={() => onUpdate({ reflection_strength: strength, reflection_weakness: weakness })}>
          Save Review
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <TextInput type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} />
    </div>
  );
}

function DarkMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/8 p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-2 font-semibold text-white">{value}</p>
    </div>
  );
}

function getPrepLine(competition: Competition) {
  const focus = competition.focus_area || "your weakest current scoring area";
  return `${getDaysUntil(competition.competition_date)}. Prep should bias ${focus.toLowerCase()} and keep the week simple.`;
}

function getPriorityClass(priority: Competition["priority"]) {
  if (priority === "high") return "bg-danger/10 text-danger";
  if (priority === "medium") return "bg-gold/15 text-gold";
  return "bg-golf/10 text-golf";
}

function getDaysUntil(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 0) return "date passed";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `${days} days away`;
}

function isToday(value: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  return target.getTime() === today.getTime();
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
