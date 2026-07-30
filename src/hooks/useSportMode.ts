import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { OnboardingData } from "@/lib/types";

export function useSportMode() {
  const { user } = useAuth();
  const [sportMode, setSportMode] = useState<OnboardingData["mainSport"]>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    supabase
      .from("profiles")
      .select("onboarding_data")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const onboarding = (data?.onboarding_data as OnboardingData | null) || null;
        setSportMode(onboarding?.mainSport || "both");
        setLoading(false);
      });
  }, [user]);

  return { sportMode, loading };
}
