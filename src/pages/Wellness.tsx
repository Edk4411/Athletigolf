import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarDays, Copy, Droplets, Flame, Moon, Pencil, Plus, Scale, Trash2, Utensils, Zap } from "lucide-react";
import { Button, EmptyState, FieldLabel, PageHeader, SelectInput, Surface, TextArea, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { NutritionEntry, OnboardingData, SavedFood, WellnessLog } from "@/lib/types";
import { defaultWellnessTargets, getWellnessTargets, type WellnessTargets } from "@/lib/wellnessTargets";

const todayIso = () => new Date().toISOString().slice(0, 10);
const offsetIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const blankForm = {
  log_date: todayIso(),
  water_litres: "",
  calories: "",
  protein_grams: "",
  carbs_grams: "",
  fats_grams: "",
  bodyweight: "",
  sleep_hours: "",
  energy_rating: "",
  notes: "",
};

const blankFoodForm = {
  meal_type: "breakfast" as NutritionEntry["meal_type"],
  food_name: "",
  serving: "",
  calories: "",
  protein_grams: "",
  carbs_grams: "",
  fats_grams: "",
};

const mealTypes: Array<{ value: NutritionEntry["meal_type"]; label: string }> = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snacks" },
];

export default function Wellness() {
  const [logs, setLogs] = useState<WellnessLog[]>([]);
  const [nutritionEntries, setNutritionEntries] = useState<NutritionEntry[]>([]);
  const [savedFoods, setSavedFoods] = useState<SavedFood[]>([]);
  const [targets, setTargets] = useState<WellnessTargets>(defaultWellnessTargets);
  const [selectedLog, setSelectedLog] = useState<WellnessLog | null>(null);
  const [form, setForm] = useState(blankForm);
  const [foodForm, setFoodForm] = useState(blankFoodForm);
  const [savedFoodForm, setSavedFoodForm] = useState(blankFoodForm);
  const [selectedSavedFood, setSelectedSavedFood] = useState("");
  const [copySourceDate, setCopySourceDate] = useState(offsetIso(-1));
  const [editingSavedFoodId, setEditingSavedFoodId] = useState("");
  const [saveAsPreset, setSaveAsPreset] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    const [{ data }, { data: profile }, { data: entries }, { data: foods }] = await Promise.all([
      supabase
        .from("daily_wellness_logs")
        .select("*")
        .order("log_date", { ascending: false })
        .limit(30),
      supabase.from("profiles").select("onboarding_data").maybeSingle(),
      supabase
        .from("nutrition_entries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(120),
      supabase
        .from("saved_foods")
        .select("*")
        .order("food_name", { ascending: true }),
    ]);

    const loadedLogs = (data as WellnessLog[]) || [];
    const onboarding = (profile?.onboarding_data as OnboardingData | null) || null;
    setTargets(getWellnessTargets(onboarding));
    setLogs(loadedLogs);
    setNutritionEntries((entries as NutritionEntry[]) || []);
    setSavedFoods((foods as SavedFood[]) || []);
    const todayLog = loadedLogs.find((log) => log.log_date === todayIso()) || null;
    setSelectedLog(todayLog);
    setForm(todayLog ? formFromLog(todayLog) : blankForm);
    setLoading(false);
  }

  function selectLog(log: WellnessLog) {
    setSelectedLog(log);
    setForm(formFromLog(log));
    setError("");
  }

  function addWater(amount: number) {
    setForm((prev) => {
      const current = toNumber(prev.water_litres) || 0;
      return {
        ...prev,
        log_date: prev.log_date || todayIso(),
        water_litres: Number(current + amount).toFixed(1),
      };
    });
  }

  async function saveLog(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      log_date: form.log_date,
      water_litres: toNumber(form.water_litres),
      calories: toInteger(form.calories),
      protein_grams: toInteger(form.protein_grams),
      carbs_grams: toInteger(form.carbs_grams),
      fats_grams: toInteger(form.fats_grams),
      bodyweight: toNumber(form.bodyweight),
      sleep_hours: toNumber(form.sleep_hours),
      energy_rating: toInteger(form.energy_rating),
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You need to be signed in to save wellness logs.");
      setSaving(false);
      return;
    }

    const { error: saveError } = await supabase
      .from("daily_wellness_logs")
      .upsert({ ...payload, user_id: user.id }, { onConflict: "user_id,log_date" });

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    await loadLogs();
  }

  async function saveFoodEntry(event: React.FormEvent) {
    event.preventDefault();
    if (!foodForm.food_name.trim()) return;

    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You need to be signed in to save nutrition entries.");
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      log_date: form.log_date || todayIso(),
      meal_type: foodForm.meal_type,
      food_name: foodForm.food_name.trim(),
      serving: foodForm.serving.trim() || null,
      calories: toInteger(foodForm.calories) || 0,
      protein_grams: toInteger(foodForm.protein_grams) || 0,
      carbs_grams: toInteger(foodForm.carbs_grams) || 0,
      fats_grams: toInteger(foodForm.fats_grams) || 0,
      updated_at: new Date().toISOString(),
    };

    const { error: entryError } = await supabase.from("nutrition_entries").insert(payload);

    if (entryError) {
      setError(entryError.message);
      setSaving(false);
      return;
    }

    if (saveAsPreset) {
      await supabase.from("saved_foods").insert({
        user_id: user.id,
        food_name: payload.food_name,
        serving: payload.serving,
        calories: payload.calories,
        protein_grams: payload.protein_grams,
        carbs_grams: payload.carbs_grams,
        fats_grams: payload.fats_grams,
        updated_at: new Date().toISOString(),
      });
    }

    setFoodForm((prev) => ({ ...blankFoodForm, meal_type: prev.meal_type }));
    setSelectedSavedFood("");
    setSaveAsPreset(false);
    setSaving(false);
    await loadLogs();
  }

  async function deleteFoodEntry(id: string) {
    setSaving(true);
    setError("");
    const { error: deleteError } = await supabase.from("nutrition_entries").delete().eq("id", id);
    setSaving(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadLogs();
  }

  async function copyMealsFromDate(sourceDate: string, mealType?: NutritionEntry["meal_type"]) {
    const sourceEntries = nutritionEntries.filter(
      (entry) => entry.log_date === sourceDate && (!mealType || entry.meal_type === mealType)
    );

    if (!sourceEntries.length) {
      setError(
        mealType
          ? `No ${formatMealLabel(mealType).toLowerCase()} logged on ${formatDate(sourceDate)} to copy.`
          : `No meals logged on ${formatDate(sourceDate)} to copy.`
      );
      return;
    }

    setSaving(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You need to be signed in to copy meals.");
      setSaving(false);
      return;
    }

    const now = new Date().toISOString();
    const { error: insertError } = await supabase.from("nutrition_entries").insert(
      sourceEntries.map((entry) => ({
        user_id: user.id,
        log_date: activeNutritionDate,
        meal_type: entry.meal_type,
        food_name: entry.food_name,
        serving: entry.serving,
        calories: entry.calories || 0,
        protein_grams: entry.protein_grams || 0,
        carbs_grams: entry.carbs_grams || 0,
        fats_grams: entry.fats_grams || 0,
        updated_at: now,
      }))
    );

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    await loadLogs();
  }

  function startEditSavedFood(food: SavedFood) {
    setEditingSavedFoodId(food.id);
    setSavedFoodForm({
      meal_type: "breakfast",
      food_name: food.food_name,
      serving: food.serving || "",
      calories: toFormValue(food.calories),
      protein_grams: toFormValue(food.protein_grams),
      carbs_grams: toFormValue(food.carbs_grams),
      fats_grams: toFormValue(food.fats_grams),
    });
  }

  async function saveSavedFoodEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editingSavedFoodId || !savedFoodForm.food_name.trim()) return;

    setSaving(true);
    setError("");
    const { error: updateError } = await supabase
      .from("saved_foods")
      .update({
        food_name: savedFoodForm.food_name.trim(),
        serving: savedFoodForm.serving.trim() || null,
        calories: toInteger(savedFoodForm.calories) || 0,
        protein_grams: toInteger(savedFoodForm.protein_grams) || 0,
        carbs_grams: toInteger(savedFoodForm.carbs_grams) || 0,
        fats_grams: toInteger(savedFoodForm.fats_grams) || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingSavedFoodId);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setEditingSavedFoodId("");
    setSavedFoodForm(blankFoodForm);
    await loadLogs();
  }

  async function deleteSavedFood(id: string) {
    setSaving(true);
    setError("");
    const { error: deleteError } = await supabase.from("saved_foods").delete().eq("id", id);
    setSaving(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (selectedSavedFood === id) setSelectedSavedFood("");
    if (editingSavedFoodId === id) {
      setEditingSavedFoodId("");
      setSavedFoodForm(blankFoodForm);
    }
    await loadLogs();
  }

  function applySavedFood(id: string) {
    setSelectedSavedFood(id);
    const food = savedFoods.find((item) => item.id === id);
    if (!food) return;

    setFoodForm((prev) => ({
      ...prev,
      food_name: food.food_name,
      serving: food.serving || "",
      calories: toFormValue(food.calories),
      protein_grams: toFormValue(food.protein_grams),
      carbs_grams: toFormValue(food.carbs_grams),
      fats_grams: toFormValue(food.fats_grams),
    }));
  }

  const todayLog = logs.find((log) => log.log_date === todayIso()) || selectedLog;
  const activeNutritionDate = form.log_date || todayIso();
  const activeEntries = useMemo(
    () => nutritionEntries.filter((entry) => entry.log_date === activeNutritionDate),
    [nutritionEntries, activeNutritionDate]
  );
  const availableNutritionDates = useMemo(
    () =>
      Array.from(new Set(nutritionEntries.map((entry) => entry.log_date)))
        .filter((date) => date !== activeNutritionDate)
        .sort((a, b) => b.localeCompare(a)),
    [nutritionEntries, activeNutritionDate]
  );
  const nutritionTotals = useMemo(() => getNutritionTotals(activeEntries), [activeEntries]);
  const displayNutrition = {
    calories: nutritionTotals.calories || todayLog?.calories || null,
    protein: nutritionTotals.protein || todayLog?.protein_grams || null,
    carbs: nutritionTotals.carbs || todayLog?.carbs_grams || null,
    fats: nutritionTotals.fats || todayLog?.fats_grams || null,
  };
  const weekLogs = useMemo(() => logs.slice(0, 7), [logs]);
  const weekly = useMemo(() => getWeeklySummary(weekLogs), [weekLogs]);
  const todayScore = useMemo(() => getDailyCompletion(todayLog, targets), [todayLog, targets]);
  const insights = useMemo(() => buildWellnessInsights(weekLogs, targets, nutritionTotals), [weekLogs, targets, nutritionTotals]);
  const nutritionStatus = useMemo(() => buildNutritionStatus(displayNutrition, targets), [displayNutrition, targets]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-muted">
        Loading wellness dashboard...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-cream px-4 py-5 text-ink md:px-8 md:py-7">
      <PageHeader
        eyebrow="Wellness"
        title="Nutrition and hydration"
        description="Track the daily recovery signals that explain training quality, practice energy, and performance consistency."
        tone="text-pulse"
      />

      <section className="mb-5 grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <Surface className="overflow-hidden bg-dark text-white">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-pulse">Today</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Fuel and recovery score</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/64">
                A quick read on whether today is supporting training, practice and focus.
              </p>
            </div>
            <div className="relative h-28 w-28">
              <div className="absolute inset-0 rounded-full bg-pulse/15" />
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(rgb(0 180 216) ${todayScore * 3.6}deg, rgb(255 255 255 / 0.1) 0deg)`,
                }}
              />
              <div className="absolute inset-3 flex items-center justify-center rounded-full bg-dark text-3xl font-semibold">
                {todayScore}
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <DarkMetric label="Water" value={`${Math.round(getProgress(todayLog?.water_litres, targets.waterLitres))}%`} />
            <DarkMetric label="Protein" value={`${Math.round(getProgress(displayNutrition.protein, targets.proteinGrams))}%`} />
            <DarkMetric label="Calories" value={`${Math.round(getProgress(displayNutrition.calories, targets.calories))}%`} />
            <DarkMetric label="Sleep" value={`${Math.round(getProgress(todayLog?.sleep_hours, targets.sleepHours))}%`} />
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-4">
            <QuickAddButton label="+250ml" onClick={() => addWater(0.25)} />
            <QuickAddButton label="+500ml" onClick={() => addWater(0.5)} />
            <QuickAddButton label="+1L" onClick={() => addWater(1)} />
            <QuickAddButton label="Copy yesterday" onClick={() => copyMealsFromDate(offsetIso(-1))} icon={Copy} />
          </div>
        </Surface>

        <Surface>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <WellnessTile icon={Droplets} label="Water" value={formatLitres(todayLog?.water_litres)} target={`${targets.waterLitres} L`} progress={getProgress(todayLog?.water_litres, targets.waterLitres)} tone="pulse" />
            <WellnessTile icon={Utensils} label="Protein" value={formatGrams(displayNutrition.protein)} target={`${targets.proteinGrams} g`} progress={getProgress(displayNutrition.protein, targets.proteinGrams)} tone="golf" />
            <WellnessTile icon={Flame} label="Calories" value={formatNumber(displayNutrition.calories)} target={`${targets.calories}`} progress={getProgress(displayNutrition.calories, targets.calories)} tone="gold" />
            <WellnessTile icon={Moon} label="Sleep" value={formatHours(todayLog?.sleep_hours)} target={`${targets.sleepHours} h`} progress={getProgress(todayLog?.sleep_hours, targets.sleepHours)} tone="lab" />
          </div>
          <div className="mt-5 rounded-xl border border-line bg-white/55 p-4">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Nutrition Target</p>
                <h3 className="mt-1 text-lg font-semibold text-dark">{nutritionStatus.title}</h3>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${nutritionStatus.badgeClass}`}>
                {nutritionStatus.badge}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted">{nutritionStatus.detail}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {nutritionStatus.rows.map((row) => (
                <NutritionTargetMini key={row.label} {...row} />
              ))}
            </div>
          </div>
        </Surface>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Surface>
          <div className="mb-5 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pulse/10 text-pulse">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Daily Log</p>
              <h2 className="text-xl font-semibold text-dark">Manual totals</h2>
            </div>
          </div>

          <form onSubmit={saveLog} className="grid gap-4">
            <Field label="Date" type="date" value={form.log_date} onChange={(value) => setForm((prev) => ({ ...prev, log_date: value }))} required />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Field label="Water (litres)" type="number" step="0.1" value={form.water_litres} onChange={(value) => setForm((prev) => ({ ...prev, water_litres: value }))} placeholder={`${targets.waterLitres}`} />
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <QuickAddButton label="+250ml" onClick={() => addWater(0.25)} />
                  <QuickAddButton label="+500ml" onClick={() => addWater(0.5)} />
                  <QuickAddButton label="+1L" onClick={() => addWater(1)} />
                </div>
              </div>
              <Field label="Calories" type="number" value={form.calories} onChange={(value) => setForm((prev) => ({ ...prev, calories: value }))} placeholder={`${targets.calories}`} />
              <Field label="Protein (g)" type="number" value={form.protein_grams} onChange={(value) => setForm((prev) => ({ ...prev, protein_grams: value }))} placeholder={`${targets.proteinGrams}`} />
              <Field label="Carbs (g)" type="number" value={form.carbs_grams} onChange={(value) => setForm((prev) => ({ ...prev, carbs_grams: value }))} placeholder="260" />
              <Field label="Fats (g)" type="number" value={form.fats_grams} onChange={(value) => setForm((prev) => ({ ...prev, fats_grams: value }))} placeholder="70" />
              <Field label="Bodyweight" type="number" step="0.1" value={form.bodyweight} onChange={(value) => setForm((prev) => ({ ...prev, bodyweight: value }))} placeholder="78.5" />
              <Field label="Sleep (hours)" type="number" step="0.1" value={form.sleep_hours} onChange={(value) => setForm((prev) => ({ ...prev, sleep_hours: value }))} placeholder="8" />
              <div>
                <FieldLabel>Energy</FieldLabel>
                <SelectInput value={form.energy_rating} onChange={(event) => setForm((prev) => ({ ...prev, energy_rating: event.target.value }))}>
                  <option value="">Rate energy</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                    <option key={rating} value={rating}>{rating}/10</option>
                  ))}
                </SelectInput>
              </div>
            </div>
            <div>
              <FieldLabel>Notes</FieldLabel>
              <TextArea rows={4} value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Meals, caffeine, soreness, travel, anything that explains the day..." />
            </div>
            {error && <p className="rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm font-semibold text-danger">{error}</p>}
            <Button type="submit" variant="pulse" disabled={saving || !form.log_date}>
              {saving ? "Saving..." : "Save Wellness Log"}
            </Button>
          </form>
        </Surface>

        <div className="space-y-5">
          <Surface>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <Utensils className="h-5 w-5 text-golf" />
                <div>
                  <h2 className="text-xl font-semibold text-dark">Meals</h2>
                  <p className="mt-1 text-sm text-muted">Log today, reuse yesterday, or build saved foods.</p>
                </div>
              </div>
              <Button type="button" variant="secondary" onClick={() => copyMealsFromDate(copySourceDate)} disabled={saving}>
                <Copy className="h-4 w-4" />
                Copy Day
              </Button>
            </div>

            <div className="mb-5 rounded-xl border border-line bg-white/55 p-3">
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <FieldLabel>Copy meals from</FieldLabel>
                  <SelectInput value={copySourceDate} onChange={(event) => setCopySourceDate(event.target.value)}>
                    <option value={offsetIso(-1)}>Yesterday ({formatDate(offsetIso(-1))})</option>
                    {availableNutritionDates.map((date) => (
                      <option key={date} value={date}>{formatDate(date)}</option>
                    ))}
                  </SelectInput>
                </div>
                <Button type="button" variant="secondary" onClick={() => copyMealsFromDate(copySourceDate)} disabled={saving}>
                  <Copy className="h-4 w-4" />
                  Copy All
                </Button>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                {mealTypes.map((meal) => (
                  <QuickMealButton
                    key={meal.value}
                    label={meal.label}
                    onClick={() => copyMealsFromDate(copySourceDate, meal.value)}
                  />
                ))}
              </div>
            </div>

            <form onSubmit={saveFoodEntry} className="mb-5 grid gap-3">
              {savedFoods.length > 0 && (
                <div>
                  <FieldLabel>Use saved food</FieldLabel>
                  <SelectInput value={selectedSavedFood} onChange={(event) => applySavedFood(event.target.value)}>
                    <option value="">Choose saved food</option>
                    {savedFoods.map((food) => (
                      <option key={food.id} value={food.id}>{food.food_name}</option>
                    ))}
                  </SelectInput>
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <FieldLabel>Meal</FieldLabel>
                  <SelectInput value={foodForm.meal_type} onChange={(event) => setFoodForm((prev) => ({ ...prev, meal_type: event.target.value as NutritionEntry["meal_type"] }))}>
                    {mealTypes.map((meal) => (
                      <option key={meal.value} value={meal.value}>{meal.label}</option>
                    ))}
                  </SelectInput>
                </div>
                <FoodField label="Food" value={foodForm.food_name} onChange={(value) => setFoodForm((prev) => ({ ...prev, food_name: value }))} placeholder="Chicken wrap" />
                <FoodField label="Serving" value={foodForm.serving} onChange={(value) => setFoodForm((prev) => ({ ...prev, serving: value }))} placeholder="1 wrap / 250g" />
                <FoodField label="Calories" type="number" value={foodForm.calories} onChange={(value) => setFoodForm((prev) => ({ ...prev, calories: value }))} placeholder="520" />
                <FoodField label="Protein (g)" type="number" value={foodForm.protein_grams} onChange={(value) => setFoodForm((prev) => ({ ...prev, protein_grams: value }))} placeholder="38" />
                <FoodField label="Carbs (g)" type="number" value={foodForm.carbs_grams} onChange={(value) => setFoodForm((prev) => ({ ...prev, carbs_grams: value }))} placeholder="55" />
                <FoodField label="Fats (g)" type="number" value={foodForm.fats_grams} onChange={(value) => setFoodForm((prev) => ({ ...prev, fats_grams: value }))} placeholder="14" />
              </div>
              <label className="flex items-center gap-3 text-sm font-medium text-muted">
                <input type="checkbox" checked={saveAsPreset} onChange={(event) => setSaveAsPreset(event.target.checked)} />
                Save this food for next time
              </label>
              <Button type="submit" variant="golf" disabled={saving || !foodForm.food_name.trim()}>
                Add Food
              </Button>
            </form>

            {savedFoods.length > 0 && (
              <div className="mb-5 rounded-xl border border-line bg-white/55 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-dark">Saved foods</h3>
                    <p className="mt-1 text-sm text-muted">Edit presets so quick logging stays clean.</p>
                  </div>
                  <span className="rounded-full bg-steel/10 px-3 py-1 text-xs font-semibold text-muted">
                    {savedFoods.length}
                  </span>
                </div>

                {editingSavedFoodId && (
                  <form onSubmit={saveSavedFoodEdit} className="mb-4 grid gap-3 rounded-lg border border-pulse/20 bg-pulse/8 p-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <FoodField label="Food" value={savedFoodForm.food_name} onChange={(value) => setSavedFoodForm((prev) => ({ ...prev, food_name: value }))} placeholder="Food name" />
                      <FoodField label="Serving" value={savedFoodForm.serving} onChange={(value) => setSavedFoodForm((prev) => ({ ...prev, serving: value }))} placeholder="Serving" />
                      <FoodField label="Calories" type="number" value={savedFoodForm.calories} onChange={(value) => setSavedFoodForm((prev) => ({ ...prev, calories: value }))} placeholder="520" />
                      <FoodField label="Protein (g)" type="number" value={savedFoodForm.protein_grams} onChange={(value) => setSavedFoodForm((prev) => ({ ...prev, protein_grams: value }))} placeholder="38" />
                      <FoodField label="Carbs (g)" type="number" value={savedFoodForm.carbs_grams} onChange={(value) => setSavedFoodForm((prev) => ({ ...prev, carbs_grams: value }))} placeholder="55" />
                      <FoodField label="Fats (g)" type="number" value={savedFoodForm.fats_grams} onChange={(value) => setSavedFoodForm((prev) => ({ ...prev, fats_grams: value }))} placeholder="14" />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button type="submit" variant="pulse" disabled={saving || !savedFoodForm.food_name.trim()}>Save Preset</Button>
                      <Button type="button" variant="ghost" onClick={() => setEditingSavedFoodId("")}>Cancel</Button>
                    </div>
                  </form>
                )}

                <div className="grid gap-2">
                  {savedFoods.slice(0, 8).map((food) => (
                    <div key={food.id} className="grid gap-3 rounded-lg border border-line bg-panel p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div>
                        <p className="font-semibold text-dark">{food.food_name}</p>
                        <p className="mt-1 text-sm text-muted">
                          {food.serving || "Serving not set"} - {food.calories || 0} kcal / {food.protein_grams || 0}g protein
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEditSavedFood(food)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-pulse/10 hover:text-pulse"
                          aria-label={`Edit ${food.food_name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSavedFood(food.id)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-danger/10 hover:text-danger"
                          aria-label={`Delete ${food.food_name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {mealTypes.map((meal) => (
                <MealGroup
                  key={meal.value}
                  meal={meal}
                  entries={activeEntries.filter((entry) => entry.meal_type === meal.value)}
                  onDelete={deleteFoodEntry}
                />
              ))}
            </div>
          </Surface>

          <Surface>
            <div className="mb-5 flex items-center gap-3">
              <Utensils className="h-5 w-5 text-golf" />
              <h2 className="text-xl font-semibold text-dark">Macro progress</h2>
            </div>
            <div className="space-y-4">
              <MacroProgress label="Calories" value={displayNutrition.calories} target={targets.calories} unit="" tone="gold" />
              <MacroProgress label="Protein" value={displayNutrition.protein} target={targets.proteinGrams} unit="g" tone="golf" />
              <MacroProgress label="Carbs" value={displayNutrition.carbs} target={Math.round(targets.calories * 0.48 / 4)} unit="g" tone="pulse" />
              <MacroProgress label="Fats" value={displayNutrition.fats} target={Math.round(targets.calories * 0.25 / 9)} unit="g" tone="lab" />
            </div>
          </Surface>

          <Surface className="bg-dark text-white">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-pulse">Weekly Signal</p>
                <h2 className="mt-2 text-3xl font-semibold">Recovery baseline</h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/64">
                  These are simple manual signals for now. The power comes later when they sit beside training, rounds, and practice.
                </p>
              </div>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-pulse/15 text-pulse">
                <Zap className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              <DarkMetric label="Water avg" value={formatLitres(weekly.avgWater)} />
              <DarkMetric label="Protein avg" value={formatGrams(weekly.avgProtein)} />
              <DarkMetric label="Sleep avg" value={formatHours(weekly.avgSleep)} />
              <DarkMetric label="Energy avg" value={weekly.avgEnergy === null ? "-" : `${weekly.avgEnergy.toFixed(1)}/10`} />
            </div>
          </Surface>

          <Surface>
            <div className="mb-5 flex items-center gap-3">
              <Scale className="h-5 w-5 text-pulse" />
              <h2 className="text-xl font-semibold text-dark">Recent logs</h2>
            </div>
            {logs.length ? (
              <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white/70">
                {logs.slice(0, 7).map((log) => (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => selectLog(log)}
                    className={`grid w-full gap-3 p-4 text-left transition hover:bg-steel/5 sm:grid-cols-[110px_1fr_1fr_1fr] sm:items-center ${
                      selectedLog?.id === log.id ? "bg-pulse/8" : ""
                    }`}
                  >
                    <span className="font-semibold text-dark">{formatDate(log.log_date)}</span>
                    <span className="text-sm text-muted">Water {formatLitres(log.water_litres)}</span>
                    <span className="text-sm text-muted">Protein {formatGrams(log.protein_grams)}</span>
                    <span className="text-sm text-muted">Energy {log.energy_rating ? `${log.energy_rating}/10` : "-"}</span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState title="No wellness logs yet" description="Save today's totals and the weekly signal will start building." />
            )}
          </Surface>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <Surface>
          <div className="mb-5 flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-pulse" />
            <h2 className="text-xl font-semibold text-dark">Weekly trend</h2>
          </div>
          {weekLogs.length ? (
            <div className="grid gap-3 md:grid-cols-7">
              {[...weekLogs].reverse().map((log) => (
                <TrendDay key={log.id} log={log} targets={targets} />
              ))}
            </div>
          ) : (
            <EmptyState title="No weekly trend yet" description="Save a few daily logs and the week view will fill in here." />
          )}
        </Surface>

        <Surface>
          <h2 className="mb-5 text-xl font-semibold text-dark">Wellness insights</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {insights.map((insight) => (
              <div key={insight.title} className={`rounded-xl border p-4 ${insight.tone}`}>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{insight.label}</p>
                <h3 className="mt-2 font-semibold text-dark">{insight.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{insight.detail}</p>
              </div>
            ))}
          </div>
        </Surface>
      </section>
    </main>
  );
}

function WellnessTile({
  icon: Icon,
  label,
  value,
  target,
  progress,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  target: string;
  progress: number;
  tone: "pulse" | "golf" | "gold" | "lab";
}) {
  const iconClass =
    tone === "pulse"
      ? "bg-pulse/10 text-pulse"
      : tone === "golf"
      ? "bg-golf/10 text-golf"
      : tone === "gold"
      ? "bg-gold/15 text-gold"
      : "bg-lab/10 text-lab";
  const bar = tone === "pulse" ? "bg-pulse" : tone === "golf" ? "bg-golf" : tone === "gold" ? "bg-gold" : "bg-lab";
  return (
    <div className="rounded-xl border border-line bg-panel p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="text-xs font-semibold text-muted">Target {target}</span>
      </div>
      <p className="text-sm font-medium text-muted">{label}</p>
      <h2 className="mt-2 text-3xl font-semibold text-dark">{value}</h2>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-steel/10">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function NutritionTargetMini({
  label,
  value,
  target,
  status,
}: {
  label: string;
  value: string;
  target: string;
  status: "behind" | "on-track" | "ahead" | "empty";
}) {
  const statusClass =
    status === "on-track"
      ? "bg-golf/10 text-golf"
      : status === "ahead"
      ? "bg-gold/15 text-gold"
      : status === "behind"
      ? "bg-danger/10 text-danger"
      : "bg-steel/10 text-muted";
  const statusLabel =
    status === "on-track" ? "On track" : status === "ahead" ? "Ahead" : status === "behind" ? "Behind" : "No data";

  return (
    <div className="rounded-lg border border-line bg-panel p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{label}</p>
        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${statusClass}`}>
          {statusLabel}
        </span>
      </div>
      <p className="mt-3 text-lg font-semibold text-dark">{value}</p>
      <p className="mt-1 text-xs text-muted">Target {target}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  step,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <TextInput type={type} step={step} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} />
    </div>
  );
}

function FoodField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <TextInput type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function MealGroup({
  meal,
  entries,
  onDelete,
}: {
  meal: { value: NutritionEntry["meal_type"]; label: string };
  entries: NutritionEntry[];
  onDelete: (id: string) => void;
}) {
  const totals = getNutritionTotals(entries);
  return (
    <div className="rounded-xl border border-line bg-white/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-dark">{meal.label}</h3>
          <p className="mt-1 text-sm text-muted">
            {totals.calories} kcal / {totals.protein}g protein
          </p>
        </div>
        <span className="rounded-full bg-steel/10 px-3 py-1 text-xs font-semibold text-muted">
          {entries.length} item{entries.length === 1 ? "" : "s"}
        </span>
      </div>
      {entries.length ? (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="grid gap-3 rounded-lg border border-line bg-panel p-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="font-semibold text-dark">{entry.food_name}</p>
                <p className="mt-1 text-sm text-muted">
                  {entry.serving || "Serving not set"} - {entry.calories || 0} kcal / {entry.protein_grams || 0}g protein
                </p>
                <p className="mt-1 text-xs text-muted">
                  C {entry.carbs_grams || 0}g / F {entry.fats_grams || 0}g
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDelete(entry.id)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-danger/10 hover:text-danger"
                aria-label={`Delete ${entry.food_name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-line bg-white/45 p-3 text-sm text-muted">
          No {meal.label.toLowerCase()} logged yet.
        </p>
      )}
    </div>
  );
}

function QuickAddButton({
  label,
  onClick,
  icon: Icon = Plus,
}: {
  label: string;
  onClick: () => void;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1 rounded-lg border border-pulse/20 bg-pulse/8 px-2 py-2 text-xs font-semibold text-pulse transition hover:border-pulse/40 hover:bg-pulse/12"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function QuickMealButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs font-semibold text-muted transition hover:border-golf/30 hover:bg-golf/8 hover:text-golf"
    >
      <Copy className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function MacroProgress({
  label,
  value,
  target,
  unit,
  tone,
}: {
  label: string;
  value: number | null | undefined;
  target: number;
  unit: string;
  tone: "gold" | "golf" | "pulse" | "lab";
}) {
  const progress = getProgress(value, target);
  const bar =
    tone === "gold" ? "bg-gold" : tone === "golf" ? "bg-golf" : tone === "pulse" ? "bg-pulse" : "bg-lab";
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <p className="font-semibold text-dark">
          {value === null || value === undefined ? "-" : `${Math.round(value)}${unit}`} / {target}{unit}
        </p>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-steel/10">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function TrendDay({ log, targets }: { log: WellnessLog; targets: WellnessTargets }) {
  const score = getDailyCompletion(log, targets);
  const tone = score >= 75 ? "bg-golf" : score >= 45 ? "bg-gold" : "bg-danger";
  return (
    <button
      type="button"
      className="rounded-xl border border-line bg-white/70 p-3 text-left"
      title={`${formatDate(log.log_date)} wellness score ${score}`}
    >
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">{formatShortDay(log.log_date)}</p>
      <div className="mt-4 flex h-24 items-end rounded-lg bg-steel/10 px-2 pb-2">
        <div className={`w-full rounded-md ${tone}`} style={{ height: `${Math.max(score, 8)}%` }} />
      </div>
      <p className="mt-3 text-sm font-semibold text-dark">{score}%</p>
      <p className="mt-1 text-xs text-muted">{formatLitres(log.water_litres)} water</p>
    </button>
  );
}

function DarkMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/8 p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-2 font-semibold text-white">{value}</p>
    </div>
  );
}

function formFromLog(log: WellnessLog) {
  return {
    log_date: log.log_date,
    water_litres: toFormValue(log.water_litres),
    calories: toFormValue(log.calories),
    protein_grams: toFormValue(log.protein_grams),
    carbs_grams: toFormValue(log.carbs_grams),
    fats_grams: toFormValue(log.fats_grams),
    bodyweight: toFormValue(log.bodyweight),
    sleep_hours: toFormValue(log.sleep_hours),
    energy_rating: toFormValue(log.energy_rating),
    notes: log.notes || "",
  };
}

function getWeeklySummary(logs: WellnessLog[]) {
  return {
    avgWater: average(logs.map((log) => log.water_litres)),
    avgProtein: average(logs.map((log) => log.protein_grams)),
    avgSleep: average(logs.map((log) => log.sleep_hours)),
    avgEnergy: average(logs.map((log) => log.energy_rating)),
  };
}

function getNutritionTotals(entries: NutritionEntry[]) {
  return entries.reduce(
    (totals, entry) => ({
      calories: totals.calories + (entry.calories || 0),
      protein: totals.protein + (entry.protein_grams || 0),
      carbs: totals.carbs + (entry.carbs_grams || 0),
      fats: totals.fats + (entry.fats_grams || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );
}

function getDailyCompletion(log: WellnessLog | null | undefined, targets: WellnessTargets) {
  if (!log) return 0;
  const values = [
    getProgress(log.water_litres, targets.waterLitres),
    getProgress(log.protein_grams, targets.proteinGrams),
    getProgress(log.calories, targets.calories),
    getProgress(log.sleep_hours, targets.sleepHours),
  ];
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildWellnessInsights(
  logs: WellnessLog[],
  targets: WellnessTargets,
  nutritionTotals: ReturnType<typeof getNutritionTotals>
) {
  const weekly = getWeeklySummary(logs);
  const loggedDays = logs.length;
  const lowHydrationWithLowEnergy = logs.some(
    (log) =>
      log.energy_rating !== null &&
      log.energy_rating !== undefined &&
      log.energy_rating <= 5 &&
      (log.water_litres ?? 0) < targets.waterLitres * 0.75
  );
  const insights = [
    {
      label: "Consistency",
      title: loggedDays >= 5 ? "Wellness signal is building" : "Build the baseline",
      detail: loggedDays >= 5 ? "You have enough recent days to start comparing wellness against training and golf." : `Log ${Math.max(0, 5 - loggedDays)} more days to make the signal useful.`,
      tone: loggedDays >= 5 ? "border-golf/20 bg-golf/8" : "border-gold/25 bg-gold/10",
    },
    {
      label: "Hydration",
      title: (weekly.avgWater ?? 0) >= targets.waterLitres ? "Hydration is on target" : "Hydration needs attention",
      detail: weekly.avgWater === null ? "Add water totals to see whether hydration is helping or hurting practice days." : `Recent average is ${formatLitres(weekly.avgWater)} against a ${targets.waterLitres} L target.`,
      tone: (weekly.avgWater ?? 0) >= targets.waterLitres ? "border-pulse/20 bg-pulse/8" : "border-gold/25 bg-gold/10",
    },
    {
      label: "Recovery",
      title: (weekly.avgSleep ?? 0) >= targets.sleepHours - 0.5 ? "Sleep is usable" : "Sleep may limit output",
      detail: weekly.avgSleep === null ? "Add sleep hours so AthletiGolf can compare recovery with training quality." : `Recent sleep average is ${formatHours(weekly.avgSleep)}.`,
      tone: (weekly.avgSleep ?? 0) >= targets.sleepHours - 0.5 ? "border-lab/20 bg-lab/8" : "border-gold/25 bg-gold/10",
    },
    {
      label: "Energy Link",
      title: lowHydrationWithLowEnergy ? "Hydration may be dragging energy" : "Energy link is watching",
      detail: lowHydrationWithLowEnergy
        ? "At least one low-energy day also had low water intake. Keep logging to see whether that pattern repeats."
        : "Once low-energy days appear, AthletiGolf will compare them against hydration and recovery signals.",
      tone: lowHydrationWithLowEnergy ? "border-gold/25 bg-gold/10" : "border-pulse/20 bg-pulse/8",
    },
    {
      label: "Nutrition",
      title:
        nutritionTotals.calories === 0
          ? "Add meals to unlock nutrition"
          : nutritionTotals.protein < targets.proteinGrams * 0.8
          ? "Protein is behind target"
          : nutritionTotals.calories < targets.calories * 0.75
          ? "Calories look light"
          : "Fuel is on track",
      detail:
        nutritionTotals.calories === 0
          ? "Meal entries make the nutrition side much more useful than one daily total."
          : `${nutritionTotals.calories} kcal and ${nutritionTotals.protein}g protein logged today.`,
      tone:
        nutritionTotals.calories === 0
          ? "border-gold/25 bg-gold/10"
          : nutritionTotals.protein < targets.proteinGrams * 0.8
          ? "border-gold/25 bg-gold/10"
          : "border-golf/20 bg-golf/8",
    },
  ];

  return insights.slice(0, 5);
}

function buildNutritionStatus(
  nutrition: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fats: number | null;
  },
  targets: WellnessTargets
) {
  const calorieStatus = getTargetStatus(nutrition.calories, targets.calories);
  const proteinStatus = getTargetStatus(nutrition.protein, targets.proteinGrams);
  const carbTarget = Math.round((targets.calories * 0.48) / 4);
  const fatTarget = Math.round((targets.calories * 0.25) / 9);
  const loggedCalories = nutrition.calories || 0;
  const loggedProtein = nutrition.protein || 0;

  if (!loggedCalories && !loggedProtein) {
    return {
      title: "No meals logged yet",
      badge: "Empty",
      badgeClass: "bg-steel/10 text-muted",
      detail: "Add meals or copy a previous day to see whether today is supporting your training and golf.",
      rows: [
        { label: "Calories", value: "-", target: `${targets.calories}`, status: "empty" as const },
        { label: "Protein", value: "-", target: `${targets.proteinGrams}g`, status: "empty" as const },
        { label: "Carbs", value: "-", target: `${carbTarget}g`, status: "empty" as const },
      ],
    };
  }

  const behind = [calorieStatus, proteinStatus].filter((status) => status === "behind").length;
  const ahead = calorieStatus === "ahead";
  const title =
    behind >= 2
      ? "Fuel is behind target"
      : behind === 1
      ? proteinStatus === "behind"
        ? "Protein needs attention"
        : "Calories are behind"
      : ahead
      ? "Calories are ahead"
      : "Fuel is on track";
  const badge =
    behind >= 1 ? "Needs attention" : ahead ? "Ahead" : "On track";
  const badgeClass =
    behind >= 1
      ? "bg-danger/10 text-danger"
      : ahead
      ? "bg-gold/15 text-gold"
      : "bg-golf/10 text-golf";
  const detail =
    behind >= 2
      ? "Today is light on both calories and protein. Add a proper meal before training or recovery work."
      : proteinStatus === "behind"
      ? "Protein is behind today. A high-protein meal or snack would make this day more useful."
      : calorieStatus === "behind"
      ? "Calories are light today. If you trained or played, this may affect energy and recovery."
      : ahead
      ? "Calories are above target. That might be fine on heavy training days, but worth knowing."
      : "Calories and protein are sitting in a useful range for the day.";

  return {
    title,
    badge,
    badgeClass,
    detail,
    rows: [
      {
        label: "Calories",
        value: `${Math.round(loggedCalories)}`,
        target: `${targets.calories}`,
        status: calorieStatus,
      },
      {
        label: "Protein",
        value: `${Math.round(loggedProtein)}g`,
        target: `${targets.proteinGrams}g`,
        status: proteinStatus,
      },
      {
        label: "Carbs",
        value: nutrition.carbs === null ? "-" : `${Math.round(nutrition.carbs)}g`,
        target: `${carbTarget}g`,
        status: getTargetStatus(nutrition.carbs, carbTarget),
      },
      {
        label: "Fats",
        value: nutrition.fats === null ? "-" : `${Math.round(nutrition.fats)}g`,
        target: `${fatTarget}g`,
        status: getTargetStatus(nutrition.fats, fatTarget),
      },
    ].slice(0, 3),
  };
}

function getTargetStatus(value: number | null | undefined, target: number): "behind" | "on-track" | "ahead" | "empty" {
  if (value === null || value === undefined || value <= 0) return "empty";
  if (value < target * 0.8) return "behind";
  if (value > target * 1.12) return "ahead";
  return "on-track";
}

function toNumber(value: string) {
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

function average(values: Array<number | null | undefined>) {
  const numbers = values.filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value));
  return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : null;
}

function getProgress(value: number | null | undefined, target: number) {
  if (!value || value <= 0) return 0;
  return Math.min((value / target) * 100, 100);
}

function formatLitres(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : `${Number(value).toFixed(1)} L`;
}

function formatGrams(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : `${Math.round(value)} g`;
}

function formatHours(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : `${Number(value).toFixed(1)} h`;
}

function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : `${Math.round(value)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function formatMealLabel(value: NutritionEntry["meal_type"]) {
  return mealTypes.find((meal) => meal.value === value)?.label || value;
}

function formatShortDay(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    weekday: "short",
  });
}
