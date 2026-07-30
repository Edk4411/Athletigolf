import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { OnboardingData } from "@/lib/types";
import { getWellnessTargets } from "@/lib/wellnessTargets";

const WellnessContext = createContext<any>(null);

export function WellnessProvider({ children }: { children: ReactNode }) {
  const [targets, setTargets] = useState({ calories: 2400, proteinGrams: 140, waterLitres: 2.5, sleepHours: 8 });
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    
    const { data } = await supabase.from("profiles").select("onboarding_data").eq("id", user.id).maybeSingle();
    
    if (data) {
        setTargets(getWellnessTargets(data.onboarding_data as OnboardingData));
    }
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  return <WellnessContext.Provider value={{ targets, refresh }}>{children}</WellnessContext.Provider>;
}

export const useWellness = () => useContext(WellnessContext);
