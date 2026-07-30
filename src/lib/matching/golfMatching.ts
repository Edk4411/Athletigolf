import type { OnboardingData } from "@/lib/types";

export function scoreGolfCompatibility(userA: OnboardingData, userB: OnboardingData) {
  let score = 0;
  const reasons: string[] = [];

  // Need to cast to any to access golf properties as the type definition might not have them
  const golfA = userA.golf as any;
  const golfB = userB.golf as any;

  // 1. Handicap (30)
  const handicapA = Number(golfA?.handicap) || 0;
  const handicapB = Number(golfB?.handicap) || 0;
  if (Math.abs(handicapA - handicapB) < 5) {
    score += 30;
    reasons.push("Similar handicap");
  }

  // 2. Home course (20)
  if (golfA?.homeCourse && golfA.homeCourse === golfB?.homeCourse) {
    score += 20;
    reasons.push("Same home course");
  }

  // 3. Tee times (15)
  if (golfA?.practiceAvailability && golfA.practiceAvailability === golfB?.practiceAvailability) {
    score += 15;
    reasons.push("Similar tee time preference");
  }

  // 4. Walking/Buggy (10)
  if (golfA?.walkingPreference && golfA.walkingPreference === golfB?.walkingPreference) {
    score += 10;
    reasons.push("Compatible travel preference");
  }

  // 5. Recent competition history (15)
  const compA = Number(golfA?.competitionsCount) || 0;
  const compB = Number(golfB?.competitionsCount) || 0;
  if (Math.abs(compA - compB) < 3) {
    score += 15;
    reasons.push("Similar competitive experience");
  }

  // 6. Availability (10)
  // Need explicit availability check if available
  if (golfA?.practiceAvailability && golfA.practiceAvailability === golfB?.practiceAvailability) {
      score += 10;
      reasons.push("Overlapping availability");
  }

  return { score: Math.min(score, 100), reasons };
}
