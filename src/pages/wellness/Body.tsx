import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Scale, Save, Trash2 } from "lucide-react";
import { Button, FieldLabel, Surface, TextInput } from "@/components/ui";
import { MetricTrend } from "@/components/wellness/MetricTrend";
import { supabase } from "@/lib/supabase";
import { useWellness } from "@/hooks/wellness/WellnessContext";
import type { WellnessLog } from "@/lib/types";

export default function Body() {
  const [, navigate] = useLocation();
  const { logs, targets, refresh, loading, selectedDate } = useWellness();
  const [weight, setWeight] = useState(""); const [bodyFat, setBodyFat] = useState(""); const [muscleMass, setMuscleMass] = useState("");
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5)); const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
  const existing = useMemo(() => logs.find((log: WellnessLog) => log.log_date === selectedDate), [logs, selectedDate]);
  const readings = useMemo(() => (logs as WellnessLog[]).filter((log: WellnessLog) => log.bodyweight !== null && log.bodyweight !== undefined), [logs]);
  useEffect(() => { setWeight(existing?.bodyweight?.toString() || ""); setBodyFat(existing?.body_fat_percentage?.toString() || ""); setMuscleMass(existing?.muscle_mass_kg?.toString() || ""); }, [existing]);
  async function save() {
    const value = Number(weight); const fat = bodyFat === "" ? null : Number(bodyFat); const muscle = muscleMass === "" ? null : Number(muscleMass);
    if (!Number.isFinite(value) || value <= 0 || (fat !== null && (!Number.isFinite(fat) || fat < 0 || fat > 100)) || (muscle !== null && (!Number.isFinite(muscle) || muscle < 0))) { setMessage("Enter a valid weight. Body-fat and muscle mass are optional."); return; }
    setSaving(true); setMessage(""); const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); setMessage("You need to be signed in to save a measurement."); return; }
    const { error } = await supabase.from("daily_wellness_logs").upsert({ user_id: user.id, log_date: selectedDate, bodyweight: value, body_fat_percentage: fat, muscle_mass_kg: muscle, bodyweight_logged_at: new Date(`${selectedDate}T${time}:00`).toISOString(), updated_at: new Date().toISOString() }, { onConflict: "user_id,log_date" });
    setSaving(false); if (error) { setMessage(error.message); return; } setMessage("Measurement saved."); await refresh();
  }
  async function clear() {
    if (!existing?.bodyweight || !confirm("Delete this day’s body-composition entry?")) return;
    const { error } = await supabase.from("daily_wellness_logs").update({ bodyweight: null, body_fat_percentage: null, muscle_mass_kg: null, bodyweight_logged_at: null }).eq("id", existing.id);
    if (!error) { setWeight(""); setBodyFat(""); setMuscleMass(""); setMessage("Measurement deleted."); await refresh(); }
  }
  return <main className="min-h-screen bg-cream px-4 py-5 text-dark md:px-8 md:py-7"><header className="mb-5 flex items-center gap-3"><button type="button" onClick={() => navigate("/wellness")} className="grid h-11 w-11 place-items-center rounded-full bg-panel shadow-sm"><ChevronLeft className="h-5 w-5" /></button><div><p className="text-xs font-bold uppercase tracking-[.18em] text-gold">Body composition</p><h1 className="text-2xl font-semibold">Measure, don’t obsess.</h1></div></header>
    <Surface className="mb-5 overflow-hidden border-0 bg-dark text-white"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/20 text-gold"><Scale /></span><div><p className="text-sm text-white/60">Latest weight</p><p className="text-3xl font-semibold">{existing?.bodyweight ? `${existing.bodyweight} kg` : "No measurement"}</p></div></div><p className="mt-5 text-sm text-white/65">Weight is the anchor. Body fat and muscle mass are optional readings for compatible scales or manual measurements.</p></Surface>
    <Surface className="mb-5"><div className="grid gap-4 md:grid-cols-3"><div><FieldLabel>Weight (kg) *</FieldLabel><TextInput type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="75.0" /></div><div><FieldLabel>Body fat (%)</FieldLabel><TextInput type="number" min="0" max="100" step="0.1" value={bodyFat} onChange={e => setBodyFat(e.target.value)} placeholder="Optional" /></div><div><FieldLabel>Muscle mass (kg)</FieldLabel><TextInput type="number" min="0" step="0.1" value={muscleMass} onChange={e => setMuscleMass(e.target.value)} placeholder="Optional" /></div></div><div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"><div className="w-full sm:max-w-44"><FieldLabel>Measurement time</FieldLabel><TextInput type="time" value={time} onChange={e => setTime(e.target.value)} /></div><Button onClick={save} disabled={saving}><Save className="h-4 w-4" />{saving ? "Saving…" : "Save measurement"}</Button>{existing?.bodyweight !== null && existing?.bodyweight !== undefined && <Button variant="ghost" onClick={clear}><Trash2 className="h-4 w-4" />Delete entry</Button>}</div>{message && <p className="mt-3 text-sm text-muted">{message}</p>}</Surface>
    <div className="grid gap-5 xl:grid-cols-2"><Surface><h2 className="text-lg font-semibold">Weight trend</h2><p className="mb-4 text-sm text-muted">Goal: {targets.weightGoal} kg</p>{loading ? <p className="text-sm text-muted">Loading…</p> : <MetricTrend points={readings.map((log: WellnessLog) => ({ date: log.log_date, value: log.bodyweight }))} target={targets.weightGoal} unit="kg" color="#d7a94b" />}</Surface><Surface><h2 className="text-lg font-semibold">Composition history</h2><div className="mt-4 space-y-2">{readings.slice().reverse().slice(0, 8).map((log: WellnessLog) => <div key={log.log_date} className="grid grid-cols-[1fr_auto_auto] gap-3 rounded-2xl bg-steel/5 p-3 text-sm"><span className="text-muted">{new Date(`${log.log_date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span><b>{log.bodyweight} kg</b><span className="text-muted">{log.body_fat_percentage !== null && log.body_fat_percentage !== undefined ? `${log.body_fat_percentage}% fat` : "—"}</span></div>)}{!readings.length && <p className="text-sm text-muted">Your saved measurements will appear here.</p>}</div></Surface></div>
  </main>;
}
