import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { WellnessLog, OnboardingData } from "@/lib/types";
import { getWellnessTargets } from "@/lib/wellnessTargets";

export function useWellnessData() {
  const [logs, setLogs] = useState<WellnessLog[]>([]);
  const [targets, setTargets] = useState({ calories: 2400, proteinGrams: 140, waterLitres: 2.5, sleepHours: 8 });
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    
    const [logsRes, profileRes] = await Promise.all([
        supabase.from("daily_wellness_logs").select("*").order("log_date", { ascending: false }).limit(30),
        supabase.from("profiles").select("onboarding_data").eq("id", user.id).maybeSingle()
    ]);
    
    setLogs((logsRes.data as WellnessLog[]) || []);
    if (profileRes.data) {
        setTargets(getWellnessTargets(profileRes.data.onboarding_data as OnboardingData));
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  return { logs, targets, loading, refresh };
}