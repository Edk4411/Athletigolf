import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Bed, Plus } from "lucide-react";
import { Button, FieldLabel, Surface, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { WellnessLog } from "@/lib/types";

const todayIso = () => new Date().toISOString().split("T")[0];

export default function Sleep() {
  const [, navigate] = useLocation();
  const [logs, setLogs] = useState<WellnessLog[]>([]);
  const [sleepHours, setSleepHours] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    const { data } = await supabase
      .from("daily_wellness_logs")
      .select("*")
      .order("log_date", { ascending: false })
      .limit(30);
    setLogs((data as WellnessLog[]) || []);
    setLoading(false);
  }

  async function saveSleep() {
    const hours = parseFloat(sleepHours);
    if (isNaN(hours) || hours < 0) return;
    
    setSaving(true);
    const date = todayIso();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("daily_wellness_logs")
      .upsert({ 
          user_id: user.id, 
          log_date: date, 
          sleep_hours: hours,
          updated_at: new Date().toISOString()
      }, { onConflict: "user_id,log_date" });

    setSleepHours("");
    setSaving(false);
    loadLogs();
  }

  return (
    <main className="min-h-screen bg-[#f2f5f7] px-4 py-5 text-[#101d2b]">
      <div className="mb-5 flex items-center gap-3">
        <button type="button" onClick={() => navigate("/wellness")} className="rounded-full bg-white p-3 shadow-sm">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-black">Sleep Tracking</h1>
      </div>
      <Surface className="mb-5 rounded-[2rem] p-6">
        <div className="flex items-center gap-4 mb-4">
            <Bed className="h-10 w-10 text-pulse" />
            <div>
                <FieldLabel>Log Sleep (hours)</FieldLabel>
                <TextInput type="number" step="0.1" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} placeholder="e.g. 7.5" />
            </div>
            <Button onClick={saveSleep} disabled={saving}><Plus className="mr-2 h-4 w-4" /> Save</Button>
        </div>
      </Surface>
      <Surface className="rounded-[2rem] p-6">
        <h2 className="text-xl font-black mb-4">Recent History</h2>
        {loading ? <p>Loading...</p> : (
            <div className="grid gap-2">
                {logs.map(log => (
                    <div key={log.id} className="flex justify-between p-3 border-b border-line">
                        <span className="font-semibold">{log.log_date}</span>
                        <span>{log.sleep_hours} hours</span>
                    </div>
                ))}
            </div>
        )}
      </Surface>
    </main>
  );
}
