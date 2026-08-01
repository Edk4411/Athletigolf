import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Gauge, Plus } from "lucide-react";
import { Button, FieldLabel, Surface, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useWellness } from "@/hooks/wellness/WellnessContext";
import type { WellnessLog } from "@/lib/types";

const todayIso = () => new Date().toISOString().split("T")[0];

export default function BloodPressure() {
  const [, navigate] = useLocation();
  const { logs, targets, refresh, loading } = useWellness();
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredLogs = useMemo(() => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    return logs.filter((log: WellnessLog) => {
        const logDate = new Date(log.log_date);
        return logDate >= sevenDaysAgo && logDate <= today;
    }).sort((a: WellnessLog, b: WellnessLog) => a.log_date.localeCompare(b.log_date));
  }, [logs]);

  async function saveBp() {
    const sysVal = parseInt(sys);
    const diaVal = parseInt(dia);
    if (isNaN(sysVal) || isNaN(diaVal) || sysVal <= 0 || diaVal <= 0) return;
    
    setSaving(true);
    const date = todayIso();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("daily_wellness_logs")
      .upsert({ 
          user_id: user.id, 
          log_date: date, 
          blood_pressure_systolic: sysVal,
          blood_pressure_diastolic: diaVal,
          updated_at: new Date().toISOString()
      }, { onConflict: "user_id,log_date" });

    setSys("");
    setDia("");
    setSaving(false);
    refresh();
  }

  return (
    <main className="min-h-screen bg-[#f2f5f7] px-4 py-5 text-[#101d2b]">
      <div className="mb-5 flex items-center gap-3">
        <button type="button" onClick={() => navigate("/wellness")} className="rounded-full bg-white p-3 shadow-sm">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-black">Blood Pressure</h1>
      </div>
      
      <Surface className="mb-5 rounded-[2rem] p-6">
        <div className="flex items-center gap-4 mb-4">
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
            <Button onClick={saveBp} disabled={saving}><Plus className="mr-2 h-4 w-4" /> Save</Button>
        </div>
        <p className="text-sm text-muted">Baseline Target: {targets.bpSystolicGoal}/{targets.bpDiastolicGoal} mmHg</p>
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

