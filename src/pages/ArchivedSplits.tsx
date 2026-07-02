import { useEffect, useState } from "react";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { Button, ConfirmDialog, EmptyState, PageHeader, Surface } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { SplitDay } from "@/lib/types";

type SplitDayState = {
  id?: string;
  day: string;
  focus: string;
  exercises: string[];
};

type ArchivedSplit = {
  archivedAt: string;
  days: SplitDayState[];
};

export default function ArchivedSplits() {
  const [, navigate] = useLocation();
  const [archives, setArchives] = useState<ArchivedSplit[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [message, setMessage] = useState("");
  const [pendingDeleteArchive, setPendingDeleteArchive] = useState<string | null>(null);

  useEffect(() => {
    loadArchives();
  }, []);

  const loadArchives = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("split_days")
      .select("*")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false });

    const grouped = new Map<string, SplitDayState[]>();
    (data as SplitDay[] | null)?.forEach((day) => {
      if (!day.archived_at) return;
      const existing = grouped.get(day.archived_at) || [];
      existing.push(toSplitDayState(day));
      grouped.set(day.archived_at, existing);
    });

    setArchives(
      [...grouped.entries()].map(([archivedAt, days]) => ({
        archivedAt,
        days: days.sort((a, b) => dayOrder(a.day) - dayOrder(b.day)),
      }))
    );
    setLoading(false);
  };

  const activateArchive = async (archivedAt: string) => {
    setBusyAction(archivedAt);
    setMessage("");
    const now = new Date().toISOString();
    await supabase.from("split_days").update({ archived_at: now }).is("archived_at", null);
    const { error } = await supabase
      .from("split_days")
      .update({ archived_at: null })
      .eq("archived_at", archivedAt);
    setBusyAction("");

    if (error) {
      setMessage(error.message);
      return;
    }

    navigate("/workouts");
  };

  const deleteArchive = async () => {
    if (!pendingDeleteArchive) return;

    setBusyAction(pendingDeleteArchive);
    setMessage("");
    const { error } = await supabase.from("split_days").delete().eq("archived_at", pendingDeleteArchive);
    setBusyAction("");

    if (error) {
      setMessage(error.message);
      return;
    }

    setPendingDeleteArchive(null);
    setMessage("Archived split deleted");
    await loadArchives();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-lg text-muted">Loading archived splits...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-5 md:px-8 md:py-7">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Performance Lab"
          title="Archived Splits"
          description="Review old training boards, restore one as your active split, or delete the ones you do not need."
          tone="text-lab"
          actions={
            <Button type="button" variant="secondary" onClick={() => navigate("/workouts")}>
              Back to Board
            </Button>
          }
        />

        {message && (
          <div className="mb-5 rounded-xl border border-line bg-panel p-4 text-sm font-medium text-muted">
            {message}
          </div>
        )}

        {archives.length === 0 ? (
          <EmptyState
            title="No archived splits yet"
            description="When you archive a Training Board split, it will appear here so you can look back or activate it again."
            action={<Button type="button" variant="pulse" onClick={() => navigate("/workouts")}>Open Training Board</Button>}
          />
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {archives.map((archive) => {
              const trainingDays = archive.days.filter((day) => day.focus && day.focus !== "Rest");
              return (
                <Surface key={archive.archivedAt}>
                  <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-lab/10 text-lab">
                        <Archive className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                        Archived {formatArchiveDate(archive.archivedAt)}
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-dark">
                        {trainingDays.length || 0} training days
                      </h2>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        variant="pulse"
                        onClick={() => activateArchive(archive.archivedAt)}
                        disabled={busyAction === archive.archivedAt}
                      >
                        <RotateCcw className="h-4 w-4" />
                        {busyAction === archive.archivedAt ? "Activating..." : "Activate"}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setPendingDeleteArchive(archive.archivedAt)}
                        disabled={busyAction === archive.archivedAt}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {archive.days.map((day) => (
                      <div key={`${archive.archivedAt}-${day.day}`} className="rounded-xl border border-line bg-white/55 p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{day.day}</p>
                        <h3 className="mt-2 font-semibold text-dark">{day.focus || "Rest"}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted">
                          {day.exercises.length ? day.exercises.join(", ") : "No exercises"}
                        </p>
                      </div>
                    ))}
                  </div>
                </Surface>
              );
            })}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={!!pendingDeleteArchive}
        title="Delete archived split?"
        description="This permanently deletes this archived split. This cannot be undone."
        confirmLabel={busyAction === pendingDeleteArchive ? "Deleting..." : "Delete Archive"}
        onConfirm={deleteArchive}
        onCancel={() => setPendingDeleteArchive(null)}
      />
    </main>
  );
}

function toSplitDayState(day: SplitDay): SplitDayState {
  return {
    id: day.id,
    day: day.day_name || "",
    focus: day.split_name || "",
    exercises: day.exercises || [],
  };
}

function dayOrder(day: string) {
  return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].indexOf(day);
}

function formatArchiveDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
