import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Flame, Plus } from "lucide-react";
import { Button, Surface, TextInput, SelectInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { NutritionEntry } from "@/lib/types";
import { useWellness } from "@/hooks/wellness/WellnessContext";

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
  const { targets, selectedDate, refresh } = useWellness();
  const [nutritionEntries, setNutritionEntries] = useState<NutritionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [mealType, setMealType] = useState<NutritionEntry["meal_type"]>("snack");
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));

  useEffect(() => {
    loadFoodData();
  }, [selectedDate]);

  async function loadFoodData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase.from("nutrition_entries").select("*").eq("user_id", user.id).eq("log_date", selectedDate).order("created_at", { ascending: false });

    setNutritionEntries((data as NutritionEntry[]) || []);
    setLoading(false);
  }

  async function addMeal() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !foodName) return;

    await supabase.from("nutrition_entries").insert({
        user_id: user.id,
        log_date: selectedDate,
        food_name: foodName,
        calories: parseInt(calories) || 0,
        protein_grams: parseInt(protein) || 0,
        carbs_grams: parseInt(carbs) || 0,
        fats_grams: parseInt(fats) || 0,
        meal_type: mealType,
        created_at: new Date(`${selectedDate}T${time}:00`).toISOString()
    });
    setFoodName(""); setCalories(""); setProtein(""); setCarbs(""); setFats("");
    loadFoodData();
    refresh();
  }

  const totals = useMemo(() => getNutritionTotals(nutritionEntries), [nutritionEntries]);

  return (
    <main className="min-h-screen bg-[#f2f5f7] px-4 py-5 text-[#101d2b] md:px-8 md:py-7">
        <section className="mb-5 flex items-center justify-between gap-3">
          <button type="button" onClick={() => navigate("/wellness")} className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#101d2b] shadow-sm">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight text-[#101d2b]">Nutrition ({selectedDate})</h1>
          </div>
          <span className="h-12 w-12" aria-hidden="true" />
        </section>

        <Surface className="mb-5 rounded-[2rem] border-0 bg-white shadow-sm p-6">
            <div className="flex flex-col gap-4 mb-4">
                <TextInput value={foodName} onChange={e => setFoodName(e.target.value)} placeholder="Food name" />
                <div className="grid grid-cols-2 gap-2">
                    <TextInput type="number" value={calories} onChange={e => setCalories(e.target.value)} placeholder="Calories" />
                    <TextInput type="number" value={protein} onChange={e => setProtein(e.target.value)} placeholder="Protein (g)" />
                    <TextInput type="number" value={carbs} onChange={e => setCarbs(e.target.value)} placeholder="Carbs (g)" />
                    <TextInput type="number" value={fats} onChange={e => setFats(e.target.value)} placeholder="Fats (g)" />
                </div>
                <SelectInput value={mealType} onChange={e => setMealType(e.target.value as any)}>
                    {mealTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                </SelectInput>
                <TextInput type="time" value={time} onChange={e => setTime(e.target.value)} />
                <Button onClick={addMeal}><Plus className="mr-2 h-4 w-4" /> Add Meal</Button>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-center text-sm font-bold text-muted mt-4 pt-4 border-t border-line">
                <div>{totals.calories}/{Math.round(targets.calories)}<br/>Cal</div>
                <div>{totals.protein}/{Math.round(targets.proteinGrams)}<br/>Pro</div>
                <div>{totals.carbs}/{Math.round(targets.carbsGrams || 300)}<br/>Carbs</div>
                <div>{totals.fats}/{Math.round(targets.fatsGrams || 70)}<br/>Fat</div>
            </div>
        </Surface>

        <Surface className="rounded-[2rem] border-0 bg-white shadow-sm p-6">
            <h2 className="text-xl font-black mb-4">Entries</h2>
            {loading ? <p>Loading...</p> : (
                <div className="grid gap-2">
                    {nutritionEntries.map(log => (
                        <div key={log.id} className="flex justify-between p-3 border-b border-line">
                            <div>
                                <p className="font-semibold">{log.food_name}</p>
                                <p className="text-xs text-muted">{log.meal_type}</p>
                            </div>
                            <span>{log.calories || 0} kcal</span>
                        </div>
                    ))}
                </div>
            )}
        </Surface>
    </main>
  );
}
