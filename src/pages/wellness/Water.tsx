import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Droplets, Plus, Trash2 } from "lucide-react";
import { Button, FieldLabel, Surface, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useWellness } from "@/hooks/wellness/WellnessContext";

type WaterEntry = { id: string; amount_ml: number; created_at: string };

export default function Water() {
  const [, navigate] = useLocation();
  const { targets, selectedDate, refresh } = useWellness();
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([]);
  const [waterMl, setWaterMl] = useState("");
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadWaterLogs();
  }, [selectedDate]);

  async function loadWaterLogs() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("water_logs").select("*").eq("user_id", user.id).eq("log_date", selectedDate).order("created_at", { ascending: false });
    setWaterEntries((data as WaterEntry[]) || []);
  }

  async function addWater() {
    const amountMl = parseInt(waterMl);
    if (!amountMl || amountMl <= 0) return;
    
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase.from("water_logs").insert({ user_id: user.id, log_date: selectedDate, amount_ml: amountMl, created_at: new Date(`${selectedDate}T${time}:00`).toISOString() });
    setWaterMl("");
    setSaving(false);
    if (!error) await Promise.all([loadWaterLogs(), refresh()]);
  }

  async function deleteWater(id: string) {
    if (!confirm("Delete this entry?")) return;
    const { error } = await supabase.from("water_logs").delete().eq("id", id);
    if (!error) await Promise.all([loadWaterLogs(), refresh()]);
  }

  const totalLitres = waterEntries.reduce((sum, entry) => sum + entry.amount_ml, 0) / 1000;
  const formatTime = (timestamp: string) => new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <main className="min-h-screen bg-[#f2f5f7] px-4 py-5 text-[#101d2b]">
      <div className="mb-5 flex items-center gap-3">
        <button type="button" onClick={() => navigate("/wellness")} className="rounded-full bg-white p-3 shadow-sm">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-black">Water ({selectedDate})</h1>
      </div>
      
      <Surface className="mb-5 rounded-[2rem] p-6">
        <div className="flex items-center gap-4 mb-4">
            <Droplets className="h-10 w-10 text-pulse" />
            <div className="flex-1">
                <FieldLabel>Log Water (ml)</FieldLabel>
                <TextInput type="number" value={waterMl} onChange={(e) => setWaterMl(e.target.value)} placeholder="e.g. 500" />
                <TextInput type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <Button onClick={addWater} disabled={saving}><Plus className="mr-2 h-4 w-4" /> Log</Button>
        </div>
        <p className="text-sm text-muted">Daily Target: {targets.waterLitres} L | Total: {totalLitres.toFixed(1)} L</p>
      </Surface>

      <Surface className="rounded-[2rem] p-6">
        <h2 className="text-xl font-black mb-4">Entries</h2>
        <div className="grid gap-2">
            {waterEntries.length === 0 && <p className="text-sm text-muted">No water logged for this date.</p>}
            {waterEntries.map(entry => (
                <div key={entry.id} className="flex justify-between items-center p-3 border-b border-line">
                    <span>{entry.amount_ml} ml · {formatTime(entry.created_at)}</span>
                    <button onClick={() => deleteWater(entry.id)} className="text-pulse"><Trash2 className="h-4 w-4" /></button>
                </div>
            ))}
        </div>
      </Surface>
    </main>
  );
}
