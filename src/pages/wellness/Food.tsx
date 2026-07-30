import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Flame, Plus, Trash2 } from "lucide-react";
import { Button, FieldLabel, SelectInput, Surface, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { FoodSearchResult, NutritionEntry, SavedFood, OnboardingData } from "@/lib/types";
import { getWellnessTargets } from "@/lib/wellnessTargets";

const todayIso = () => new Date().toISOString().split("T")[0];

const mealTypes: Array<{ value: NutritionEntry["meal_type"]; label: string }> = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snacks" },
];

function getNutritionTotals(entries: NutritionEntry[]) {
  return entries.reduce((acc, entry) => ({
    calories: acc.calories + (entry.calories || 0),
    protein: acc.protein + (entry.protein_grams || 0),
    carbs: acc.carbs + (entry.carbs_grams || 0),
    fats: acc.fats + (entry.fats_grams || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
}

export default function Food() {
  const [, navigate] = useLocation();
  const [nutritionEntries, setNutritionEntries] = useState<NutritionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState({ calories: 2400, protein: 140, carbs: 300, fat: 70 });

  useEffect(() => {
    loadFoodData();
  }, []);

  async function loadFoodData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [entriesRes, profileRes] = await Promise.all([
        supabase.from("nutrition_entries").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(120),
        supabase.from("profiles").select("onboarding_data").eq("id", user.id).maybeSingle()
    ]);

    setNutritionEntries((entriesRes.data as NutritionEntry[]) || []);
    if (profileRes.data) {
        const targets = getWellnessTargets(profileRes.data.onboarding_data as OnboardingData);
        setTarget({
            calories: targets.calories,
            protein: targets.proteinGrams,
            carbs: (profileRes.data.onboarding_data as any)?.wellness?.targets?.carbsTarget || 300,
            fat: (profileRes.data.onboarding_data as any)?.wellness?.targets?.fatTarget || 70,
        });
    }
    setLoading(false);
  }

  const activeEntries = useMemo(() => nutritionEntries.filter((e) => e.log_date === todayIso()), [nutritionEntries]);
  const totals = useMemo(() => getNutritionTotals(activeEntries), [activeEntries]);

  return (
    <main className="min-h-screen bg-[#f2f5f7] px-4 py-5 text-[#101d2b] md:px-8 md:py-7">
        <section className="mb-5 flex items-center justify-between gap-3">
          <button type="button" onClick={() => navigate("/wellness")} className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#101d2b] shadow-sm">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight text-[#101d2b]">Nutrition</h1>
          </div>
          <span className="h-12 w-12" aria-hidden="true" />
        </section>

        <Surface className="mb-5 rounded-[2rem] border-0 bg-white shadow-sm p-6">
            <div className="flex items-center gap-4 mb-4">
                <Flame className="h-10 w-10 text-pulse" />
                <div className="flex-1">
                    <h2 className="text-lg font-black">Daily Goals vs Intake</h2>
                    <div className="grid grid-cols-4 gap-2 text-center text-sm font-bold text-muted mt-2">
                        <div>{totals.calories}/{target.calories}<br/>Cal</div>
                        <div>{totals.protein}/{target.protein}<br/>Pro</div>
                        <div>{totals.carbs}/{target.carbs}<br/>Carbs</div>
                        <div>{totals.fats}/{target.fat}<br/>Fat</div>
                    </div>
                </div>
            </div>
        </Surface>

        <Surface className="mb-5 rounded-[2rem] border-0 bg-white shadow-sm p-6">
            <h2 className="text-xl font-black mb-4">Statistics</h2>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-panel p-4 rounded-xl">
                    <p className="text-sm text-muted">Avg Cal/Day (7d)</p>
                    <p className="text-xl font-black">{Math.round(nutritionEntries.slice(0, 7).reduce((a, b) => a + (b.calories || 0), 0) / 7)}</p>
                </div>
                <div className="bg-panel p-4 rounded-xl">
                    <p className="text-sm text-muted">Avg Protein/Day (7d)</p>
                    <p className="text-xl font-black">{Math.round(nutritionEntries.slice(0, 7).reduce((a, b) => a + (b.protein_grams || 0), 0) / 7)}g</p>
                </div>
            </div>
        </Surface>

        <Surface className="rounded-[2rem] border-0 bg-white shadow-sm p-6">
            <h2 className="text-xl font-black mb-4">7 Day History</h2>
            {loading ? <p>Loading...</p> : (
                <div className="grid gap-2">
                    {nutritionEntries.slice(0, 7).map(log => (
                        <div key={log.id} className="flex justify-between p-3 border-b border-line">
                            <span className="font-semibold">{log.log_date}</span>
                            <span>{log.calories || 0} kcal</span>
                        </div>
                    ))}
                </div>
            )}
        </Surface>
    </main>
  );
}