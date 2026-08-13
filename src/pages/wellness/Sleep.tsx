import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Bed, Plus } from "lucide-react";
import { Button, FieldLabel, Surface, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useWellness } from "@/hooks/wellness/WellnessContext";
import type { WellnessLog } from "@/lib/types";
import { weekWindow } from "@/lib/wellnessDates";

export default function Sleep() {
  const [, navigate] = useLocation();
  const { logs, targets, refresh, loading, selectedDate } = useWellness();
  const [sleepHours, setSleepHours] = useState("");
  const [sleepScore, setSleepScore] = useState("");
  const [bedtime, setBedtime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const filteredLogs = useMemo(() => {
    return weekWindow(selectedDate).map(date => logs.find((log: WellnessLog) => log.log_date === date) || ({ id: date, log_date: date } as WellnessLog));
  }, [logs, selectedDate]);

  useEffect(() => {
    const existing = logs.find((log: WellnessLog) => log.log_date === selectedDate);
    setSleepHours(existing?.sleep_hours?.toString() || "");
    setSleepScore(existing?.sleep_score?.toString() || "");
  }, [logs, selectedDate]);

  async function saveSleep() {
    const hours = parseFloat(sleepHours);
    const score = parseFloat(sleepScore);
    if (isNaN(hours) || hours < 0 || isNaN(score) || score < 0 || score > 10) {
      setSaveError("Enter hours slept and a sleep score from 0 to 10.");
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); setSaveError("You need to be signed in to save sleep."); return; }

    const { error } = await supabase
      .from("daily_wellness_logs")
      .upsert({ 
          user_id: user.id, 
          log_date: selectedDate,
          sleep_hours: hours,
          sleep_score: score,
          sleep_started_at: bedtime ? new Date(`${selectedDate}T${bedtime}:00`).toISOString() : null,
          sleep_ended_at: wakeTime ? new Date(`${selectedDate}T${wakeTime}:00`).toISOString() : null,
          updated_at: new Date().toISOString()
      }, { onConflict: "user_id,log_date" });

    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setSaveError("");
    await refresh();
  }

  return (
    <main className="min-h-screen bg-[#f2f5f7] px-4 py-5 text-[#101d2b]">
      <div className="mb-5 flex items-center gap-3">
        <button type="button" onClick={() => navigate("/wellness")} className="rounded-full bg-white p-3 shadow-sm">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-black">Sleep Tracking ({selectedDate})</h1>
      </div>

      <Surface className="mb-5 rounded-[2rem] p-6">
        <div className="flex items-center gap-4 mb-4">
            <Bed className="h-10 w-10 text-pulse" />
            <div className="flex-1">
                <FieldLabel>Log Sleep (hours)</FieldLabel>
                <TextInput type="number" step="0.1" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} placeholder="e.g. 7.5" />
            </div>
            <div className="flex-1">
                <FieldLabel>Sleep score / 10</FieldLabel>
                <TextInput type="number" min="0" max="10" step="0.1" value={sleepScore} onChange={(e) => setSleepScore(e.target.value)} placeholder="e.g. 8" />
            </div>
            <TextInput type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} aria-label="Bedtime" />
            <TextInput type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} aria-label="Wake time" />
            <Button onClick={saveSleep} disabled={saving}><Plus className="mr-2 h-4 w-4" /> Save</Button>
        </div>
        <p className="text-sm text-muted">Daily Target: {targets.sleepHours} hours</p>
        {saveError && <p className="mt-2 text-sm text-danger">{saveError}</p>}
      </Surface>

      <Surface className="rounded-[2rem] p-6">
        <h2 className="text-xl font-black mb-4">Weekly Sleep Pattern</h2>
        {loading ? <p>Loading...</p> : (
            <div className="flex items-end justify-between h-40 gap-2">
                {filteredLogs.map((log: WellnessLog) => {
                    const hours = log.sleep_hours ?? 0;
                    const height = Math.min(100, (hours / targets.sleepHours) * 100);
                    return (
                        <div key={log.id} className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-full bg-pulse/20 rounded-t-lg relative" style={{ height: '100%' }}>
                                <div className="absolute bottom-0 w-full bg-pulse rounded-t-lg" style={{ height: `${height}%` }} />
                            </div>
                            <span className="text-xs font-bold">{log.log_date.split("-")[2]}</span>
                            <span className="text-[10px] text-muted">{log.sleep_score ?? "-"}/10</span>
                        </div>
                    );
                })}
            </div>
        )}
      </Surface>
    </main>
  );
}
