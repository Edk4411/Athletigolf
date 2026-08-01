import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Droplets, Plus } from "lucide-react";
import { Button, FieldLabel, Surface, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useWellness } from "@/hooks/wellness/WellnessContext";
import type { WellnessLog } from "@/lib/types";

const todayIso = () => new Date().toISOString().split("T")[0];

export default function Water() {
  const [, navigate] = useLocation();
  const { logs, targets, refresh, loading } = useWellness();
  const [waterMl, setWaterMl] = useState("");
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

  async function addWater() {
    const amountMl = parseInt(waterMl);
    if (!amountMl || amountMl <= 0) return;
    
    setSaving(true);
    const date = todayIso();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get current log
    const { data: existing } = await supabase
        .from("daily_wellness_logs")
        .select("water_litres")
        .eq("user_id", user.id)
        .eq("log_date", date)
        .maybeSingle();
    
    const currentLitres = existing?.water_litres || 0;
    const newLitres = currentLitres + (amountMl / 1000);

    await supabase
      .from("daily_wellness_logs")
      .upsert({ 
          user_id: user.id, 
          log_date: date, 
          water_litres: newLitres,
          updated_at: new Date().toISOString()
      }, { onConflict: "user_id,log_date" });

    setWaterMl("");
    setSaving(false);
    refresh();
  }

  return (
    <main className="min-h-screen bg-[#f2f5f7] px-4 py-5 text-[#101d2b]">
      <div className="mb-5 flex items-center gap-3">
        <button type="button" onClick={() => navigate("/wellness")} className="rounded-full bg-white p-3 shadow-sm">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-black">Water Tracking</h1>
      </div>
      
      <Surface className="mb-5 rounded-[2rem] p-6">
        <div className="flex items-center gap-4 mb-4">
            <Droplets className="h-10 w-10 text-pulse" />
            <div className="flex-1">
                <FieldLabel>Log Water (ml)</FieldLabel>
                <TextInput type="number" value={waterMl} onChange={(e) => setWaterMl(e.target.value)} placeholder="e.g. 500" />
            </div>
            <Button onClick={addWater} disabled={saving}><Plus className="mr-2 h-4 w-4" /> Log</Button>
        </div>
        <p className="text-sm text-muted">Daily Target: {targets.waterLitres} L</p>
      </Surface>

      <Surface className="rounded-[2rem] p-6">
        <h2 className="text-xl font-black mb-4">7 Day Trend</h2>
        {loading ? <p>Loading...</p> : (
            <div className="flex items-end justify-between h-40 gap-2">
                {filteredLogs.map((log: WellnessLog) => {
                    const litres = log.water_litres ?? 0;
                    const height = Math.min(100, (litres / targets.waterLitres) * 100);
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
