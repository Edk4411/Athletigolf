import type { OnboardingData } from "@/lib/types";

export type SportMode = NonNullable<OnboardingData["mainSport"]>;

export const sportModeLabels: Record<SportMode, string> = {
  both: "Golf + Fitness Tracking",
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

export function isGolfEnabledMode(mode?: OnboardingData["mainSport"] | null) {
  return mode !== "training";
}
