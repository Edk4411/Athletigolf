import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, HeartPulse, Plus, Trash2 } from "lucide-react";
import { Button, FieldLabel, Surface, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useWellness } from "@/hooks/wellness/WellnessContext";
import type { WellnessLog } from "@/lib/types";
import { sevenDayWindow } from "@/lib/wellnessDates";

export default function HeartRate() {
  const [, navigate] = useLocation();
  const { logs, targets, refresh, loading, selectedDate } = useWellness();
  const [hr, setHr] = useState("");
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const existing = useMemo(() => logs.find((log: WellnessLog) => log.log_date === selectedDate), [logs, selectedDate]);

  const filteredLogs = useMemo(() => {
    return sevenDayWindow(selectedDate).map(date => logs.find((log: WellnessLog) => log.log_date === date) || ({ id: date, log_date: date } as WellnessLog));
  }, [logs, selectedDate]);

  async function saveHr() {
    const hrVal = parseInt(hr);
    if (isNaN(hrVal) || hrVal <= 0) return;

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); setSaveError("You need to be signed in to save heart rate."); return; }

    const { error } = await supabase
      .from("daily_wellness_logs")
      .upsert({ 
          user_id: user.id, 
          log_date: selectedDate,
          resting_heart_rate: hrVal,
          heart_rate_logged_at: new Date(`${selectedDate}T${time}:00`).toISOString()
      }, { onConflict: "user_id,log_date" });

    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setSaveError(""); setHr("");
    await refresh();
  }
  async function clearHr() {
    if (!existing?.resting_heart_rate || !confirm("Delete this day’s heart-rate reading?")) return;
    const { error } = await supabase.from("daily_wellness_logs").update({ resting_heart_rate: null, heart_rate_logged_at: null }).eq("id", existing.id);
    if (!error) { setHr(""); await refresh(); }
  }

  return (
    <main className="min-h-screen bg-[#f2f5f7] px-4 py-5 text-[#101d2b]">
      <div className="mb-5 flex items-center gap-3">
        <button type="button" onClick={() => navigate("/wellness")} className="rounded-full bg-white p-3 shadow-sm">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-black">Heart Rate for {selectedDate}</h1>
      </div>

      <Surface className="mb-5 rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 mb-4">
            <div className="flex items-center gap-4">
                <HeartPulse className="h-10 w-10 text-pulse" />
                <div className="flex-1">
                    <FieldLabel>Resting Heart Rate (bpm)</FieldLabel>
                    <TextInput type="number" value={hr} onChange={(e) => setHr(e.target.value)} placeholder="e.g. 60" />
                </div>
            </div>
            <div>
                <FieldLabel>Time</FieldLabel>
                <TextInput type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
            <Button onClick={saveHr} disabled={saving}><Plus className="mr-2 h-4 w-4" /> Save</Button>
            {existing?.resting_heart_rate !== null && existing?.resting_heart_rate !== undefined && <Button variant="ghost" onClick={clearHr}><Trash2 className="mr-2 h-4 w-4" /> Delete reading</Button>}
        </div>
        <p className="text-sm text-muted">Baseline Target: {targets.heartRateGoal} bpm</p>
        {saveError && <p className="mt-2 text-sm text-danger">{saveError}</p>}
      </Surface>

      <Surface className="rounded-[2rem] p-6">
        <h2 className="text-xl font-black mb-4">7 Day Trend</h2>
        {loading ? <p>Loading...</p> : (
            <div className="flex items-end justify-between h-40 gap-2">
                {filteredLogs.map((log: WellnessLog) => {
                    const bpm = log.resting_heart_rate ?? 0;
                    const height = Math.min(100, (bpm / (targets.heartRateGoal * 1.5)) * 100);
                    return (
                        <div key={log.id} className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-full bg-pulse/20 rounded-t-lg relative" style={{ height: '100%' }}>
                                <div className="absolute bottom-0 w-full bg-pulse rounded-t-lg" style={{ height: `${height}%` }} />
                            </div>
                            <span className="text-xs font-bold">{log.log_date.split("-")[2]}</span>
                        </div>
                    );
                })}
            </div>
        )}
      </Surface>
    </main>
  );
}
