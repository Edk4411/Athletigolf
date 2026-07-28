import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Copy, Database, Flame, Plus, Search, Trash2, Utensils, Pencil, Scale } from "lucide-react";
import { Button, FieldLabel, SelectInput, Surface, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { FoodSearchResult, NutritionEntry, SavedFood } from "@/lib/types";
import { formatWater } from "@/lib/waterFormatting";

const toLocalIso = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const parseLocalIso = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};
const todayIso = () => toLocalIso(new Date());

const mealTypes: Array<{ value: NutritionEntry["meal_type"]; label: string }> = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snacks" },
];

const blankFoodForm = {
  meal_type: "breakfast" as NutritionEntry["meal_type"],
  food_name: "",
  serving: "",
  calories: "",
  protein_grams: "",
  carbs_grams: "",
  fats_grams: "",
  saturated_fats_grams: "",
  sugars_grams: "",
  source: "manual" as "manual" | "open_food_facts" | "usda",
  external_id: "",
  brand: "",
  barcode: "",
  serving_grams: "",
  serving_label: "",
  calories_per_100g: "",
  protein_per_100g: "",
  carbs_per_100g: "",
  fats_per_100g: "",
  saturated_fats_per_100g: "",
  sugars_per_100g: "",
};

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function toInteger(value: string) {
  const parsed = toNumber(value);
  return parsed === null ? null : Math.round(parsed);
}
function toFormValue(value: number | null | undefined) {
  return value === null || value === undefined ? "" : `${value}`;
}
function formatDate(value: string) {
  return parseLocalIso(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
function formatMealLabel(value: NutritionEntry["meal_type"]) {
  return mealTypes.find((meal) => meal.value === value)?.label || value;
}
function mealSkipKey(date: string, meal: NutritionEntry["meal_type"]) {
  return `${date}:${meal}`;
}
function getNutritionTotals(entries: NutritionEntry[]) {
  return entries.reduce((acc, entry) => ({
    calories: acc.calories + (entry.calories || 0),
    protein: acc.protein + (entry.protein_grams || 0),
    carbs: acc.carbs + (entry.carbs_grams || 0),
    fats: acc.fats + (entry.fats_grams || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
}
function formatFoodSource(source: string) {
  return source === "open_food_facts" ? "Open Food Facts" : source === "usda" ? "USDA" : "Manual";
}
function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : `${Math.round(value)}`;
}
function formatGrams(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : `${Math.round(value)} g`;
}
function calculateMacros(food: FoodSearchResult, grams: number) {
  const multiplier = grams / 100;
  return {
    calories: roundMacro(food.caloriesPer100g, multiplier),
    protein: roundMacro(food.proteinPer100g, multiplier),
    carbs: roundMacro(food.carbsPer100g, multiplier),
    fats: roundMacro(food.fatsPer100g, multiplier),
    saturatedFats: roundMacro(food.saturatedFatsPer100g, multiplier),
    sugars: roundMacro(food.sugarsPer100g, multiplier),
  };
}
function roundMacro(value: number | null, multiplier: number) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 0;
  return Math.round(value * multiplier);
}
function hasPer100gNutrition(food: FoodSearchResult) {
  return [food.caloriesPer100g, food.proteinPer100g, food.carbsPer100g, food.fatsPer100g, food.saturatedFatsPer100g, food.sugarsPer100g].some((v) => v !== null && v !== undefined && Number.isFinite(v));
}
function foodResultFromForm(form: typeof blankFoodForm): FoodSearchResult | null {
  if (form.source === "manual") return null;
  return {
    id: form.external_id || form.food_name,
    source: form.source,
    name: form.food_name,
    brand: form.brand || null,
    barcode: form.barcode || null,
    servingLabel: form.serving_label || null,
    servingGrams: toNumber(form.serving_grams),
    caloriesPer100g: toNumber(form.calories_per_100g),
    proteinPer100g: toNumber(form.protein_per_100g),
    carbsPer100g: toNumber(form.carbs_per_100g),
    fatsPer100g: toNumber(form.fats_per_100g),
    saturatedFatsPer100g: toNumber(form.saturated_fats_per_100g),
    sugarsPer100g: toNumber(form.sugars_per_100g),
  };
}
function parseServingGrams(value: string) {
  const match = value.trim().match(/(\d+(?:\.\d+)?)\s*(kg|kilogram|kilograms|g|gram|grams)\b/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = match[2].toLowerCase();
  return unit.startsWith("kg") || unit.startsWith("kilogram") ? amount * 1000 : amount;
}
function formatServingGrams(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1).replace(/\.0$/, "");
}

export default function Food() {
  const [, navigate] = useLocation();
  const [nutritionEntries, setNutritionEntries] = useState<NutritionEntry[]>([]);
  const [savedFoods, setSavedFoods] = useState<SavedFood[]>([]);
  const [activeNutritionDate, setActiveNutritionDate] = useState(todayIso());
  const [foodForm, setFoodForm] = useState(blankFoodForm);
  const [savedFoodForm, setSavedFoodForm] = useState(blankFoodForm);
  const [activeMeal, setActiveMeal] = useState<NutritionEntry["meal_type"]>("breakfast");
  const [quickCalories, setQuickCalories] = useState("");
  const [reuseMeal, setReuseMeal] = useState<{ sourceMeal: NutritionEntry["meal_type"]; selectedIds: string[]; } | null>(null);
  const [skippedMeals, setSkippedMeals] = useState<string[]>([]);
  const [selectedSavedFood, setSelectedSavedFood] = useState("");
  const [editingSavedFoodId, setEditingSavedFoodId] = useState("");
  const [saveAsPreset, setSaveAsPreset] = useState(false);
  const [foodSearchQuery, setFoodSearchQuery] = useState("");
  const [foodSearchSource, setFoodSearchSource] = useState<"all" | "open_food_facts" | "usda">("all");
  const [foodSearchResults, setFoodSearchResults] = useState<FoodSearchResult[]>([]);
  const [selectedFoodResult, setSelectedFoodResult] = useState<FoodSearchResult | null>(null);
  const [foodSearchWarnings, setFoodSearchWarnings] = useState<string[]>([]);
  const [searchingFoods, setSearchingFoods] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadFoodData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [entries, foods] = await Promise.all([
      supabase.from("nutrition_entries").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(120),
      supabase.from("saved_foods").select("*").eq("user_id", user.id).order("food_name", { ascending: true }),
    ]);
    setNutritionEntries((entries.data as NutritionEntry[]) || []);
    setSavedFoods((foods.data as SavedFood[]) || []);
    setLoading(false);
  }
  useEffect(() => { loadFoodData(); }, []);

  const activeEntries = useMemo(() => nutritionEntries.filter((e) => e.log_date === activeNutritionDate), [nutritionEntries, activeNutritionDate]);
  const activeMealEntries = useMemo(() => activeEntries.filter((e) => e.meal_type === activeMeal), [activeEntries, activeMeal]);
  const activeMealSkipped = skippedMeals.includes(mealSkipKey(activeNutritionDate, activeMeal));
  const availableNutritionDates = useMemo(() => Array.from(new Set(nutritionEntries.map((e) => e.log_date))).filter((d) => d !== activeNutritionDate).sort((a, b) => b.localeCompare(a)), [nutritionEntries, activeNutritionDate]);
  const nutritionTotals = useMemo(() => getNutritionTotals(activeEntries), [activeEntries]);

  async function saveFoodEntry(event: React.FormEvent) {
    event.preventDefault();
    if (!foodForm.food_name.trim()) return;
    setSaving(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("You need to be signed in to save nutrition entries."); setSaving(false); return; }
    const payload = {
      user_id: user.id,
      log_date: activeNutritionDate,
      meal_type: foodForm.meal_type,
      food_name: foodForm.food_name.trim(),
      serving: foodForm.serving.trim() || null,
      calories: toInteger(foodForm.calories) || 0,
      protein_grams: toInteger(foodForm.protein_grams) || 0,
      carbs_grams: toInteger(foodForm.carbs_grams) || 0,
      fats_grams: toInteger(foodForm.fats_grams) || 0,
      saturated_fats_grams: toInteger(foodForm.saturated_fats_grams) || 0,
      sugars_grams: toInteger(foodForm.sugars_grams) || 0,
      source: foodForm.source || "manual",
      external_id: foodForm.external_id || null,
      brand: foodForm.brand || null,
      barcode: foodForm.barcode || null,
      serving_grams: toNumber(foodForm.serving_grams),
      serving_label: foodForm.serving_label || null,
      calories_per_100g: toNumber(foodForm.calories_per_100g),
      protein_per_100g: toNumber(foodForm.protein_per_100g),
      carbs_per_100g: toNumber(foodForm.carbs_per_100g),
      fats_per_100g: toNumber(foodForm.fats_per_100g),
      saturated_fats_per_100g: toNumber(foodForm.saturated_fats_per_100g),
      sugars_per_100g: toNumber(foodForm.sugars_per_100g),
      updated_at: new Date().toISOString(),
    };
    const { error: entryError } = await supabase.from("nutrition_entries").insert(payload);
    if (entryError) { setError(entryError.message); setSaving(false); return; }
    if (saveAsPreset) {
      await supabase.from("saved_foods").insert({ ...payload, user_id: user.id });
    }
    setFoodForm((prev) => ({ ...blankFoodForm, meal_type: prev.meal_type }));
    setSelectedSavedFood("");
    setSelectedFoodResult(null);
    setSaveAsPreset(false);
    setSaving(false);
    await loadFoodData();
  }

  async function deleteFoodEntry(id: string) {
    setSaving(true);
    setError("");
    const { error: deleteError } = await supabase.from("nutrition_entries").delete().eq("id", id);
    setSaving(false);
    if (deleteError) { setError(deleteError.message); return; }
    await loadFoodData();
  }

  async function searchFoods(event: React.FormEvent) {
    event.preventDefault();
    if (foodSearchQuery.trim().length < 2) { setFoodSearchWarnings(["Search needs at least 2 characters."]); return; }
    setSearchingFoods(true);
    setFoodSearchWarnings([]);
    setError("");
    const { data, error: searchError } = await supabase.functions.invoke("food-search", { body: { query: foodSearchQuery.trim(), source: foodSearchSource } });
    setSearchingFoods(false);
    if (searchError) { setFoodSearchResults([]); setFoodSearchWarnings([searchError.message || "Food search is not available yet."]); return; }
    setFoodSearchResults((data?.results as FoodSearchResult[]) || []);
    setFoodSearchWarnings((data?.results as FoodSearchResult[]).length > 0 ? [] : (data?.warnings as string[] || []));
  }

  function selectFoodResult(food: FoodSearchResult) {
    setSelectedFoodResult(food);
    const servingGrams = food.servingGrams || 100;
    const calculated = calculateMacros(food, servingGrams);
    setFoodForm((prev) => ({
      ...prev,
      food_name: food.name,
      serving: food.servingLabel || `${servingGrams}g`,
      calories: toFormValue(calculated.calories),
      protein_grams: toFormValue(calculated.protein),
      carbs_grams: toFormValue(calculated.carbs),
      fats_grams: toFormValue(calculated.fats),
      saturated_fats_grams: toFormValue(calculated.saturatedFats),
      sugars_grams: toFormValue(calculated.sugars),
      source: food.source,
      external_id: food.id,
      brand: food.brand || "",
      barcode: food.barcode || "",
      serving_grams: toFormValue(servingGrams),
      serving_label: food.servingLabel || "",
      calories_per_100g: toFormValue(food.caloriesPer100g),
      protein_per_100g: toFormValue(food.proteinPer100g),
      carbs_per_100g: toFormValue(food.carbsPer100g),
      fats_per_100g: toFormValue(food.fatsPer100g),
      saturated_fats_per_100g: toFormValue(food.saturatedFatsPer100g),
      sugars_per_100g: toFormValue(food.sugarsPer100g),
    }));
  }

  function updateServingGrams(value: string) {
    setFoodForm((prev) => {
      const grams = toNumber(value);
      const next = { ...prev, serving_grams: value, serving: grams ? `${formatServingGrams(grams)}g` : prev.serving };
      return grams ? scaleFoodFormToServing(next, grams) : next;
    });
  }

  function updateServingLabel(value: string) {
    setFoodForm((prev) => {
      const grams = parseServingGrams(value);
      const next = { ...prev, serving: value, serving_grams: grams ? toFormValue(grams) : prev.serving_grams };
      return grams ? scaleFoodFormToServing(next, grams) : next;
    });
  }

  function scaleFoodFormToServing(form: typeof blankFoodForm, grams: number) {
    const food = foodResultFromForm(form) || selectedFoodResult;
    if (!food || !hasPer100gNutrition(food)) return form;
    const calculated = calculateMacros(food, grams);
    return { ...form, calories: toFormValue(calculated.calories), protein_grams: toFormValue(calculated.protein), carbs_grams: toFormValue(calculated.carbs), fats_grams: toFormValue(calculated.fats), saturated_fats_grams: toFormValue(calculated.saturatedFats), sugars_grams: toFormValue(calculated.sugars) };
  }

  return (
    <main className="min-h-screen bg-[#f2f5f7] px-4 py-5 text-[#101d2b] md:px-8 md:py-7">
        <section className="mb-5 flex items-center justify-between gap-3">
          <button type="button" onClick={() => navigate("/wellness")} className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#101d2b] shadow-sm">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight text-[#101d2b]">Food</h1>
          </div>
          <span className="h-12 w-12" aria-hidden="true" />
        </section>

        <Surface className="rounded-[2rem] border-0 bg-white shadow-sm">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-dark">Log meal</h2>
              </div>
            </div>

            <div className="mb-5 divide-y divide-line overflow-hidden rounded-[1.6rem] bg-white">
              {mealTypes.map((meal) => {
                const mealEntries = activeEntries.filter((e) => e.meal_type === meal.value);
                const totals = getNutritionTotals(mealEntries);
                return (
                  <button key={meal.value} type="button" onClick={() => setActiveMeal(meal.value)} className={`grid w-full grid-cols-[4.5rem_1fr_auto] items-center gap-4 px-1 py-4 text-left transition ${activeMeal === meal.value ? "bg-pulse/5" : "hover:bg-black/[0.025]"}`}>
                    <span className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-black/[0.06] text-sm font-semibold leading-tight text-[#101d2b]">
                      <span>{totals.calories}</span>
                      <span className="text-xs font-medium">kcal</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-2xl font-medium text-[#101d2b]">{meal.label}</span>
                      <span className="mt-1 block text-sm text-muted">{mealEntries.length} item{mealEntries.length === 1 ? "" : "s"}</span>
                    </span>
                    <span className="inline-flex h-12 w-12 items-center justify-center border-l border-line text-[#101d2b]"><Plus className="h-8 w-8" /></span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={searchFoods} className="mb-5 rounded-[1.3rem] border border-pulse/20 bg-pulse/8 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-end">
                <Field label="Food search" value={foodSearchQuery} onChange={setFoodSearchQuery} placeholder="Chicken breast, banana..." />
                <div>
                  <FieldLabel>Source</FieldLabel>
                  <SelectInput value={foodSearchSource} onChange={(e) => setFoodSearchSource(e.target.value as any)}>
                    <option value="all">All databases</option>
                    <option value="open_food_facts">Open Food Facts</option>
                    <option value="usda">USDA</option>
                  </SelectInput>
                </div>
                <Button type="submit" variant="pulse" disabled={searchingFoods}><Search className="h-4 w-4" /> Search</Button>
              </div>
            </form>

            <form onSubmit={saveFoodEntry} className="mb-5 grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <FieldLabel>Meal</FieldLabel>
                  <SelectInput value={foodForm.meal_type} onChange={(e) => setActiveMeal(e.target.value as NutritionEntry["meal_type"])}>
                    {mealTypes.map((meal) => <option key={meal.value} value={meal.value}>{meal.label}</option>)}
                  </SelectInput>
                </div>
                <FoodField label="Food" value={foodForm.food_name} onChange={(v) => setFoodForm((p) => ({ ...p, food_name: v }))} />
                <FoodField label="Serving" value={foodForm.serving} onChange={updateServingLabel} />
                <FoodField label="Calories" type="number" value={foodForm.calories} onChange={(v) => setFoodForm((p) => ({ ...p, calories: v }))} />
              </div>
              <Button type="submit" variant="golf" disabled={saving || !foodForm.food_name.trim()}>Add Food</Button>
            </form>

            <MealGroup meal={mealTypes.find((m) => m.value === activeMeal) || mealTypes[0]} entries={activeMealEntries} onDelete={deleteFoodEntry} />
        </Surface>
    </main>
  );
}

function FoodField({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <TextInput type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function MealGroup({ meal, entries, onDelete }: { meal: { value: NutritionEntry["meal_type"]; label: string }; entries: NutritionEntry[]; onDelete: (id: string) => void; }) {
  const totals = getNutritionTotals(entries);
  return (
    <div className="rounded-xl border border-line bg-white/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-dark">{meal.label}</h3>
          <p className="mt-1 text-sm text-muted">{totals.calories} kcal / {totals.protein}g protein</p>
        </div>
      </div>
      {entries.map((entry) => (
        <div key={entry.id} className="grid gap-3 rounded-lg border border-line bg-panel p-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="font-semibold text-dark">{entry.food_name}</p>
            <p className="mt-1 text-sm text-muted">{entry.serving || "Serving not set"} - {entry.calories || 0} kcal</p>
          </div>
          <Button variant="ghost" onClick={() => onDelete(entry.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
    </div>
  );
}
