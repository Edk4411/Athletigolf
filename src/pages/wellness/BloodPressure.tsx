import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Gauge, Plus, Trash2 } from "lucide-react";
import { Button, FieldLabel, Surface, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useWellness } from "@/hooks/wellness/WellnessContext";
import type { WellnessLog } from "@/lib/types";
import { sevenDayWindow } from "@/lib/wellnessDates";

export default function BloodPressure() {
  const [, navigate] = useLocation();
  const { logs, targets, refresh, loading, selectedDate } = useWellness();
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const existing = useMemo(() => logs.find((log: WellnessLog) => log.log_date === selectedDate), [logs, selectedDate]);

  const filteredLogs = useMemo(() => {
    return sevenDayWindow(selectedDate).map(date => logs.find((log: WellnessLog) => log.log_date === date) || ({ id: date, log_date: date } as WellnessLog));
  }, [logs, selectedDate]);

  async function saveBp() {
    const sysVal = parseInt(sys);
    const diaVal = parseInt(dia);
    if (isNaN(sysVal) || isNaN(diaVal) || sysVal <= 0 || diaVal <= 0) return;
    
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); setSaveError("You need to be signed in to save blood pressure."); return; }

    const { error } = await supabase
      .from("daily_wellness_logs")
      .upsert({ 
          user_id: user.id, 
          log_date: selectedDate,
          blood_pressure_systolic: sysVal,
          blood_pressure_diastolic: diaVal,
          blood_pressure_logged_at: new Date(`${selectedDate}T${time}:00`).toISOString()
      }, { onConflict: "user_id,log_date" });

    setSaving(false);
    if (error) { setSaveError(error.message); return; }
    setSaveError(""); setSys(""); setDia("");
    await refresh();
  }
  async function clearBp() {
    if (!existing?.blood_pressure_systolic || !confirm("Delete this day’s blood-pressure reading?")) return;
    const { error } = await supabase.from("daily_wellness_logs").update({ blood_pressure_systolic: null, blood_pressure_diastolic: null, blood_pressure_logged_at: null }).eq("id", existing.id);
    if (!error) { setSys(""); setDia(""); await refresh(); }
  }

  return (
    <main className="min-h-screen bg-[#f2f5f7] px-4 py-5 text-[#101d2b]">
      <div className="mb-5 flex items-center gap-3">
        <button type="button" onClick={() => navigate("/wellness")} className="rounded-full bg-white p-3 shadow-sm">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-black">Blood Pressure for {selectedDate}</h1>
      </div>
      
      <Surface className="mb-5 rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 mb-4">
            <div className="flex items-center gap-4">
                <Gauge className="h-10 w-10 text-pulse" />
                <div className="grid grid-cols-2 gap-4 flex-1">
                    <div>
                        <FieldLabel>Systolic (mmHg)</FieldLabel>
                        <TextInput type="number" value={sys} onChange={(e) => setSys(e.target.value)} placeholder="e.g. 120" />
                    </div>
                    <div>
                        <FieldLabel>Diastolic (mmHg)</FieldLabel>
                        <TextInput type="number" value={dia} onChange={(e) => setDia(e.target.value)} placeholder="e.g. 80" />
                    </div>
                </div>
            </div>
            <div>
                <FieldLabel>Time</FieldLabel>
                <TextInput type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
            <Button onClick={saveBp} disabled={saving}><Plus className="mr-2 h-4 w-4" /> Save</Button>
            {existing?.blood_pressure_systolic !== null && existing?.blood_pressure_systolic !== undefined && <Button variant="ghost" onClick={clearBp}><Trash2 className="mr-2 h-4 w-4" /> Delete reading</Button>}
        </div>
        <p className="text-sm text-muted">Baseline Target: {targets.bpSystolicGoal}/{targets.bpDiastolicGoal} mmHg</p>
        {saveError && <p className="mt-2 text-sm text-danger">{saveError}</p>}
      </Surface>
      
      <Surface className="rounded-[2rem] p-6">
        <h2 className="text-xl font-black mb-4">7 Day Trend (Systolic)</h2>
        {loading ? <p>Loading...</p> : (
            <div className="flex items-end justify-between h-40 gap-2">
                {filteredLogs.map((log: WellnessLog) => {
                    const val = log.blood_pressure_systolic ?? 0;
                    const height = Math.min(100, (val / (targets.bpSystolicGoal * 1.5)) * 100);
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

