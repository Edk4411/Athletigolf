import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Edit3, Plus, Trash2, X } from "lucide-react";
import { Button, Card, PageHeader, StatCard } from "@/components/ui";
import { supabase } from "@/lib/supabase";

type PracticeType = "Driving Range" | "Putting" | "Chipping" | "Short Game" | "On Course";

type PracticeSession = {
  id: string;
  practice_type: PracticeType;
  duration_minutes: number;
  focus_area: string | null;
  rating: number | null;
  notes: string | null;
  created_at: string;
};

const practiceTypes: PracticeType[] = [
  "Driving Range",
  "Putting",
  "Chipping",
  "Short Game",
  "On Course",
];

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
      practice_type: session.practice_type,
      duration_minutes: session.duration_minutes?.toString() || "",
      focus_area: session.focus_area || "",
      rating: session.rating?.toString() || "",
      notes: session.notes || "",
    });
  };

  const saveSession = async () => {
    if (!editingSession) return;

    setSaving(true);
    setError("");

    const { error } = await supabase
      .from("practice_sessions")
      .update({
        practice_type: editForm.practice_type,
        duration_minutes: Number(editForm.duration_minutes || 0),
        focus_area: editForm.focus_area || null,
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

  return (
    <div className="min-h-screen bg-cream p-6 text-[#101010]">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <PageHeader
            eyebrow="Golf Practice"
            title="Practice History"
            description="See your recent golf practice, edit sessions and keep the log accurate."
            tone="text-[#1F4D3A]"
          />

          <Link href="/golf/practice">
            <a className="inline-flex items-center justify-center rounded-2xl bg-[#1F4D3A] px-6 py-3 font-medium text-white transition hover:bg-[#17392b]">
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
              <a className="inline-flex items-center justify-center rounded-2xl bg-[#1F4D3A] px-6 py-3 font-medium text-white transition hover:bg-[#17392b]">
                Log Practice
              </a>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-5">
            {sessions.map((session) => (
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

                {session.notes && (
                  <div className="mt-5 rounded-2xl bg-cream p-4">
                    <p className="mb-1 text-sm text-black/50">Notes</p>
                    <p className="text-black/70">{session.notes}</p>
                  </div>
                )}
              </Card>
            ))}
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
          <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm uppercase tracking-[0.25em] text-[#1F4D3A]/70">
                  Edit Practice
                </p>
                <h2 className="text-4xl font-semibold text-[#1F4D3A]">
                  {editForm.practice_type}
                </h2>
              </div>
              <button
                onClick={() => setEditingSession(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl text-black/50 transition hover:bg-black/5 hover:text-black"
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
                  className="w-full rounded-2xl border border-black/10 bg-white px-5 py-4 outline-none focus:border-[#1F4D3A]"
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
                <label className="mb-2 block text-sm text-black/50">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(event) =>
                    setEditForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  rows={5}
                  className="w-full rounded-2xl border border-black/10 px-5 py-4 outline-none focus:border-[#1F4D3A]"
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
                  className="bg-[#1F4D3A] hover:bg-[#17392b]"
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
        className="w-full rounded-2xl border border-black/10 px-5 py-4 outline-none focus:border-[#1F4D3A]"
      />
    </div>
  );
}
