import { useEffect, useMemo, useState } from "react";
import { Activity, Droplets, Flame, Moon, Scale, Utensils, Zap } from "lucide-react";
import { Button, EmptyState, FieldLabel, PageHeader, SelectInput, Surface, TextArea, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { OnboardingData, WellnessLog } from "@/lib/types";
import { defaultWellnessTargets, getWellnessTargets, type WellnessTargets } from "@/lib/wellnessTargets";

const todayIso = () => new Date().toISOString().slice(0, 10);

const blankForm = {
  log_date: todayIso(),
  water_litres: "",
  calories: "",
  protein_grams: "",
  carbs_grams: "",
  fats_grams: "",
  bodyweight: "",
  sleep_hours: "",
  energy_rating: "",
  notes: "",
};

export default function Wellness() {
  const [logs, setLogs] = useState<WellnessLog[]>([]);
  const [targets, setTargets] = useState<WellnessTargets>(defaultWellnessTargets);
  const [selectedLog, setSelectedLog] = useState<WellnessLog | null>(null);
  const [form, setForm] = useState(blankForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    const [{ data }, { data: profile }] = await Promise.all([
      supabase
        .from("daily_wellness_logs")
        .select("*")
        .order("log_date", { ascending: false })
        .limit(30),
      supabase.from("profiles").select("onboarding_data").maybeSingle(),
    ]);

    const loadedLogs = (data as WellnessLog[]) || [];
    const onboarding = (profile?.onboarding_data as OnboardingData | null) || null;
    setTargets(getWellnessTargets(onboarding));
    setLogs(loadedLogs);
    const todayLog = loadedLogs.find((log) => log.log_date === todayIso()) || null;
    setSelectedLog(todayLog);
    setForm(todayLog ? formFromLog(todayLog) : blankForm);
    setLoading(false);
  }

  function selectLog(log: WellnessLog) {
    setSelectedLog(log);
    setForm(formFromLog(log));
    setError("");
  }

  async function saveLog(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      log_date: form.log_date,
      water_litres: toNumber(form.water_litres),
      calories: toInteger(form.calories),
      protein_grams: toInteger(form.protein_grams),
      carbs_grams: toInteger(form.carbs_grams),
      fats_grams: toInteger(form.fats_grams),
      bodyweight: toNumber(form.bodyweight),
      sleep_hours: toNumber(form.sleep_hours),
      energy_rating: toInteger(form.energy_rating),
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You need to be signed in to save wellness logs.");
      setSaving(false);
      return;
    }

    const { error: saveError } = await supabase
      .from("daily_wellness_logs")
      .upsert({ ...payload, user_id: user.id }, { onConflict: "user_id,log_date" });

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    await loadLogs();
  }

  const todayLog = logs.find((log) => log.log_date === todayIso()) || selectedLog;
  const weekLogs = useMemo(() => logs.slice(0, 7), [logs]);
  const weekly = useMemo(() => getWeeklySummary(weekLogs), [weekLogs]);
  const insights = useMemo(() => buildWellnessInsights(weekLogs, targets), [weekLogs, targets]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-muted">
        Loading wellness dashboard...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-5 text-ink md:px-8 md:py-7">
      <PageHeader
        eyebrow="Wellness"
        title="Nutrition and hydration"
        description="Track the daily recovery signals that explain training quality, practice energy, and performance consistency."
        tone="text-pulse"
      />

      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <WellnessTile icon={Droplets} label="Water" value={formatLitres(todayLog?.water_litres)} target={`${targets.waterLitres} L`} progress={getProgress(todayLog?.water_litres, targets.waterLitres)} tone="pulse" />
        <WellnessTile icon={Utensils} label="Protein" value={formatGrams(todayLog?.protein_grams)} target={`${targets.proteinGrams} g`} progress={getProgress(todayLog?.protein_grams, targets.proteinGrams)} tone="golf" />
        <WellnessTile icon={Flame} label="Calories" value={formatNumber(todayLog?.calories)} target={`${targets.calories}`} progress={getProgress(todayLog?.calories, targets.calories)} tone="gold" />
        <WellnessTile icon={Moon} label="Sleep" value={formatHours(todayLog?.sleep_hours)} target={`${targets.sleepHours} h`} progress={getProgress(todayLog?.sleep_hours, targets.sleepHours)} tone="lab" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Surface>
          <div className="mb-5 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pulse/10 text-pulse">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Daily Log</p>
              <h2 className="text-xl font-semibold text-dark">Manual totals</h2>
            </div>
          </div>

          <form onSubmit={saveLog} className="grid gap-4">
            <Field label="Date" type="date" value={form.log_date} onChange={(value) => setForm((prev) => ({ ...prev, log_date: value }))} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Water (litres)" type="number" step="0.1" value={form.water_litres} onChange={(value) => setForm((prev) => ({ ...prev, water_litres: value }))} placeholder={`${targets.waterLitres}`} />
              <Field label="Calories" type="number" value={form.calories} onChange={(value) => setForm((prev) => ({ ...prev, calories: value }))} placeholder={`${targets.calories}`} />
              <Field label="Protein (g)" type="number" value={form.protein_grams} onChange={(value) => setForm((prev) => ({ ...prev, protein_grams: value }))} placeholder={`${targets.proteinGrams}`} />
              <Field label="Carbs (g)" type="number" value={form.carbs_grams} onChange={(value) => setForm((prev) => ({ ...prev, carbs_grams: value }))} placeholder="260" />
              <Field label="Fats (g)" type="number" value={form.fats_grams} onChange={(value) => setForm((prev) => ({ ...prev, fats_grams: value }))} placeholder="70" />
              <Field label="Bodyweight" type="number" step="0.1" value={form.bodyweight} onChange={(value) => setForm((prev) => ({ ...prev, bodyweight: value }))} placeholder="78.5" />
              <Field label="Sleep (hours)" type="number" step="0.1" value={form.sleep_hours} onChange={(value) => setForm((prev) => ({ ...prev, sleep_hours: value }))} placeholder="8" />
              <div>
                <FieldLabel>Energy</FieldLabel>
                <SelectInput value={form.energy_rating} onChange={(event) => setForm((prev) => ({ ...prev, energy_rating: event.target.value }))}>
                  <option value="">Rate energy</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                    <option key={rating} value={rating}>{rating}/10</option>
                  ))}
                </SelectInput>
              </div>
            </div>
            <div>
              <FieldLabel>Notes</FieldLabel>
              <TextArea rows={4} value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Meals, caffeine, soreness, travel, anything that explains the day..." />
            </div>
            {error && <p className="rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm font-semibold text-danger">{error}</p>}
            <Button type="submit" variant="pulse" disabled={saving || !form.log_date}>
              {saving ? "Saving..." : "Save Wellness Log"}
            </Button>
          </form>
        </Surface>

        <div className="space-y-5">
          <Surface className="bg-dark text-white">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-pulse">Weekly Signal</p>
                <h2 className="mt-2 text-3xl font-semibold">Recovery baseline</h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/64">
                  These are simple manual signals for now. The power comes later when they sit beside training, rounds, and practice.
                </p>
              </div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-pulse/15 text-pulse">
                <Zap className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <DarkMetric label="Water avg" value={formatLitres(weekly.avgWater)} />
              <DarkMetric label="Protein avg" value={formatGrams(weekly.avgProtein)} />
              <DarkMetric label="Sleep avg" value={formatHours(weekly.avgSleep)} />
              <DarkMetric label="Energy avg" value={weekly.avgEnergy === null ? "-" : `${weekly.avgEnergy.toFixed(1)}/10`} />
            </div>
          </Surface>

          <Surface>
            <div className="mb-5 flex items-center gap-3">
              <Scale className="h-5 w-5 text-pulse" />
              <h2 className="text-xl font-semibold text-dark">Recent logs</h2>
            </div>
            {logs.length ? (
              <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white/70">
                {logs.slice(0, 7).map((log) => (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => selectLog(log)}
                    className={`grid w-full gap-3 p-4 text-left transition hover:bg-steel/5 sm:grid-cols-[110px_1fr_1fr_1fr] sm:items-center ${
                      selectedLog?.id === log.id ? "bg-pulse/8" : ""
                    }`}
                  >
                    <span className="font-semibold text-dark">{formatDate(log.log_date)}</span>
                    <span className="text-sm text-muted">Water {formatLitres(log.water_litres)}</span>
                    <span className="text-sm text-muted">Protein {formatGrams(log.protein_grams)}</span>
                    <span className="text-sm text-muted">Energy {log.energy_rating ? `${log.energy_rating}/10` : "-"}</span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState title="No wellness logs yet" description="Save today's totals and the weekly signal will start building." />
            )}
          </Surface>
        </div>
      </section>

      <section className="mt-5">
        <Surface>
          <h2 className="mb-5 text-xl font-semibold text-dark">Wellness insights</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {insights.map((insight) => (
              <div key={insight.title} className={`rounded-xl border p-4 ${insight.tone}`}>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{insight.label}</p>
                <h3 className="mt-2 font-semibold text-dark">{insight.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{insight.detail}</p>
              </div>
            ))}
          </div>
        </Surface>
      </section>
    </main>
  );
}

function WellnessTile({
  icon: Icon,
  label,
  value,
  target,
  progress,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  target: string;
  progress: number;
  tone: "pulse" | "golf" | "gold" | "lab";
}) {
  const iconClass =
    tone === "pulse"
      ? "bg-pulse/10 text-pulse"
      : tone === "golf"
      ? "bg-golf/10 text-golf"
      : tone === "gold"
      ? "bg-gold/15 text-gold"
      : "bg-lab/10 text-lab";
  const bar = tone === "pulse" ? "bg-pulse" : tone === "golf" ? "bg-golf" : tone === "gold" ? "bg-gold" : "bg-lab";
  return (
    <div className="rounded-xl border border-line bg-panel p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-xs font-semibold text-muted">Target {target}</span>
      </div>
      <p className="text-sm font-medium text-muted">{label}</p>
      <h2 className="mt-2 text-3xl font-semibold text-dark">{value}</h2>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-steel/10">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${progress}%` }} />
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
  step,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <TextInput type={type} step={step} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} />
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

function formFromLog(log: WellnessLog) {
  return {
    log_date: log.log_date,
    water_litres: toFormValue(log.water_litres),
    calories: toFormValue(log.calories),
    protein_grams: toFormValue(log.protein_grams),
    carbs_grams: toFormValue(log.carbs_grams),
    fats_grams: toFormValue(log.fats_grams),
    bodyweight: toFormValue(log.bodyweight),
    sleep_hours: toFormValue(log.sleep_hours),
    energy_rating: toFormValue(log.energy_rating),
    notes: log.notes || "",
  };
}

function getWeeklySummary(logs: WellnessLog[]) {
  return {
    avgWater: average(logs.map((log) => log.water_litres)),
    avgProtein: average(logs.map((log) => log.protein_grams)),
    avgSleep: average(logs.map((log) => log.sleep_hours)),
    avgEnergy: average(logs.map((log) => log.energy_rating)),
  };
}

function buildWellnessInsights(logs: WellnessLog[], targets: WellnessTargets) {
  const weekly = getWeeklySummary(logs);
  const loggedDays = logs.length;
  const insights = [
    {
      label: "Consistency",
      title: loggedDays >= 5 ? "Wellness signal is building" : "Build the baseline",
      detail: loggedDays >= 5 ? "You have enough recent days to start comparing wellness against training and golf." : `Log ${Math.max(0, 5 - loggedDays)} more days to make the signal useful.`,
      tone: loggedDays >= 5 ? "border-golf/20 bg-golf/8" : "border-gold/25 bg-gold/10",
    },
    {
      label: "Hydration",
      title: (weekly.avgWater ?? 0) >= targets.waterLitres ? "Hydration is on target" : "Hydration needs attention",
      detail: weekly.avgWater === null ? "Add water totals to see whether hydration is helping or hurting practice days." : `Recent average is ${formatLitres(weekly.avgWater)} against a ${targets.waterLitres} L target.`,
      tone: (weekly.avgWater ?? 0) >= targets.waterLitres ? "border-pulse/20 bg-pulse/8" : "border-gold/25 bg-gold/10",
    },
    {
      label: "Recovery",
      title: (weekly.avgSleep ?? 0) >= targets.sleepHours - 0.5 ? "Sleep is usable" : "Sleep may limit output",
      detail: weekly.avgSleep === null ? "Add sleep hours so AthletiGolf can compare recovery with training quality." : `Recent sleep average is ${formatHours(weekly.avgSleep)}.`,
      tone: (weekly.avgSleep ?? 0) >= targets.sleepHours - 0.5 ? "border-lab/20 bg-lab/8" : "border-gold/25 bg-gold/10",
    },
  ];

  return insights;
}

function toNumber(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInteger(value: string) {
  const parsed = toNumber(value);
  return parsed === null ? null : Math.round(parsed);
}

function toFormValue(value: number | null | undefined) {
  return value === null || value === undefined ? "" : `${value}`;
}

function average(values: Array<number | null | undefined>) {
  const numbers = values.filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value));
  return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : null;
}

function getProgress(value: number | null | undefined, target: number) {
  if (!value || value <= 0) return 0;
  return Math.min((value / target) * 100, 100);
}

function formatLitres(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : `${Number(value).toFixed(1)} L`;
}

function formatGrams(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : `${Math.round(value)} g`;
}

function formatHours(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : `${Number(value).toFixed(1)} h`;
}

function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : `${Math.round(value)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
