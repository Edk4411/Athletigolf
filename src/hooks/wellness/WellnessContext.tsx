import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { OnboardingData, WellnessLog, WellnessTrackingPreferences } from "@/lib/types";
import { getWellnessTargets, getWellnessTracking } from "@/lib/wellnessTargets";
import { addDays, todayIso } from "@/lib/wellnessDates";

const WellnessContext = createContext<any>(null);

export function WellnessProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<WellnessLog[]>([]);
  const [targets, setTargets] = useState({ calories: 2400, proteinGrams: 140, waterLitres: 2.5, sleepHours: 8, carbsGrams: 300, fatsGrams: 70, weightGoal: 75, heartRateGoal: 60, bpSystolicGoal: 120, bpDiastolicGoal: 80 });
  const [tracking, setTracking] = useState<WellnessTrackingPreferences>({ food: true, water: true, sleep: true, body: true, heartRate: false, bloodPressure: false });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);

  async function refresh() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const startDate = addDays(selectedDate, -6);
    const [logsRes, foodRes, waterRes, profileRes] = await Promise.all([
        supabase.from("daily_wellness_logs").select("*").gte("log_date", startDate).lte("log_date", selectedDate).order("log_date", { ascending: true }),
        supabase.from("nutrition_entries").select("log_date, calories, protein_grams, carbs_grams, fats_grams").gte("log_date", startDate).lte("log_date", selectedDate),
        supabase.from("water_logs").select("log_date, amount_ml").gte("log_date", startDate).lte("log_date", selectedDate),
        supabase.from("profiles").select("onboarding_data").eq("id", user.id).maybeSingle()
    ]);

    const byDate = new Map<string, WellnessLog>();
    ((logsRes.data as WellnessLog[]) || []).forEach(log => {
      // Nutrition and water are entry-based. Do not surface obsolete cumulative
      // values from daily_wellness_logs alongside the live entry tables.
      byDate.set(log.log_date, {
        ...log,
        calories: 0,
        protein_grams: 0,
        carbs_grams: 0,
        fats_grams: 0,
        water_litres: 0,
      });
    });
    (foodRes.data || []).forEach((entry: any) => {
      const existing = byDate.get(entry.log_date) || ({ log_date: entry.log_date } as WellnessLog);
      existing.calories = (existing.calories || 0) + (entry.calories || 0);
      existing.protein_grams = (existing.protein_grams || 0) + (entry.protein_grams || 0);
      existing.carbs_grams = (existing.carbs_grams || 0) + (entry.carbs_grams || 0);
      existing.fats_grams = (existing.fats_grams || 0) + (entry.fats_grams || 0);
      byDate.set(entry.log_date, existing);
    });
    (waterRes.data || []).forEach((entry: any) => {
      const existing = byDate.get(entry.log_date) || ({ log_date: entry.log_date } as WellnessLog);
      existing.water_litres = (existing.water_litres || 0) + entry.amount_ml / 1000;
      byDate.set(entry.log_date, existing);
    });
    setLogs(Array.from(byDate.values()).sort((a, b) => a.log_date.localeCompare(b.log_date)));
    if (profileRes.data) {
        const onboarding = profileRes.data.onboarding_data as OnboardingData;
        setTargets(getWellnessTargets(onboarding));
        setTracking(getWellnessTracking(onboarding));
    }
    setLoading(false);
  }

  useEffect(() => { refresh(); }, [selectedDate]);

  return <WellnessContext.Provider value={{ logs, targets, tracking, loading, selectedDate, setSelectedDate, refresh }}>{children}</WellnessContext.Provider>;
}

export const useWellness = () => useContext(WellnessContext);
