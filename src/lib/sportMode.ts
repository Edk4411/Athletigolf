import type { OnboardingData } from "@/lib/types";

export type SportMode = NonNullable<OnboardingData["mainSport"]>;

export const sportModeLabels: Record<SportMode, string> = {
  both: "Athletic Performance",
  golf: "Golf Focus",
  training: "Fitness Tracking Only",
  other: "Athletic Performance",
};

export function getSportModeLabel(mode?: OnboardingData["mainSport"] | null) {
  return sportModeLabels[mode || "both"];
}

export function isTrainingOnlyMode(mode?: OnboardingData["mainSport"] | null) {
  return mode === "training";
}

export function isTrainingEnabledMode(mode?: OnboardingData["mainSport"] | null) {
  return mode !== "golf";
}

export function isGolfEnabledMode(mode?: OnboardingData["mainSport"] | null) {
  return mode !== "training";
}

export function isGolfOnlyMode(mode?: OnboardingData["mainSport"] | null) {
  return mode === "golf";
}

export function isAthleticPerformanceMode(mode?: OnboardingData["mainSport"] | null) {
  return mode === "both" || mode === "other" || !mode;
}

export function isGolfRoute(path: string) {
  return path === "/activity/golf" || path === "/setup/golf" || path === "/golf" || path.startsWith("/golf/");
}

export function isTrainingRoute(path: string) {
  return (
    path === "/activity/gym" ||
    path === "/setup/gym" ||
    path === "/fitness/cardio" ||
    path === "/workouts" ||
    path.startsWith("/workouts/") ||
    path === "/gym/history" ||
    path === "/exercises" ||
    path.startsWith("/exercises/")
  );
}

export function isRouteAllowedForSportMode(path: string, mode?: OnboardingData["mainSport"] | null) {
  if (!isGolfEnabledMode(mode) && isGolfRoute(path)) return false;
  if (!isTrainingEnabledMode(mode) && isTrainingRoute(path)) return false;
  return true;
}

export function getFallbackRouteForSportMode(mode?: OnboardingData["mainSport"] | null) {
  return "/dashboard";
}
