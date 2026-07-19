import { useEffect, useMemo, useState } from "react";
import { Activity, Bed, CalendarDays, ChevronLeft, ChevronRight, Copy, Database, Droplets, Flame, Gauge, HeartPulse, Moon, Pencil, Plus, Scale, Search, Trash2, Utensils, Zap, type LucideIcon } from "lucide-react";
import { Button, EmptyState, FieldLabel, SelectInput, Surface, TextArea, TextInput } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { FoodSearchResult, NutritionEntry, OnboardingData, PracticeSession, Round, SavedFood, WellnessLog, WellnessTrackingPreferences, Workout } from "@/lib/types";
import { defaultWellnessTargets, defaultWellnessTracking, getWellnessTargets, getWellnessTracking, type WellnessTargets } from "@/lib/wellnessTargets";

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
const offsetIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toLocalIso(date);
};
const shiftIso = (value: string, days: number) => {
  const date = parseLocalIso(value);
  date.setDate(date.getDate() + days);
  return toLocalIso(date);
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
  resting_heart_rate: "",
  blood_pressure_systolic: "",
  blood_pressure_diastolic: "",
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

const mealTypes: Array<{ value: NutritionEntry["meal_type"]; label: string }> = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snacks" },
];

type WellnessPanel = "home" | "food" | "water" | "sleep" | "body" | "heartRate" | "bloodPressure";

export default function Wellness() {
  const [logs, setLogs] = useState<WellnessLog[]>([]);
  const [nutritionEntries, setNutritionEntries] = useState<NutritionEntry[]>([]);
  const [savedFoods, setSavedFoods] = useState<SavedFood[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [practices, setPractices] = useState<PracticeSession[]>([]);
  const [targets, setTargets] = useState<WellnessTargets>(defaultWellnessTargets);
  const [tracking, setTracking] = useState<WellnessTrackingPreferences>(defaultWellnessTracking);
  const [activePanel, setActivePanel] = useState<WellnessPanel>("home");
  const [selectedLog, setSelectedLog] = useState<WellnessLog | null>(null);
  const [form, setForm] = useState(blankForm);
  const [foodForm, setFoodForm] = useState(blankFoodForm);
  const [savedFoodForm, setSavedFoodForm] = useState(blankFoodForm);
  const [activeMeal, setActiveMeal] = useState<NutritionEntry["meal_type"]>("breakfast");
  const [quickCalories, setQuickCalories] = useState("");
  const [reuseMeal, setReuseMeal] = useState<{
    sourceMeal: NutritionEntry["meal_type"];
    selectedIds: string[];
  } | null>(null);
  const [skippedMeals, setSkippedMeals] = useState<string[]>([]);
  const [selectedSavedFood, setSelectedSavedFood] = useState("");
  const [copySourceDate, setCopySourceDate] = useState(offsetIso(-1));
  const [editingSavedFoodId, setEditingSavedFoodId] = useState("");
  const [saveAsPreset, setSaveAsPreset] = useState(false);
  const [foodSearchQuery, setFoodSearchQuery] = useState("");
  const [foodSearchSource, setFoodSearchSource] = useState<"all" | "open_food_facts" | "usda">("all");
  const [foodSearchResults, setFoodSearchResults] = useState<FoodSearchResult[]>([]);
  const [selectedFoodResult, setSelectedFoodResult] = useState<FoodSearchResult | null>(null);
  const [foodSearchWarnings, setFoodSearchWarnings] = useState<string[]>([]);
  const [searchingFoods, setSearchingFoods] = useState(false);
  const [customWaterMl, setCustomWaterMl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    const [{ data }, { data: profile }, { data: entries }, { data: foods }, { data: roundData }, { data: workoutData }, { data: practiceData }] = await Promise.all([
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
      supabase
        .from("rounds")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("workouts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("practice_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const loadedLogs = (data as WellnessLog[]) || [];
    const onboarding = (profile?.onboarding_data as OnboardingData | null) || null;
    setTargets(getWellnessTargets(onboarding));
    setTracking(getWellnessTracking(onboarding));
    setLogs(loadedLogs);
    setNutritionEntries((entries as NutritionEntry[]) || []);
    setSavedFoods((foods as SavedFood[]) || []);
    setRounds((roundData as Round[]) || []);
    setWorkouts((workoutData as Workout[]) || []);
    setPractices((practiceData as PracticeSession[]) || []);
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

  function setActiveNutritionDate(date: string) {
    const existingLog = logs.find((log) => log.log_date === date) || null;
    setSelectedLog(existingLog);
    setForm((prev) => ({ ...(existingLog ? formFromLog(existingLog) : prev), log_date: date }));
    setFoodSearchWarnings([]);
    setError("");
  }

  function selectMeal(meal: NutritionEntry["meal_type"]) {
    setActiveMeal(meal);
    setFoodForm((prev) => ({ ...prev, meal_type: meal }));
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

  function addCustomWater() {
    const amountMl = toNumber(customWaterMl);
    if (!amountMl || amountMl <= 0) return;
    addWater(amountMl / 1000);
    setCustomWaterMl("");
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
      resting_heart_rate: toInteger(form.resting_heart_rate),
      blood_pressure_systolic: toInteger(form.blood_pressure_systolic),
      blood_pressure_diastolic: toInteger(form.blood_pressure_diastolic),
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
        saturated_fats_grams: payload.saturated_fats_grams,
        sugars_grams: payload.sugars_grams,
        source: payload.source,
        external_id: payload.external_id,
        brand: payload.brand,
        barcode: payload.barcode,
        serving_grams: payload.serving_grams,
        serving_label: payload.serving_label,
        calories_per_100g: payload.calories_per_100g,
        protein_per_100g: payload.protein_per_100g,
        carbs_per_100g: payload.carbs_per_100g,
        fats_per_100g: payload.fats_per_100g,
        saturated_fats_per_100g: payload.saturated_fats_per_100g,
        sugars_per_100g: payload.sugars_per_100g,
        updated_at: new Date().toISOString(),
      });
    }

    setFoodForm((prev) => ({ ...blankFoodForm, meal_type: prev.meal_type }));
    setSelectedSavedFood("");
    setSelectedFoodResult(null);
    setSaveAsPreset(false);
    setSkippedMeals((prev) => prev.filter((key) => key !== mealSkipKey(activeNutritionDate, foodForm.meal_type)));
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

  function openMealReuse(sourceMeal: NutritionEntry["meal_type"]) {
    const sourceEntries = activeEntries.filter((entry) => entry.meal_type === sourceMeal);
    if (!sourceEntries.length) {
      setError(`No ${formatMealLabel(sourceMeal).toLowerCase()} foods to copy on ${formatDate(activeNutritionDate)}.`);
      return;
    }

    setReuseMeal({
      sourceMeal,
      selectedIds: sourceEntries.map((entry) => entry.id),
    });
    setError("");
  }

  function toggleReuseFood(id: string) {
    setReuseMeal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        selectedIds: prev.selectedIds.includes(id)
          ? prev.selectedIds.filter((selectedId) => selectedId !== id)
          : [...prev.selectedIds, id],
      };
    });
  }

  function selectAllReuseFoods() {
    setReuseMeal((prev) => {
      if (!prev) return prev;
      const sourceEntries = activeEntries.filter((entry) => entry.meal_type === prev.sourceMeal);
      return { ...prev, selectedIds: sourceEntries.map((entry) => entry.id) };
    });
  }

  async function copySelectedMealFoods(selectedIds = reuseMeal?.selectedIds || []) {
    if (!reuseMeal || !selectedIds.length) return;
    const sourceEntries = activeEntries.filter((entry) => selectedIds.includes(entry.id));
    if (!sourceEntries.length) return;

    setSaving(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You need to be signed in to copy nutrition entries.");
      setSaving(false);
      return;
    }

    const now = new Date().toISOString();
    const { error: insertError } = await supabase.from("nutrition_entries").insert(
      sourceEntries.map((entry) => ({
        user_id: user.id,
        log_date: activeNutritionDate,
        meal_type: activeMeal,
        food_name: entry.food_name,
        serving: entry.serving,
        calories: entry.calories || 0,
        protein_grams: entry.protein_grams || 0,
        carbs_grams: entry.carbs_grams || 0,
        fats_grams: entry.fats_grams || 0,
        saturated_fats_grams: entry.saturated_fats_grams || 0,
        sugars_grams: entry.sugars_grams || 0,
        source: entry.source || "manual",
        external_id: entry.external_id || null,
        brand: entry.brand || null,
        barcode: entry.barcode || null,
        serving_grams: entry.serving_grams || null,
        serving_label: entry.serving_label || null,
        calories_per_100g: entry.calories_per_100g || null,
        protein_per_100g: entry.protein_per_100g || null,
        carbs_per_100g: entry.carbs_per_100g || null,
        fats_per_100g: entry.fats_per_100g || null,
        saturated_fats_per_100g: entry.saturated_fats_per_100g || null,
        sugars_per_100g: entry.sugars_per_100g || null,
        updated_at: now,
      }))
    );

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setReuseMeal(null);
    setSkippedMeals((prev) => prev.filter((key) => key !== mealSkipKey(activeNutritionDate, activeMeal)));
    await loadLogs();
  }

  async function copyAllReuseFoods() {
    if (!reuseMeal) return;
    const ids = activeEntries
      .filter((entry) => entry.meal_type === reuseMeal.sourceMeal)
      .map((entry) => entry.id);
    await copySelectedMealFoods(ids);
  }

  async function deleteActiveMeal() {
    if (!activeMealEntries.length) return;

    setSaving(true);
    setError("");
    const { error: deleteError } = await supabase
      .from("nutrition_entries")
      .delete()
      .in("id", activeMealEntries.map((entry) => entry.id));
    setSaving(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadLogs();
  }

  function skipActiveMeal() {
    const key = mealSkipKey(activeNutritionDate, activeMeal);
    setSkippedMeals((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setError("");
  }

  async function addQuickCalories(event: React.FormEvent) {
    event.preventDefault();
    const calories = toInteger(quickCalories);
    if (!calories || calories <= 0) return;

    setSaving(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You need to be signed in to save nutrition entries.");
      setSaving(false);
      return;
    }

    const { error: entryError } = await supabase.from("nutrition_entries").insert({
      user_id: user.id,
      log_date: activeNutritionDate,
      meal_type: activeMeal,
      food_name: "Quick calories",
      serving: "Manual calories only",
      calories,
      protein_grams: 0,
      carbs_grams: 0,
      fats_grams: 0,
      saturated_fats_grams: 0,
      sugars_grams: 0,
      source: "manual",
      updated_at: new Date().toISOString(),
    });

    setSaving(false);
    if (entryError) {
      setError(entryError.message);
      return;
    }

    setQuickCalories("");
    setSkippedMeals((prev) => prev.filter((key) => key !== mealSkipKey(activeNutritionDate, activeMeal)));
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
        saturated_fats_grams: entry.saturated_fats_grams || 0,
        sugars_grams: entry.sugars_grams || 0,
        source: entry.source || "manual",
        external_id: entry.external_id || null,
        brand: entry.brand || null,
        barcode: entry.barcode || null,
        serving_grams: entry.serving_grams || null,
        serving_label: entry.serving_label || null,
        calories_per_100g: entry.calories_per_100g || null,
        protein_per_100g: entry.protein_per_100g || null,
        carbs_per_100g: entry.carbs_per_100g || null,
        fats_per_100g: entry.fats_per_100g || null,
        saturated_fats_per_100g: entry.saturated_fats_per_100g || null,
        sugars_per_100g: entry.sugars_per_100g || null,
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
      saturated_fats_grams: toFormValue(food.saturated_fats_grams),
      sugars_grams: toFormValue(food.sugars_grams),
      source: food.source || "manual",
      external_id: food.external_id || "",
      brand: food.brand || "",
      barcode: food.barcode || "",
      serving_grams: toFormValue(food.serving_grams),
      serving_label: food.serving_label || "",
      calories_per_100g: toFormValue(food.calories_per_100g),
      protein_per_100g: toFormValue(food.protein_per_100g),
      carbs_per_100g: toFormValue(food.carbs_per_100g),
      fats_per_100g: toFormValue(food.fats_per_100g),
      saturated_fats_per_100g: toFormValue(food.saturated_fats_per_100g),
      sugars_per_100g: toFormValue(food.sugars_per_100g),
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
        saturated_fats_grams: toInteger(savedFoodForm.saturated_fats_grams) || 0,
        sugars_grams: toInteger(savedFoodForm.sugars_grams) || 0,
        source: savedFoodForm.source || "manual",
        external_id: savedFoodForm.external_id || null,
        brand: savedFoodForm.brand || null,
        barcode: savedFoodForm.barcode || null,
        serving_grams: toNumber(savedFoodForm.serving_grams),
        serving_label: savedFoodForm.serving_label || null,
        calories_per_100g: toNumber(savedFoodForm.calories_per_100g),
        protein_per_100g: toNumber(savedFoodForm.protein_per_100g),
        carbs_per_100g: toNumber(savedFoodForm.carbs_per_100g),
        fats_per_100g: toNumber(savedFoodForm.fats_per_100g),
        saturated_fats_per_100g: toNumber(savedFoodForm.saturated_fats_per_100g),
        sugars_per_100g: toNumber(savedFoodForm.sugars_per_100g),
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
      saturated_fats_grams: toFormValue(food.saturated_fats_grams),
      sugars_grams: toFormValue(food.sugars_grams),
      source: food.source || "manual",
      external_id: food.external_id || "",
      brand: food.brand || "",
      barcode: food.barcode || "",
      serving_grams: toFormValue(food.serving_grams),
      serving_label: food.serving_label || "",
      calories_per_100g: toFormValue(food.calories_per_100g),
      protein_per_100g: toFormValue(food.protein_per_100g),
      carbs_per_100g: toFormValue(food.carbs_per_100g),
      fats_per_100g: toFormValue(food.fats_per_100g),
      saturated_fats_per_100g: toFormValue(food.saturated_fats_per_100g),
      sugars_per_100g: toFormValue(food.sugars_per_100g),
    }));
    setSelectedFoodResult(null);
  }

  async function searchFoods(event: React.FormEvent) {
    event.preventDefault();
    if (foodSearchQuery.trim().length < 2) {
      setFoodSearchWarnings(["Search needs at least 2 characters."]);
      return;
    }

    setSearchingFoods(true);
    setFoodSearchWarnings([]);
    setError("");
    const { data, error: searchError } = await supabase.functions.invoke("food-search", {
      body: {
        query: foodSearchQuery.trim(),
        source: foodSearchSource,
      },
    });
    setSearchingFoods(false);

    if (searchError) {
      setFoodSearchResults([]);
      setFoodSearchWarnings([searchError.message || "Food search is not available yet."]);
      return;
    }

    const results = (data?.results as FoodSearchResult[]) || [];
    const warnings = (data?.warnings as string[]) || [];
    setFoodSearchResults(results);
    setFoodSearchWarnings(results.length > 0 ? [] : warnings);
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
      const next = {
        ...prev,
        serving: value,
        serving_grams: grams ? toFormValue(grams) : prev.serving_grams,
      };
      return grams ? scaleFoodFormToServing(next, grams) : next;
    });
  }

  function scaleFoodFormToServing(form: typeof blankFoodForm, grams: number) {
    const food = foodResultFromForm(form) || selectedFoodResult;
    if (!food || !hasPer100gNutrition(food)) return form;
    const calculated = calculateMacros(food, grams);
    return {
      ...form,
      calories: toFormValue(calculated.calories),
      protein_grams: toFormValue(calculated.protein),
      carbs_grams: toFormValue(calculated.carbs),
      fats_grams: toFormValue(calculated.fats),
      saturated_fats_grams: toFormValue(calculated.saturatedFats),
      sugars_grams: toFormValue(calculated.sugars),
    };
  }

  const todayLog = logs.find((log) => log.log_date === todayIso()) || selectedLog;
  const activeNutritionDate = form.log_date || todayIso();
  const activeEntries = useMemo(
    () => nutritionEntries.filter((entry) => entry.log_date === activeNutritionDate),
    [nutritionEntries, activeNutritionDate]
  );
  const activeMealEntries = useMemo(
    () => activeEntries.filter((entry) => entry.meal_type === activeMeal),
    [activeEntries, activeMeal]
  );
  const activeMealSkipped = skippedMeals.includes(mealSkipKey(activeNutritionDate, activeMeal));
  const availableNutritionDates = useMemo(
    () =>
      Array.from(new Set(nutritionEntries.map((entry) => entry.log_date)))
        .filter((date) => date !== activeNutritionDate)
        .sort((a, b) => b.localeCompare(a)),
    [nutritionEntries, activeNutritionDate]
  );
  const nutritionTotals = useMemo(() => getNutritionTotals(activeEntries), [activeEntries]);
  const calorieDelta = nutritionTotals.calories - targets.calories;
  const nutrientTargets = useMemo(() => getNutrientTargets(targets), [targets]);
  const displayNutrition = {
    calories: nutritionTotals.calories || todayLog?.calories || null,
    protein: nutritionTotals.protein || todayLog?.protein_grams || null,
    carbs: nutritionTotals.carbs || todayLog?.carbs_grams || null,
    fats: nutritionTotals.fats || todayLog?.fats_grams || null,
    saturatedFats: nutritionTotals.saturatedFats || null,
    sugars: nutritionTotals.sugars || null,
  };
  const weekLogs = useMemo(() => logs.slice(0, 7), [logs]);
  const weekly = useMemo(() => getWeeklySummary(weekLogs), [weekLogs]);
  const todayScore = useMemo(() => getDailyCompletion(todayLog, targets), [todayLog, targets]);
  const insights = useMemo(
    () => buildWellnessInsights(weekLogs, targets, nutritionTotals, rounds, workouts, practices),
    [weekLogs, targets, nutritionTotals, rounds, workouts, practices]
  );
  const nutritionStatus = useMemo(() => buildNutritionStatus(displayNutrition, targets), [displayNutrition, targets]);
  const wellnessCards = useMemo(
    () =>
      [
        {
          key: "food" as const,
          enabled: tracking.food,
          icon: Utensils,
          title: "Food",
          value: formatNumber(displayNutrition.calories),
          unit: "kcal",
          target: `${targets.calories.toLocaleString()} kcal target`,
          progress: getProgress(displayNutrition.calories, targets.calories),
          tone: "bg-white",
        },
        {
          key: "water" as const,
          enabled: tracking.water,
          icon: Droplets,
          title: "Water",
          value: formatLitres(todayLog?.water_litres),
          unit: "logged",
          target: `${targets.waterLitres} L target`,
          progress: getProgress(todayLog?.water_litres, targets.waterLitres),
          tone: "bg-white",
        },
        {
          key: "sleep" as const,
          enabled: tracking.sleep,
          icon: Bed,
          title: "Sleep",
          value: formatHours(todayLog?.sleep_hours),
          unit: "last night",
          target: `${targets.sleepHours} h target`,
          progress: getProgress(todayLog?.sleep_hours, targets.sleepHours),
          tone: "bg-[#211f5f] text-white",
        },
        {
          key: "body" as const,
          enabled: tracking.body,
          icon: Scale,
          title: "Body composition",
          value: todayLog?.bodyweight ? `${todayLog.bodyweight} kg` : "-",
          unit: "weight",
          target: "Weight and body signals",
          progress: todayLog?.bodyweight ? 72 : 0,
          tone: "bg-[#25b8ee] text-white",
        },
        {
          key: "bloodPressure" as const,
          enabled: tracking.bloodPressure,
          icon: Gauge,
          title: "Blood pressure",
          value: todayLog?.blood_pressure_systolic && todayLog?.blood_pressure_diastolic
            ? `${todayLog.blood_pressure_systolic}/${todayLog.blood_pressure_diastolic}`
            : "-",
          unit: "mmHg",
          target: "Manual health check",
          progress: todayLog?.blood_pressure_systolic ? 55 : 0,
          tone: "bg-[#f06f94] text-white",
        },
        {
          key: "heartRate" as const,
          enabled: tracking.heartRate,
          icon: HeartPulse,
          title: "Heart rate",
          value: todayLog?.resting_heart_rate ? `${todayLog.resting_heart_rate}` : "-",
          unit: "bpm",
          target: "Resting heart rate",
          progress: todayLog?.resting_heart_rate ? 65 : 0,
          tone: "bg-[#ee668b] text-white",
        },
      ].filter((card) => card.enabled),
    [displayNutrition.calories, targets, todayLog, tracking]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-muted">
        Loading wellness dashboard...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f2f5f7] px-4 py-5 text-[#101d2b] md:px-8 md:py-7">
      <section className="mb-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => activePanel === "home" ? (window.history.length > 1 ? window.history.back() : undefined) : setActivePanel("home")}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#101d2b] shadow-sm"
            aria-label="Go back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-pulse">Wellness</p>
            <h1 className="text-3xl font-black tracking-tight text-[#101d2b]">{getWellnessPanelTitle(activePanel)}</h1>
          </div>
          <span className="h-12 w-12" aria-hidden="true" />
        </div>

        <div className="mb-5 flex items-center justify-center gap-5">
          <button
            type="button"
            onClick={() => setActiveNutritionDate(shiftIso(activeNutritionDate, -1))}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-black/35 transition hover:bg-white hover:text-pulse"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => setActiveNutritionDate(todayIso())}
            className="min-w-[178px] rounded-full bg-[#e0e2e5] px-6 py-4 text-xl font-black text-[#101d2b] transition hover:bg-white"
          >
            {activeNutritionDate === todayIso() ? "Today" : formatDate(activeNutritionDate)}
          </button>
          <button
            type="button"
            onClick={() => setActiveNutritionDate(shiftIso(activeNutritionDate, 1))}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-black/25 transition hover:bg-white hover:text-pulse"
            aria-label="Next day"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </section>

      {activePanel === "home" && (
        <section className="mb-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-black/35">Daily health</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-[#101d2b]">Track what matters today</h2>
            </div>
            <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black/45 shadow-sm">
              {formatDate(activeNutritionDate)}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {wellnessCards.map((card) => (
              <WellnessHubCard
                key={card.key}
                icon={card.icon}
                title={card.title}
                value={card.value}
                unit={card.unit}
                target={card.target}
                progress={card.progress}
                tone={card.tone}
                onClick={() => setActivePanel(card.key)}
              />
            ))}
          </div>
        </section>
      )}

      {activePanel === "food" && (
      <section className="mb-5 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-[2rem] bg-white p-7 shadow-sm">
          <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-start">
            <div>
              <p className="text-[5rem] font-black leading-none tracking-tight text-[#101d2b] sm:text-[6rem]">
                {formatNumber(displayNutrition.calories)}
              </p>
              <p className="mt-2 text-3xl font-medium text-[#101d2b]">kcal</p>
            </div>
            <div className="space-y-4 text-lg font-bold text-black/55">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-pulse">
                  <Flame className="h-5 w-5" />
                </span>
                <span>{targets.calories.toLocaleString()} kcal target</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/5 text-black/45">
                  <Scale className="h-5 w-5" />
                </span>
                <span>{Math.max(targets.calories - 165, 0).toLocaleString()} - {(targets.calories + 165).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <div className="relative h-3 overflow-hidden rounded-full bg-black/7">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-pulse"
                style={{ width: `${Math.min(getProgress(displayNutrition.calories, targets.calories), 100)}%` }}
              />
              <span
                className="absolute top-1/2 h-9 w-9 -translate-y-1/2 rounded-full border-4 border-white bg-pulse shadow-sm"
                style={{ left: `calc(${Math.min(getProgress(displayNutrition.calories, targets.calories), 100)}% - 18px)` }}
              />
            </div>
            <div className="mt-4 flex justify-between text-lg font-medium text-black/45">
              <span>0</span>
              <span>{targets.calories.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.14em] text-black/35">Nutrition info</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-[#101d2b]">{nutritionStatus.title}</h2>
            </div>
            <ChevronRight className="h-7 w-7 text-[#101d2b]" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MacroBox label="Carb" value={displayNutrition.carbs} target={nutrientTargets.carbs} color="text-purple-600" />
            <MacroBox label="Fat" value={displayNutrition.fats} target={nutrientTargets.fats} color="text-red-500" />
            <MacroBox label="Protein" value={displayNutrition.protein} target={nutrientTargets.protein} color="text-gold" />
          </div>
          <div className="mt-6">
            <div className="mb-2 flex justify-between text-sm font-black text-black/45">
              <span>Actual</span>
              <span>Recommended</span>
            </div>
            <MacroSplitBar protein={displayNutrition.protein || 0} carbs={displayNutrition.carbs || 0} fats={displayNutrition.fats || 0} />
            <div className="mt-3 grid grid-cols-3 text-sm font-black">
              <span className="text-purple-600">55%</span>
              <span className="text-center text-red-500">25%</span>
              <span className="text-right text-gold">20%</span>
            </div>
          </div>
          <p className="mt-5 text-sm leading-relaxed text-black/45">{nutritionStatus.detail}</p>
        </div>
      </section>
      )}

      {activePanel !== "home" && (
      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <WellnessSummaryPill icon={Activity} label="Daily score" value={`${todayScore}%`} />
        <WellnessSummaryPill icon={Moon} label="Sleep" value={formatHours(todayLog?.sleep_hours)} />
        <WellnessSummaryPill icon={Zap} label="Energy" value={todayLog?.energy_rating ? `${todayLog.energy_rating}/10` : "-"} />
      </section>
      )}

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.75fr]">
        <div className="order-1 space-y-5 xl:order-1">
          {activePanel === "food" && (
          <Surface className="rounded-[2rem] border-0 bg-white shadow-sm">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-dark">Log meal</h2>
                <p className="mt-1 text-sm text-muted">
                  Choose a meal, add calories quickly, or search the food database.
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={() => copyMealsFromDate(copySourceDate)} disabled={saving}>
                <Copy className="h-4 w-4" />
                Copy Day
              </Button>
            </div>

            <div className="mb-5 divide-y divide-line overflow-hidden rounded-[1.6rem] bg-white">
              {mealTypes.map((meal) => {
                const mealEntries = activeEntries.filter((entry) => entry.meal_type === meal.value);
                const totals = getNutritionTotals(mealEntries);
                const skipped = skippedMeals.includes(mealSkipKey(activeNutritionDate, meal.value)) && mealEntries.length === 0;
                return (
                  <button
                    key={meal.value}
                    type="button"
                    onClick={() => selectMeal(meal.value)}
                    className={`grid w-full grid-cols-[4.5rem_1fr_auto] items-center gap-4 px-1 py-4 text-left transition ${
                      activeMeal === meal.value ? "bg-pulse/5" : "hover:bg-black/[0.025]"
                    }`}
                  >
                    <span className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-black/[0.06] text-sm font-semibold leading-tight text-[#101d2b]">
                      <span>{totals.calories}</span>
                      <span className="text-xs font-medium">kcal</span>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-2xl font-medium text-[#101d2b]">{meal.label}</span>
                      <span className="mt-1 block text-sm text-muted">
                        {skipped ? "Skipped" : `${mealEntries.length} item${mealEntries.length === 1 ? "" : "s"}`}
                      </span>
                    </span>
                    <span className="inline-flex h-12 w-12 items-center justify-center border-l border-line text-[#101d2b]">
                      <Plus className="h-8 w-8" />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mb-5 grid gap-3 rounded-[1.3rem] border border-line bg-[#f7f9fa] p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Active meal</p>
                <p className="mt-1 font-semibold text-dark">
                  {formatMealLabel(activeMeal)} on {formatDate(activeNutritionDate)}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {activeMealSkipped && !activeMealEntries.length ? "Marked as skipped." : `${activeMealEntries.length} item${activeMealEntries.length === 1 ? "" : "s"} logged.`}
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={skipActiveMeal} disabled={saving || activeMealEntries.length > 0}>
                Skip Meal
              </Button>
              <Button type="button" variant="danger" onClick={deleteActiveMeal} disabled={saving || !activeMealEntries.length}>
                <Trash2 className="h-4 w-4" />
                Delete Meal
              </Button>
            </div>

            <div className="mb-5 grid gap-3 rounded-[1.3rem] border border-line bg-[#f7f9fa] p-4">
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
              <div className="grid gap-2 sm:grid-cols-4">
                {mealTypes.map((meal) => (
                  <QuickMealButton
                    key={meal.value}
                    label={meal.label}
                    onClick={() => copyMealsFromDate(copySourceDate, meal.value)}
                  />
                ))}
              </div>
            </div>

            <form onSubmit={addQuickCalories} className="mb-5 rounded-[1.3rem] border border-gold/25 bg-gold/10 p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <FieldLabel>Add calories to {formatMealLabel(activeMeal)}</FieldLabel>
                  <TextInput
                    type="number"
                    min="0"
                    value={quickCalories}
                    onChange={(event) => setQuickCalories(event.target.value)}
                    placeholder="e.g. 250"
                  />
                </div>
                <Button type="submit" variant="gold" disabled={saving || !quickCalories}>
                  <Plus className="h-4 w-4" />
                  Add Calories
                </Button>
              </div>
            </form>

            <form onSubmit={searchFoods} className="mb-5 rounded-[1.3rem] border border-pulse/20 bg-pulse/8 p-4">
              <div className="mb-4 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-pulse/10 text-pulse">
                  <Database className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Food database</p>
                  <h3 className="font-semibold text-dark">Search USDA and Open Food Facts</h3>
                </div>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-muted">
                USDA entries use FoodData Central, U.S. Department of Agriculture, Agricultural Research Service, fdc.nal.usda.gov.
              </p>
              <div className="grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-end">
                <Field label="Food search" value={foodSearchQuery} onChange={setFoodSearchQuery} placeholder="Chicken breast, banana, Weetabix..." />
                <div>
                  <FieldLabel>Source</FieldLabel>
                  <SelectInput value={foodSearchSource} onChange={(event) => setFoodSearchSource(event.target.value as typeof foodSearchSource)}>
                    <option value="all">All databases</option>
                    <option value="open_food_facts">Open Food Facts</option>
                    <option value="usda">USDA</option>
                  </SelectInput>
                </div>
                <Button type="submit" variant="pulse" disabled={searchingFoods}>
                  <Search className="h-4 w-4" />
                  {searchingFoods ? "Searching..." : "Search"}
                </Button>
              </div>

              {foodSearchWarnings.length > 0 && (
                <div className="mt-3 rounded-lg border border-gold/25 bg-gold/10 p-3 text-sm font-semibold text-gold">
                  {foodSearchWarnings.join(" ")}
                </div>
              )}

              {foodSearchResults.length > 0 && (
                <div className="mt-4 grid gap-2">
                  {foodSearchResults.map((food) => (
                    <button
                      key={`${food.source}-${food.id}`}
                      type="button"
                      onClick={() => selectFoodResult(food)}
                      className={`rounded-lg border p-3 text-left transition hover:border-pulse/40 hover:bg-white/80 ${
                        selectedFoodResult?.id === food.id && selectedFoodResult.source === food.source
                          ? "border-pulse bg-white"
                          : "border-line bg-panel"
                      }`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-dark">{food.name}</p>
                          <p className="mt-1 text-sm text-muted">
                            {[food.brand, food.servingLabel || (food.servingGrams ? `${food.servingGrams}g` : null)]
                              .filter(Boolean)
                              .join(" - ") || "Serving details not provided"}
                          </p>
                        </div>
                        <span className="w-fit rounded-full bg-pulse/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-pulse">
                          {formatFoodSource(food.source)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        Per 100g: {formatNumber(food.caloriesPer100g)} kcal / {formatGrams(food.proteinPer100g)} protein
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </form>

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
                  <SelectInput value={foodForm.meal_type} onChange={(event) => selectMeal(event.target.value as NutritionEntry["meal_type"])}>
                    {mealTypes.map((meal) => (
                      <option key={meal.value} value={meal.value}>{meal.label}</option>
                    ))}
                  </SelectInput>
                </div>
                <FoodField label="Food" value={foodForm.food_name} onChange={(value) => setFoodForm((prev) => ({ ...prev, food_name: value }))} placeholder="Chicken wrap" />
                <FoodField label="Serving" value={foodForm.serving} onChange={updateServingLabel} placeholder="1 wrap / 250g" />
                <FoodField label="Serving grams" type="number" value={foodForm.serving_grams} onChange={updateServingGrams} placeholder="100" />
                <FoodField label="Calories" type="number" value={foodForm.calories} onChange={(value) => setFoodForm((prev) => ({ ...prev, calories: value }))} placeholder="520" />
                <FoodField label="Protein (g)" type="number" value={foodForm.protein_grams} onChange={(value) => setFoodForm((prev) => ({ ...prev, protein_grams: value }))} placeholder="38" />
                <FoodField label="Carbs (g)" type="number" value={foodForm.carbs_grams} onChange={(value) => setFoodForm((prev) => ({ ...prev, carbs_grams: value }))} placeholder="55" />
                <FoodField label="Fats (g)" type="number" value={foodForm.fats_grams} onChange={(value) => setFoodForm((prev) => ({ ...prev, fats_grams: value }))} placeholder="14" />
                <FoodField label="Saturated fat (g)" type="number" value={foodForm.saturated_fats_grams} onChange={(value) => setFoodForm((prev) => ({ ...prev, saturated_fats_grams: value }))} placeholder="5" />
                <FoodField label="Sugars (g)" type="number" value={foodForm.sugars_grams} onChange={(value) => setFoodForm((prev) => ({ ...prev, sugars_grams: value }))} placeholder="12" />
              </div>
              {foodForm.source !== "manual" && (
                <div className="rounded-lg border border-pulse/20 bg-pulse/8 p-3 text-sm text-muted">
                  <span className="font-semibold text-dark">Selected source:</span>{" "}
                  {formatFoodSource(foodForm.source)}{foodForm.brand ? ` - ${foodForm.brand}` : ""}
                  {foodForm.barcode ? ` - barcode ${foodForm.barcode}` : ""}
                </div>
              )}
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
                        {food.source && food.source !== "manual" && (
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-pulse">
                            {formatFoodSource(food.source)}{food.brand ? ` - ${food.brand}` : ""}
                          </p>
                        )}
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

            <MealGroup
              meal={mealTypes.find((meal) => meal.value === activeMeal) || mealTypes[0]}
              entries={activeMealEntries}
              onDelete={deleteFoodEntry}
            />
          </Surface>
          )}

          {activePanel !== "home" && activePanel !== "food" && (
          <Surface className="rounded-[2rem] border-0 bg-white shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-pulse/10 text-pulse">
                <Activity className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-black/35">{getWellnessPanelEyebrow(activePanel)}</p>
                <h2 className="text-xl font-black text-[#101d2b]">{getWellnessPanelSubtitle(activePanel)}</h2>
              </div>
            </div>

            <form onSubmit={saveLog} className="grid gap-4">
              <Field label="Date" type="date" value={form.log_date} onChange={setActiveNutritionDate} required />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Field label="Water (litres)" type="number" step="0.1" value={form.water_litres} onChange={(value) => setForm((prev) => ({ ...prev, water_litres: value }))} placeholder={`${targets.waterLitres}`} />
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <QuickAddButton label="+250ml" onClick={() => addWater(0.25)} />
                    <QuickAddButton label="+500ml" onClick={() => addWater(0.5)} />
                    <QuickAddButton label="+1L" onClick={() => addWater(1)} />
                  </div>
                  <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                    <TextInput value={customWaterMl} onChange={(event) => setCustomWaterMl(event.target.value)} type="number" min="0" placeholder="Custom ml" />
                    <Button type="button" variant="secondary" onClick={addCustomWater}>Add</Button>
                  </div>
                </div>
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
                <Field label="Resting heart rate (bpm)" type="number" value={form.resting_heart_rate} onChange={(value) => setForm((prev) => ({ ...prev, resting_heart_rate: value }))} placeholder="58" />
                <Field label="Blood pressure systolic" type="number" value={form.blood_pressure_systolic} onChange={(value) => setForm((prev) => ({ ...prev, blood_pressure_systolic: value }))} placeholder="120" />
                <Field label="Blood pressure diastolic" type="number" value={form.blood_pressure_diastolic} onChange={(value) => setForm((prev) => ({ ...prev, blood_pressure_diastolic: value }))} placeholder="80" />
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
          )}

          <section className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
            <Surface className="rounded-[2rem] border-0 bg-white shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-pulse" />
                <h2 className="text-xl font-black text-[#101d2b]">Last 7 days</h2>
              </div>
              {weekLogs.length ? (
                <div className="grid gap-3 sm:grid-cols-7">
                  {[...weekLogs].reverse().map((log) => (
                    <TrendDay key={log.id} log={log} targets={targets} />
                  ))}
                </div>
              ) : (
                <EmptyState title="No weekly trend yet" description="Save a few daily logs and the week view will fill in here." />
              )}
            </Surface>

            <Surface className="rounded-[2rem] border-0 bg-white shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <Scale className="h-5 w-5 text-pulse" />
                <h2 className="text-xl font-black text-[#101d2b]">Recent logs</h2>
              </div>
              {logs.length ? (
                <div className="divide-y divide-black/8 overflow-hidden rounded-[1.35rem] border border-black/8">
                  {logs.slice(0, 5).map((log) => (
                    <button
                      key={log.id}
                      type="button"
                      onClick={() => selectLog(log)}
                      className={`grid w-full gap-2 p-4 text-left transition hover:bg-black/[0.025] ${
                        selectedLog?.id === log.id ? "bg-pulse/8" : ""
                      }`}
                    >
                      <span className="font-black text-[#101d2b]">{formatDate(log.log_date)}</span>
                      <span className="text-sm text-black/45">
                        Water {formatLitres(log.water_litres)} - Protein {formatGrams(log.protein_grams)} - Energy {log.energy_rating ? `${log.energy_rating}/10` : "-"}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState title="No wellness logs yet" description="Save today's totals and the weekly signal will start building." />
              )}
            </Surface>
          </section>
        </div>
      </section>

      {reuseMeal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            onClick={() => setReuseMeal(null)}
            aria-label="Close meal reuse"
          />
          <div className="relative z-10 w-full max-w-2xl rounded-xl border border-line bg-panel p-5 shadow-2xl">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Reuse meal</p>
                <h2 className="mt-1 text-2xl font-semibold text-dark">
                  Copy {formatMealLabel(reuseMeal.sourceMeal)} to {formatMealLabel(activeMeal)}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Select the foods you want to reuse on {formatDate(activeNutritionDate)}.
                </p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setReuseMeal(null)}>
                Close
              </Button>
            </div>

            <div className="max-h-[52vh] space-y-2 overflow-auto pr-1">
              {activeEntries
                .filter((entry) => entry.meal_type === reuseMeal.sourceMeal)
                .map((entry) => (
                  <label key={entry.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-white/70 p-3">
                    <input
                      type="checkbox"
                      checked={reuseMeal.selectedIds.includes(entry.id)}
                      onChange={() => toggleReuseFood(entry.id)}
                      className="mt-1"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-dark">{entry.food_name}</span>
                      <span className="mt-1 block text-sm text-muted">
                        {entry.serving || "Serving not set"} - {entry.calories || 0} kcal / {entry.protein_grams || 0}g protein
                      </span>
                    </span>
                  </label>
                ))}
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={selectAllReuseFoods}>
                Select All
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={copyAllReuseFoods}
                disabled={saving}
              >
                Copy All Items
              </Button>
              <Button type="button" variant="pulse" onClick={() => copySelectedMealFoods()} disabled={saving || reuseMeal.selectedIds.length === 0}>
                <Copy className="h-4 w-4" />
                Copy Selected
              </Button>
            </div>
          </div>
        </div>
      )}
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

function MacroBox({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number | null | undefined;
  target: number;
  color: string;
}) {
  const progress = getProgress(value, target);
  return (
    <div className="rounded-[1.25rem] border border-black/10 bg-white p-4 text-center">
      <p className={`text-lg font-semibold ${color}`}>{label}</p>
      <p className="mt-3 text-3xl font-black text-[#101d2b]">
        {formatNumber(value)}
        <span className="ml-1 text-base font-semibold text-black/40">g</span>
      </p>
      <p className="mt-2 text-xs font-semibold text-black/35">Target {target}g</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/8">
        <div className="h-full rounded-full bg-current" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function MacroSplitBar({ protein, carbs, fats }: { protein: number; carbs: number; fats: number }) {
  const total = protein + carbs + fats;
  const carbsShare = total ? (carbs / total) * 100 : 55;
  const fatsShare = total ? (fats / total) * 100 : 25;
  const proteinShare = Math.max(0, 100 - carbsShare - fatsShare);

  return (
    <div className="flex h-3 overflow-hidden rounded-full bg-black/8">
      <div className="bg-purple-400" style={{ width: `${carbsShare}%` }} />
      <div className="bg-red-300" style={{ width: `${fatsShare}%` }} />
      <div className="bg-gold" style={{ width: `${proteinShare}%` }} />
    </div>
  );
}

function WellnessSummaryPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[1.35rem] bg-white p-4 shadow-sm">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-pulse/10 text-pulse">
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-xs font-black uppercase tracking-[0.14em] text-black/35">{label}</span>
        <span className="mt-1 block text-lg font-black text-[#101d2b]">{value}</span>
      </span>
    </div>
  );
}

type NutritionDetail = {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  saturatedFats: number | null;
  sugars: number | null;
};

function NutritionDashboard({
  nutrition,
  targets,
  calorieDelta,
  status,
}: {
  nutrition: NutritionDetail;
  targets: ReturnType<typeof getNutrientTargets>;
  calorieDelta: number;
  status: ReturnType<typeof buildNutritionStatus>;
}) {
  const rows = [
    { label: "Protein", value: nutrition.protein, target: targets.protein, unit: "g", tone: "bg-golf" },
    { label: "Carbs", value: nutrition.carbs, target: targets.carbs, unit: "g", tone: "bg-pulse" },
    { label: "Fats", value: nutrition.fats, target: targets.fats, unit: "g", tone: "bg-gold" },
    { label: "Saturated fat", value: nutrition.saturatedFats, target: targets.saturatedFats, unit: "g", tone: "bg-danger" },
    { label: "Sugars", value: nutrition.sugars, target: targets.sugars, unit: "g", tone: "bg-lab" },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Nutrition Target</p>
          <h2 className="mt-1 text-xl font-semibold text-dark">{status.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{status.detail}</p>
        </div>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${status.badgeClass}`}>
          {status.badge}
        </span>
      </div>

      <div className="grid gap-5 md:grid-cols-[180px_1fr] lg:grid-cols-[220px_1fr] lg:items-center">
        <MacroPie nutrition={nutrition} />
        <div className="space-y-3">
          <CalorieBalanceBar calories={nutrition.calories || 0} target={targets.calories} delta={calorieDelta} />
          {rows.map((row) => (
            <MacroDetailRow key={row.label} {...row} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MacroPie({ nutrition }: { nutrition: NutritionDetail }) {
  const proteinCalories = (nutrition.protein || 0) * 4;
  const carbCalories = (nutrition.carbs || 0) * 4;
  const fatCalories = (nutrition.fats || 0) * 9;
  const total = proteinCalories + carbCalories + fatCalories;
  const proteinShare = total ? (proteinCalories / total) * 100 : 0;
  const carbShare = total ? (carbCalories / total) * 100 : 0;
  const fatShare = total ? (fatCalories / total) * 100 : 0;
  const gradient =
    total === 0
      ? "conic-gradient(rgb(226 232 240) 0 100%)"
      : `conic-gradient(rgb(22 163 74) 0 ${proteinShare}%, rgb(0 180 216) ${proteinShare}% ${proteinShare + carbShare}%, rgb(212 175 55) ${proteinShare + carbShare}% 100%)`;

  return (
    <div className="mx-auto flex w-full max-w-[240px] flex-col items-center rounded-xl border border-line bg-white/70 p-4 text-center md:max-w-none">
      <div className="relative h-36 w-36 rounded-full sm:h-44 sm:w-44" style={{ background: gradient }}>
        <div className="absolute inset-5 flex flex-col items-center justify-center rounded-full bg-panel sm:inset-6">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted">Calories</span>
          <span className="mt-1 text-2xl font-semibold text-dark sm:text-3xl">{formatNumber(nutrition.calories)}</span>
        </div>
      </div>
      <div className="mt-4 grid w-full grid-cols-3 gap-2 text-xs font-semibold text-muted">
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-golf" />P {Math.round(proteinShare)}%</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-pulse" />C {Math.round(carbShare)}%</span>
        <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-gold" />F {Math.round(fatShare)}%</span>
      </div>
    </div>
  );
}

function CalorieBalanceBar({ calories, target, delta }: { calories: number; target: number; delta: number }) {
  const progress = getProgress(calories, target);
  const over = delta > 0;
  return (
    <div className="rounded-xl border border-line bg-white/70 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-dark">Calorie balance</p>
          <p className="mt-1 text-xs text-muted">
            {over ? `${Math.round(delta)} over target` : `${Math.abs(Math.round(delta))} under target`}
          </p>
        </div>
        <p className="text-sm font-semibold text-dark">{Math.round(calories)} / {target}</p>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-steel/10">
        <div className={`h-full rounded-full ${over ? "bg-danger" : "bg-gold"}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function MacroDetailRow({
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
  tone: string;
}) {
  const progress = getProgress(value, target);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <p className="text-sm font-semibold text-dark">
          {value === null || value === undefined ? "-" : `${Math.round(value)}${unit}`} / {target}{unit}
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-steel/10">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${progress}%` }} />
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
                {entry.source && entry.source !== "manual" && (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-pulse">
                    {formatFoodSource(entry.source)}{entry.brand ? ` - ${entry.brand}` : ""}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted">
                  C {entry.carbs_grams || 0}g / F {entry.fats_grams || 0}g
                </p>
              </div>
              <div className="flex gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => onDelete(entry.id)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-danger/10 hover:text-danger"
                  aria-label={`Delete ${entry.food_name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
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

function WellnessHubCard({
  icon: Icon,
  title,
  value,
  unit,
  target,
  progress,
  tone,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  unit: string;
  target: string;
  progress: number;
  tone: string;
  onClick: () => void;
}) {
  const dark = tone.includes("text-white");
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[13rem] rounded-[2rem] p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tone}`}
    >
      <div className="mb-8 flex items-start justify-between gap-3">
        <div>
          <p className={`text-2xl font-medium ${dark ? "text-white" : "text-[#101d2b]"}`}>{title}</p>
          <p className={`mt-5 text-[4rem] font-black leading-none tracking-tight ${dark ? "text-white" : "text-[#101d2b]"}`}>
            {value}
          </p>
          <p className={`mt-2 text-xl font-medium ${dark ? "text-white/80" : "text-black/45"}`}>{unit}</p>
        </div>
        <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${dark ? "bg-white/15 text-white" : "bg-black/[0.06] text-pulse"}`}>
          <Icon className="h-6 w-6" />
        </span>
      </div>
      <div className={`h-3 overflow-hidden rounded-full ${dark ? "bg-white/20" : "bg-black/[0.06]"}`}>
        <div
          className={`h-full rounded-full ${dark ? "bg-white" : "bg-pulse"}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <p className={`mt-3 text-sm font-semibold ${dark ? "text-white/75" : "text-black/45"}`}>{target}</p>
    </button>
  );
}

function getWellnessPanelTitle(panel: WellnessPanel) {
  switch (panel) {
    case "food":
      return "Food";
    case "water":
      return "Water";
    case "sleep":
      return "Sleep";
    case "body":
      return "Body composition";
    case "heartRate":
      return "Heart rate";
    case "bloodPressure":
      return "Blood pressure";
    default:
      return "Wellness";
  }
}

function getWellnessPanelEyebrow(panel: WellnessPanel) {
  switch (panel) {
    case "water":
      return "Hydration";
    case "sleep":
      return "Recovery";
    case "body":
      return "Body signals";
    case "heartRate":
      return "Cardio marker";
    case "bloodPressure":
      return "Health marker";
    default:
      return "Daily health";
  }
}

function getWellnessPanelSubtitle(panel: WellnessPanel) {
  switch (panel) {
    case "water":
      return "Log water and hit your daily target";
    case "sleep":
      return "Track sleep, energy and recovery notes";
    case "body":
      return "Record weight and body-composition signals";
    case "heartRate":
      return "Track resting heart rate trends";
    case "bloodPressure":
      return "Record blood pressure manually";
    default:
      return "Water, sleep and body signals";
  }
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
    resting_heart_rate: toFormValue(log.resting_heart_rate),
    blood_pressure_systolic: toFormValue(log.blood_pressure_systolic),
    blood_pressure_diastolic: toFormValue(log.blood_pressure_diastolic),
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
      saturatedFats: totals.saturatedFats + (entry.saturated_fats_grams || 0),
      sugars: totals.sugars + (entry.sugars_grams || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0, saturatedFats: 0, sugars: 0 }
  );
}

function getNutrientTargets(targets: WellnessTargets) {
  return {
    calories: targets.calories,
    protein: targets.proteinGrams,
    carbs: Math.round((targets.calories * 0.48) / 4),
    fats: Math.round((targets.calories * 0.25) / 9),
    saturatedFats: Math.round((targets.calories * 0.1) / 9),
    sugars: Math.round((targets.calories * 0.1) / 4),
  };
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

function countRecentByDate<T>(items: T[], days: number, getDate: (item: T) => string | null | undefined) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return items.filter((item) => {
    const value = getDate(item);
    return value ? new Date(value) >= cutoff : false;
  }).length;
}

function buildWellnessInsights(
  logs: WellnessLog[],
  targets: WellnessTargets,
  nutritionTotals: ReturnType<typeof getNutritionTotals>,
  rounds: Round[],
  workouts: Workout[],
  practices: PracticeSession[]
) {
  const weekly = getWeeklySummary(logs);
  const loggedDays = logs.length;
  const lowEnergyDays = logs.filter((log) => (log.energy_rating ?? 10) <= 5);
  const lowSleepDays = logs.filter((log) => (log.sleep_hours ?? targets.sleepHours) < targets.sleepHours - 0.75);
  const lowHydrationDays = logs.filter((log) => (log.water_litres ?? targets.waterLitres) < targets.waterLitres * 0.75);
  const calorieGap = targets.calories - nutritionTotals.calories;
  const proteinGap = targets.proteinGrams - nutritionTotals.protein;
  const carbTarget = Math.round((targets.calories * 0.48) / 4);
  const recentRounds = countRecentByDate(rounds, 7, (round) => round.date || round.created_at);
  const recentWorkouts = countRecentByDate(workouts, 7, (workout) => workout.date || workout.created_at);
  const recentPractices = countRecentByDate(practices, 7, (practice) => practice.created_at);
  const recentLoad = recentRounds + recentWorkouts + recentPractices;
  const avgScore = average(rounds.slice(0, 5).map((round) => round.score));
  const avgPracticeRating = average(practices.slice(0, 5).map((practice) => practice.rating));
  const hasEnoughSignal = loggedDays >= 5;
  const recoveryDriver =
    lowSleepDays.length >= 2
      ? "sleep"
      : lowHydrationDays.length >= 2
      ? "hydration"
      : lowEnergyDays.length >= 2
      ? "energy"
      : "consistency";
  const fuelStatus =
    nutritionTotals.calories === 0
      ? "empty"
      : calorieGap > targets.calories * 0.2 || proteinGap > targets.proteinGrams * 0.2
      ? "behind"
      : nutritionTotals.calories > targets.calories * 1.12
      ? "high"
      : "on-track";
  const performanceContext =
    recentLoad === 0
      ? "No recent training, practice or rounds are logged, so this is pure wellness signal for now."
      : `${recentLoad} sport sessions this week: ${recentRounds} round${recentRounds === 1 ? "" : "s"}, ${recentWorkouts} workout${recentWorkouts === 1 ? "" : "s"} and ${recentPractices} practice log${recentPractices === 1 ? "" : "s"}.`;

  return [
    {
      label: "Recovery readout",
      title:
        recoveryDriver === "sleep"
          ? "Sleep is the likely limiter"
          : recoveryDriver === "hydration"
          ? "Hydration is probably dragging energy"
          : recoveryDriver === "energy"
          ? "Energy is dipping without a clear cause"
          : hasEnoughSignal
          ? "Recovery looks usable"
          : "Build the recovery baseline",
      detail:
        recoveryDriver === "sleep"
          ? `${lowSleepDays.length} recent day${lowSleepDays.length === 1 ? "" : "s"} came in below sleep target, which can explain flat training or poor focus.`
          : recoveryDriver === "hydration"
          ? `${lowHydrationDays.length} recent day${lowHydrationDays.length === 1 ? "" : "s"} missed hydration by a clear margin.`
          : recoveryDriver === "energy"
          ? `${lowEnergyDays.length} low-energy day${lowEnergyDays.length === 1 ? "" : "s"} logged. Keep sleep, water and food complete so AthletiGolf can isolate the cause.`
          : hasEnoughSignal
          ? `Recent averages: ${formatHours(weekly.avgSleep)} sleep, ${formatLitres(weekly.avgWater)} water and ${weekly.avgEnergy === null ? "-" : `${weekly.avgEnergy.toFixed(1)}/10`} energy.`
          : `Log ${Math.max(0, 5 - loggedDays)} more day${Math.max(0, 5 - loggedDays) === 1 ? "" : "s"} to make the recovery readout sharper.`,
      action:
        recoveryDriver === "sleep"
          ? `Aim for ${targets.sleepHours}h tonight before judging tomorrow's training quality.`
          : recoveryDriver === "hydration"
          ? `Get to ${targets.waterLitres} L and check whether energy rebounds.`
          : "Keep the daily sleep, water and energy fields complete.",
      tone: recoveryDriver === "consistency" && hasEnoughSignal ? "border-golf/20 bg-golf/8" : "border-gold/25 bg-gold/10",
    },
    {
      label: "Nutrition pattern",
      title:
        fuelStatus === "empty"
          ? "Food data is missing"
          : fuelStatus === "behind"
          ? "Fuel is behind the workload"
          : fuelStatus === "high"
          ? "Calories are running high"
          : "Fuel is in a useful range",
      detail:
        fuelStatus === "empty"
          ? "Add meals or quick calories before using nutrition to explain performance."
          : proteinGap > targets.proteinGrams * 0.2
          ? `Protein is ${Math.max(0, Math.round(proteinGap))}g short. That is the first nutrition gap to close.`
          : calorieGap > targets.calories * 0.2
          ? `Calories are ${Math.round(calorieGap)} under target, which matters more on workout, practice or round days.`
          : nutritionTotals.calories > targets.calories * 1.12
          ? `${nutritionTotals.calories} kcal is above target. Fine occasionally, but worth watching across the week.`
          : `${nutritionTotals.calories} kcal, ${nutritionTotals.protein}g protein and ${nutritionTotals.carbs}g carbs logged today.`,
      action:
        fuelStatus === "empty"
          ? "Log one real meal or copy a previous day to unlock this."
          : proteinGap > 0
          ? `Add about ${Math.max(10, Math.round(proteinGap))}g protein before the day closes.`
          : nutritionTotals.carbs < carbTarget * 0.75 && recentLoad > 0
          ? "Add a carb-heavy meal around training or practice."
          : "Keep meals logged by meal type so patterns become obvious.",
      tone: fuelStatus === "behind" || fuelStatus === "empty" ? "border-gold/25 bg-gold/10" : fuelStatus === "high" ? "border-danger/20 bg-danger/8" : "border-golf/20 bg-golf/8",
    },
    {
      label: "Golf + training link",
      title:
        recentLoad >= 4 && fuelStatus === "behind"
          ? "Load is high while fuel is low"
          : recentLoad >= 4
          ? "Busy performance week"
          : recentLoad > 0
          ? "Performance context is building"
          : "Connect sport data next",
      detail:
        recentLoad >= 4 && fuelStatus === "behind"
          ? `${performanceContext} Under-fuelling this week could show up as weaker gym output or less focused practice.`
          : recentLoad > 0
          ? `${performanceContext}${avgScore ? ` Recent scoring average is ${avgScore.toFixed(1)}.` : ""}${avgPracticeRating ? ` Practice rating is ${avgPracticeRating.toFixed(1)}/10.` : ""}`
          : performanceContext,
      action:
        recentLoad === 0
          ? "Log a round, workout or practice session to connect wellness with performance."
          : fuelStatus === "behind"
          ? "Treat nutrition as part of the session, not a separate chore."
          : "Keep logging sport days so AthletiAI can spot your best-performance conditions.",
      tone: recentLoad >= 4 && fuelStatus === "behind" ? "border-danger/20 bg-danger/8" : recentLoad > 0 ? "border-pulse/20 bg-pulse/8" : "border-gold/25 bg-gold/10",
    },
    {
      label: "Next action",
      title:
        proteinGap > 0
          ? "Close protein first"
          : calorieGap > targets.calories * 0.15
          ? "Bring calories up"
          : lowSleepDays.length
          ? "Protect tonight's sleep"
          : lowHydrationDays.length
          ? "Hydrate before chasing more volume"
          : "Hold the line",
      detail:
        proteinGap > 0
          ? `Protein has the clearest immediate return: it supports recovery and keeps the day useful even if calories are imperfect.`
          : calorieGap > targets.calories * 0.15
          ? `You are ${Math.round(calorieGap)} kcal under. On a training or golf day, that can become tomorrow's low energy.`
          : lowSleepDays.length
          ? "Sleep is the recovery lever with the broadest effect on practice quality, appetite and gym output."
          : lowHydrationDays.length
          ? "Hydration is a low-friction fix before changing training or food decisions."
          : "No urgent correction. The job is consistency: keep enough data coming in.",
      action:
        proteinGap > 0
          ? `Add a meal or snack with ${Math.max(10, Math.round(proteinGap))}g protein.`
          : calorieGap > targets.calories * 0.15
          ? "Add a proper meal rather than only snacks."
          : lowSleepDays.length
          ? "Set tomorrow up by logging sleep and energy again."
          : "Repeat the day and watch the weekly trend.",
      tone: proteinGap > 0 || calorieGap > targets.calories * 0.15 || lowSleepDays.length ? "border-gold/25 bg-gold/10" : "border-golf/20 bg-golf/8",
    },
    {
      label: "Coach summary",
      title:
        !hasEnoughSignal
          ? "AthletiAI needs more signal"
          : recoveryDriver === "sleep" || fuelStatus === "behind"
          ? "Recovery needs support"
          : recentLoad > 0
          ? "Good week to compare performance"
          : "Wellness base is forming",
      detail:
        !hasEnoughSignal
          ? "The system can already guide today, but weekly coaching gets better after five complete days."
          : recoveryDriver === "sleep" && fuelStatus === "behind"
          ? "The main risk is stacking poor sleep with low fuel. That combination can make training feel worse than it should."
          : recoveryDriver === "sleep"
          ? "Sleep is the priority lever this week. Keep food steady while you fix recovery."
          : fuelStatus === "behind"
          ? "Fuel is the obvious limiter. Before changing the training plan, make sure the day is fed properly."
          : recentLoad > 0
          ? "You have enough sport context to start watching which wellness conditions produce better scores, sessions and practice ratings."
          : "Wellness logging is becoming useful. Add sport data to make it performance-specific.",
      action:
        !hasEnoughSignal
          ? `Complete ${Math.max(0, 5 - loggedDays)} more daily log${Math.max(0, 5 - loggedDays) === 1 ? "" : "s"}.`
          : "Use this as the daily coach note, then compare it with tomorrow's energy.",
      tone: hasEnoughSignal ? "border-lab/20 bg-lab/8" : "border-gold/25 bg-gold/10",
    },
  ];
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

function hasPer100gNutrition(food: FoodSearchResult) {
  return [
    food.caloriesPer100g,
    food.proteinPer100g,
    food.carbsPer100g,
    food.fatsPer100g,
    food.saturatedFatsPer100g,
    food.sugarsPer100g,
  ].some((value) => value !== null && value !== undefined && Number.isFinite(value));
}

function roundMacro(value: number | null, multiplier: number) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 0;
  return Math.round(value * multiplier);
}

function formatFoodSource(source: string) {
  if (source === "open_food_facts") return "Open Food Facts";
  if (source === "usda") return "USDA";
  return "Manual";
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
  return parseLocalIso(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function formatMealLabel(value: NutritionEntry["meal_type"]) {
  return mealTypes.find((meal) => meal.value === value)?.label || value;
}

function mealSkipKey(date: string, meal: NutritionEntry["meal_type"]) {
  return `${date}:${meal}`;
}

function formatShortDay(value: string) {
  return parseLocalIso(value).toLocaleDateString("en-GB", {
    weekday: "short",
  });
}


