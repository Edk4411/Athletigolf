import type { OnboardingData } from "./types";

export type WellnessTargets = {
  calories: number;
  proteinGrams: number;
  waterLitres: number;
  sleepHours: number;
};

export const defaultWellnessTargets: WellnessTargets = {
  calories: 2400,
  proteinGrams: 140,
  waterLitres: 2.5,
  sleepHours: 8,
};

export const defaultWellnessSetup: NonNullable<OnboardingData["wellness"]> = {
  goal: "Performance / recovery",
  age: "",
  heightCm: "",
  weightKg: "",
  sex: "Prefer not to say",
  activityLevel: "Moderate",
  targetBodyweight: "",
  targets: defaultWellnessTargets,
};

export function calculateWellnessTargets(
  wellness?: OnboardingData["wellness"] | null
): WellnessTargets {
  const age = toNumber(wellness?.age);
  const height = toNumber(wellness?.heightCm);
  const weight = toNumber(wellness?.weightKg);

  if (!age || !height || !weight) {
    return defaultWellnessTargets;
  }

  const sexAdjustment =
    wellness?.sex === "Male" ? 5 : wellness?.sex === "Female" ? -161 : -78;
  const bmr = 10 * weight + 6.25 * height - 5 * age + sexAdjustment;
  const calories = roundToNearest(
    bmr * getActivityMultiplier(wellness?.activityLevel) + getGoalAdjustment(wellness?.goal),
    25
  );
  const proteinMultiplier =
    wellness?.goal === "Lose fat" || wellness?.goal === "Gain muscle"
      ? 2
      : wellness?.goal === "Performance / recovery"
      ? 1.8
      : 1.6;
  const waterBoost =
    wellness?.activityLevel === "Very high"
      ? 0.6
      : wellness?.activityLevel === "High"
      ? 0.35
      : 0;

  return {
    calories: clamp(calories, 1400, 5000),
    proteinGrams: Math.round(weight * proteinMultiplier),
    waterLitres: Number(Math.min(weight * 0.035 + waterBoost, 5).toFixed(1)),
    sleepHours:
      wellness?.activityLevel === "High" ||
      wellness?.activityLevel === "Very high" ||
      wellness?.goal === "Performance / recovery"
        ? 8.5
        : 8,
  };
}

export function getWellnessTargets(
  onboardingData?: OnboardingData | null
): WellnessTargets {
  return onboardingData?.wellness?.targets || calculateWellnessTargets(onboardingData?.wellness);
}

export function withCalculatedWellnessTargets(data: OnboardingData): OnboardingData {
  const wellness = {
    ...defaultWellnessSetup,
    ...(data.wellness || {}),
  };

  return {
    ...data,
    wellness: {
      ...wellness,
      targets: calculateWellnessTargets(wellness),
    },
  };
}

function getActivityMultiplier(activityLevel?: string) {
  if (activityLevel === "Light") return 1.35;
  if (activityLevel === "High") return 1.72;
  if (activityLevel === "Very high") return 1.9;
  return 1.55;
}

function getGoalAdjustment(goal?: string) {
  if (goal === "Lose fat") return -350;
  if (goal === "Gain muscle") return 250;
  if (goal === "Performance / recovery") return 100;
  return 0;
}

function toNumber(value?: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function roundToNearest(value: number, nearest: number) {
  return Math.round(value / nearest) * nearest;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
