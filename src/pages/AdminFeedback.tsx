import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Inbox, ShieldCheck } from "lucide-react";
import { Button, EmptyState, PageHeader, SelectInput, Surface } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { FeedbackReport } from "@/lib/types";

export default function AdminFeedback() {
  const [role, setRole] = useState("user");
  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadFeedback();
  }, []);

  async function loadFeedback() {
    setLoading(true);
    setError("");

    const [{ data: profile }, { data, error: feedbackError }] = await Promise.all([
      supabase.from("profiles").select("role").maybeSingle(),
      supabase.from("feedback_reports").select("*").order("created_at", { ascending: false }),
    ]);

    setRole(profile?.role || "user");
    setReports((data as FeedbackReport[]) || []);
    if (feedbackError) setError(feedbackError.message);
    setLoading(false);
  }

  async function updateStatus(report: FeedbackReport, status: FeedbackReport["status"]) {
    setSavingId(report.id);
    setError("");
    const { error: updateError } = await supabase
      .from("feedback_reports")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", report.id);
    setSavingId("");

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setReports((prev) => prev.map((item) => (item.id === report.id ? { ...item, status } : item)));
  }

  const metrics = useMemo(
    () => ({
      total: reports.length,
      new: reports.filter((report) => report.status === "new").length,
      resolved: reports.filter((report) => report.status === "resolved").length,
    }),
    [reports]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-muted">
        Loading feedback inbox...
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <main className="min-h-screen bg-cream px-4 py-5 text-ink md:px-8 md:py-7">
        <PageHeader
          eyebrow="Admin"
          title="Feedback inbox"
          description="This inbox is only available to admin accounts."
          tone="text-pulse"
        />
        <EmptyState title="Admin access required" description="Your account is not marked as an admin in profiles.role." />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-5 text-ink md:px-8 md:py-7">
      <PageHeader
        eyebrow="Admin"
        title="Feedback inbox"
        description="Review alpha tester notes, bug reports and product ideas from one place."
        tone="text-pulse"
        actions={
          <Button type="button" variant="secondary" onClick={loadFeedback}>
            Refresh
          </Button>
        }
      />

      <section className="mb-5 grid gap-4 md:grid-cols-3">
        <Metric icon={Inbox} label="Total notes" value={metrics.total} />
        <Metric icon={ShieldCheck} label="New" value={metrics.new} />
        <Metric icon={CheckCircle2} label="Resolved" value={metrics.resolved} />
      </section>

      {error && (
        <div className="mb-5 rounded-xl border border-danger/25 bg-danger/10 p-4 text-sm font-semibold text-danger">
          {error}
        </div>
      )}

      {reports.length ? (
        <section className="grid gap-4">
          {reports.map((report) => (
            <Surface key={report.id}>
              <div className="grid gap-5 lg:grid-cols-[1fr_220px] lg:items-start">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-pulse/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-pulse">
                      {report.category}
                    </span>
                    <span className={getStatusClass(report.status)}>{report.status}</span>
                    <span className="text-sm text-muted">{formatDate(report.created_at)}</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-dark">{report.title}</h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">{report.message}</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Info label="Page" value={report.page_url || "Not provided"} />
                    <Info label="Device" value={report.device_context || "Not provided"} />
                    <Info label="User" value={report.user_id || "Unknown"} />
                    <Info label="Updated" value={report.updated_at ? formatDate(report.updated_at) : "Not updated"} />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-muted">Status</label>
                  <SelectInput
                    value={report.status}
                    onChange={(event) => updateStatus(report, event.target.value as FeedbackReport["status"])}
                    disabled={savingId === report.id}
                  >
                    <option value="new">New</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </SelectInput>
                </div>
              </div>
            </Surface>
          ))}
        </section>
      ) : (
        <EmptyState title="No feedback yet" description="Alpha tester notes will appear here once they submit the feedback form." />
      )}
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-5 shadow-sm">
      <Icon className="h-5 w-5 text-pulse" />
      <p className="mt-4 text-sm font-medium text-muted">{label}</p>
      <h2 className="mt-2 text-3xl font-semibold text-dark">{value}</h2>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-white/70 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-dark">{value}</p>
    </div>
  );
}

function getStatusClass(status: FeedbackReport["status"]) {
  const base = "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em]";
  if (status === "resolved") return `${base} bg-golf/10 text-golf`;
  if (status === "reviewing") return `${base} bg-gold/15 text-gold`;
  if (status === "closed") return `${base} bg-steel/10 text-muted`;
  return `${base} bg-danger/10 text-danger`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
