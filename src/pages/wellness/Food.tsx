import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Flame, Plus, Search, Trash2, Database, PencilLine } from "lucide-react";
import { Button, FieldLabel, Surface, TextInput, SelectInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { FoodSearchResult, NutritionEntry } from "@/lib/types";
import { useWellness } from "@/hooks/wellness/WellnessContext";

const mealTypes: Array<{ value: NutritionEntry["meal_type"]; label: string }> = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snacks" },
];

type EntryMode = "search" | "manual";
type FoodSearchResponse = { results?: FoodSearchResult[]; warnings?: string[] };

function getNutritionTotals(entries: NutritionEntry[]) {
  return entries.reduce((acc, entry) => ({
    calories: acc.calories + (entry.calories || 0),
    protein: acc.protein + (entry.protein_grams || 0),
    carbs: acc.carbs + (entry.carbs_grams || 0),
    fats: acc.fats + (entry.fats_grams || 0),
  }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
}

function scaledValue(value: number | null, grams: number) {
  return value === null ? "" : String(Number(((value * grams) / 100).toFixed(1)));
}

export default function Food() {
  const [, navigate] = useLocation();
  const { logs, targets, selectedDate, refresh } = useWellness();
  const [nutritionEntries, setNutritionEntries] = useState<NutritionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<EntryMode>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [searchMessage, setSearchMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [foodName, setFoodName] = useState("");
  const [amountGrams, setAmountGrams] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fats, setFats] = useState("");
  const [mealType, setMealType] = useState<NutritionEntry["meal_type"]>("snack");
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => { loadFoodData(); }, [selectedDate]);

  async function loadFoodData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from("nutrition_entries").select("*").eq("user_id", user.id).eq("log_date", selectedDate).order("created_at", { ascending: false });
    setNutritionEntries((data as NutritionEntry[]) || []);
    setLoading(false);
  }

  function populateFromFood(food: FoodSearchResult, grams: number) {
    setCalories(scaledValue(food.caloriesPer100g, grams));
    setProtein(scaledValue(food.proteinPer100g, grams));
    setCarbs(scaledValue(food.carbsPer100g, grams));
    setFats(scaledValue(food.fatsPer100g, grams));
  }

  function selectFood(food: FoodSearchResult) {
    const grams = food.servingGrams || 100;
    setSelectedFood(food);
    setFoodName(food.name);
    setAmountGrams(String(grams));
    populateFromFood(food, grams);
    setSearchResults([]);
  }

  function changeAmount(value: string) {
    setAmountGrams(value);
    const grams = Number(value);
    if (selectedFood && Number.isFinite(grams) && grams >= 0) populateFromFood(selectedFood, grams);
  }

  function switchMode(nextMode: EntryMode) {
    setMode(nextMode);
    setSearchMessage("");
    setSearchResults([]);
    if (nextMode === "manual") setSelectedFood(null);
  }

  async function searchFood() {
    const query = searchQuery.trim();
    if (query.length < 2) { setSearchMessage("Enter at least two characters to search."); return; }

    setSearching(true);
    setSearchMessage("");
    const { data, error } = await supabase.functions.invoke<FoodSearchResponse>("food-search", { body: { query, source: "all" } });
    setSearching(false);
    if (error) { setSearchMessage("Food search is unavailable. Please try again or enter the meal manually."); return; }

    setSearchResults(data?.results || []);
    setSearchMessage(data?.warnings?.join(" ") || (!(data?.results?.length) ? "No foods found." : ""));
  }

  async function addMeal() {
    const amount = Number(amountGrams);
    if (!foodName.trim()) { setSaveMessage("Enter a meal or food name."); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate) || !/^\d{2}:\d{2}$/.test(time)) { setSaveMessage("Choose a valid Wellness date and meal time."); return; }
    setSaving(true);
    setSaveMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); setSaveMessage("You need to be signed in before adding a meal."); return; }

    // Keep the actual meal insert compatible with the original nutrition_entries
    // schema. API metadata is an optional enhancement added by later migrations.
    const { data: insertedEntry, error } = await supabase.from("nutrition_entries").insert({
      user_id: user.id,
      log_date: selectedDate,
      food_name: foodName.trim(),
      serving: Number.isFinite(amount) && amount > 0 ? `${amount} g` : null,
      calories: Number(calories) || 0,
      protein_grams: Number(protein) || 0,
      carbs_grams: Number(carbs) || 0,
      fats_grams: Number(fats) || 0,
      meal_type: mealType,
      created_at: new Date(`${selectedDate}T${time}:00`).toISOString(),
    }).select("id").single();
    setSaving(false);
    if (error || !insertedEntry) {
      setSaveMessage(`Could not save meal: ${error?.message || "No entry was returned."}`);
      return;
    }

    if (selectedFood) {
      const { error: metadataError } = await supabase.from("nutrition_entries").update({
        source: selectedFood.source, external_id: selectedFood.id, brand: selectedFood.brand, barcode: selectedFood.barcode,
        serving_grams: Number.isFinite(amount) && amount > 0 ? amount : null, serving_label: selectedFood.servingLabel,
        calories_per_100g: selectedFood.caloriesPer100g, protein_per_100g: selectedFood.proteinPer100g,
        carbs_per_100g: selectedFood.carbsPer100g, fats_per_100g: selectedFood.fatsPer100g,
        saturated_fats_per_100g: selectedFood.saturatedFatsPer100g, sugars_per_100g: selectedFood.sugarsPer100g,
      }).eq("id", insertedEntry.id);
      if (metadataError) setSaveMessage(`Meal saved, but food-source details were not stored: ${metadataError.message}`);
    }

    setSelectedFood(null); setFoodName(""); setAmountGrams(""); setCalories(""); setProtein(""); setCarbs(""); setFats("");
    await Promise.all([loadFoodData(), refresh()]);
  }

  async function deleteMeal(id: string) {
    if (!confirm("Delete this meal entry?")) return;
    const { error } = await supabase.from("nutrition_entries").delete().eq("id", id);
    if (!error) await Promise.all([loadFoodData(), refresh()]);
  }

  const totals = useMemo(() => getNutritionTotals(nutritionEntries), [nutritionEntries]);
  const sevenDayFoodTotals = useMemo(() => logs.reduce((sum: number, log: { calories?: number | null }) => sum + (log.calories || 0), 0), [logs]);
  const formatTime = (timestamp: string) => new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <main className="min-h-screen bg-[#f2f5f7] px-4 py-5 text-[#101d2b] md:px-8 md:py-7">
      <section className="mb-5 flex items-center justify-between gap-3">
        <button type="button" onClick={() => navigate("/wellness")} className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#101d2b] shadow-sm" aria-label="Back to wellness"><ChevronLeft className="h-6 w-6" /></button>
        <div className="text-center"><p className="text-xs font-bold uppercase tracking-[.16em] text-golf">Food & fuel</p><h1 className="text-3xl font-black tracking-tight text-[#101d2b]">Nutrition</h1></div>
        <span className="h-12 w-12" aria-hidden="true" />
      </section>

      <Surface className="mb-5 overflow-hidden rounded-[2rem] border-0 bg-dark p-5 text-white shadow-sm"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><FoodMetric value={Math.round(totals.calories).toString()} label={`of ${Math.round(targets.calories)} kcal`} /><FoodMetric value={`${Math.round(totals.protein)}g`} label={`protein / ${Math.round(targets.proteinGrams)}g`} /><FoodMetric value={`${Math.round(totals.carbs)}g`} label="carbohydrates" /><FoodMetric value={`${Math.round(totals.fats)}g`} label="fat" /></div></Surface>
      <Surface className="mb-5 rounded-[2rem] border-0 bg-white p-6 shadow-sm">
        <div className="mb-4 grid grid-cols-2 gap-2">
          <Button type="button" onClick={() => switchMode("search")} className={mode === "search" ? "" : "opacity-60"}><Database className="mr-2 h-4 w-4" /> Find food</Button>
          <Button type="button" onClick={() => switchMode("manual")} className={mode === "manual" ? "" : "opacity-60"}><PencilLine className="mr-2 h-4 w-4" /> Add manually</Button>
        </div>

        {mode === "search" && (
          <div className="mb-4 grid gap-2 border-b border-line pb-4">
            <p className="text-xs leading-relaxed text-muted">Searches USDA FoodData Central and Open Food Facts. Manual entry is always available.</p><div className="flex gap-2"><TextInput value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && searchFood()} placeholder="Try banana, Greek yogurt, or a branded product" /><Button type="button" onClick={searchFood} disabled={searching}>{searching ? "Searching..." : "Search"}</Button></div>
            {searchMessage && <p className="text-sm text-muted">{searchMessage}</p>}
            {searchResults.map((food) => (
              <button key={`${food.source}-${food.id}`} type="button" onClick={() => selectFood(food)} className="rounded-2xl border border-line p-3 text-left transition hover:bg-pulse/5">
                <div className="flex items-start justify-between gap-2"><p className="font-semibold">{food.name}</p><span className="shrink-0 rounded-full bg-steel/10 px-2 py-1 text-[10px] font-bold uppercase text-muted">{food.source === "usda" ? "USDA" : "Open Food Facts"}</span></div>
                <p className="text-xs text-muted">{food.brand ? `${food.brand} · ` : ""}{food.source === "usda" ? "USDA" : "Open Food Facts"} · {food.caloriesPer100g ?? "—"} kcal / 100g</p>
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div><FieldLabel>Meal / food name</FieldLabel><TextInput value={foodName} onChange={(event) => setFoodName(event.target.value)} placeholder="Food name" /></div>
          {selectedFood && <p className="-mt-2 text-xs text-muted">Selected from {selectedFood.source === "usda" ? "USDA" : "Open Food Facts"}{selectedFood.brand ? ` · ${selectedFood.brand}` : ""}</p>}
          <div><FieldLabel>Amount / weight (g)</FieldLabel><TextInput type="number" min="0" step="0.1" value={amountGrams} onChange={(event) => changeAmount(event.target.value)} placeholder="e.g. 100" /></div>
          <div className="grid grid-cols-2 gap-2">
            <TextInput type="number" step="0.1" value={calories} onChange={(event) => setCalories(event.target.value)} placeholder="Calories" />
            <TextInput type="number" step="0.1" value={protein} onChange={(event) => setProtein(event.target.value)} placeholder="Protein (g)" />
            <TextInput type="number" step="0.1" value={carbs} onChange={(event) => setCarbs(event.target.value)} placeholder="Carbs (g)" />
            <TextInput type="number" step="0.1" value={fats} onChange={(event) => setFats(event.target.value)} placeholder="Fat (g)" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SelectInput value={mealType} onChange={(event) => setMealType(event.target.value as NutritionEntry["meal_type"])}>{mealTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</SelectInput>
            <TextInput type="time" value={time} onChange={(event) => setTime(event.target.value)} aria-label="Meal time" />
          </div>
          <Button onClick={addMeal} disabled={saving}><Plus className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Add Meal"}</Button>
          {saveMessage && <p className="text-sm text-danger" role="status">{saveMessage}</p>}
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 border-t border-line pt-4 text-center text-sm font-bold text-muted">
          <div>{totals.calories}/{Math.round(targets.calories)}<br />Cal</div><div>{totals.protein}/{Math.round(targets.proteinGrams)}<br />Pro</div><div>{totals.carbs}/{Math.round(targets.carbsGrams)}<br />Carbs</div><div>{totals.fats}/{Math.round(targets.fatsGrams)}<br />Fat</div>
        </div>
      </Surface>

      <Surface className="mb-5 rounded-[2rem] border-0 bg-white p-6 shadow-sm"><div className="flex items-center gap-3"><Flame className="h-6 w-6 text-pulse" /><div><h2 className="text-xl font-black">7-day fuel</h2><p className="text-sm text-muted">{Math.round(sevenDayFoodTotals)} kcal logged across the selected week</p></div></div></Surface>

      <Surface className="rounded-[2rem] border-0 bg-white p-6 shadow-sm"><h2 className="mb-4 text-xl font-black">Entries</h2>{loading ? <p>Loading...</p> : <div className="grid gap-2">{nutritionEntries.length === 0 && <p className="text-sm text-muted">No meals logged for this date.</p>}{nutritionEntries.map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 border-b border-line p-3"><div><p className="font-semibold">{entry.food_name}</p><p className="text-xs text-muted">{entry.meal_type} · {formatTime(entry.created_at)} · {entry.protein_grams || 0}g protein</p></div><div className="flex items-center gap-3"><span>{entry.calories || 0} kcal</span><button type="button" onClick={() => deleteMeal(entry.id)} className="text-pulse" aria-label={`Delete ${entry.food_name}`}><Trash2 className="h-4 w-4" /></button></div></div>)}</div>}</Surface>
    </main>
  );
}

function FoodMetric({ value, label }: { value: string; label: string }) {
  return <div className="rounded-2xl bg-white/10 p-3"><p className="text-xl font-semibold">{value}</p><p className="mt-1 text-[11px] leading-tight text-white/60">{label}</p></div>;
}
