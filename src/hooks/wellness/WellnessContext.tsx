import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { OnboardingData, WellnessLog, WellnessTrackingPreferences } from "@/lib/types";
import { getWellnessTargets, getWellnessTracking } from "@/lib/wellnessTargets";

const WellnessContext = createContext<any>(null);

export function WellnessProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<WellnessLog[]>([]);
  const [targets, setTargets] = useState({ calories: 2400, proteinGrams: 140, waterLitres: 2.5, sleepHours: 8, carbsGrams: 300, fatsGrams: 70, weightGoal: 75 });
  const [tracking, setTracking] = useState<WellnessTrackingPreferences>({ food: true, water: true, sleep: true, body: true, heartRate: false, bloodPressure: false });
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
        const onboarding = profileRes.data.onboarding_data as OnboardingData;
        setTargets(getWellnessTargets(onboarding));
        setTracking(getWellnessTracking(onboarding));
    }
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  return <WellnessContext.Provider value={{ logs, targets, tracking, loading, refresh }}>{children}</WellnessContext.Provider>;
}

export const useWellness = () => useContext(WellnessContext);
