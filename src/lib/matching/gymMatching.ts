import type { OnboardingData } from "@/lib/types";

export function scoreGymCompatibility(userA: OnboardingData, userB: OnboardingData) {
  let score = 0;
  const reasons: string[] = [];

  const trainingA = userA.training as any;
  const trainingB = userB.training as any;

  if (trainingA?.equipment && trainingA.equipment === trainingB?.equipment) {
    score += 25;
    reasons.push("Same training environment");
  }

  if (trainingA?.goal && trainingA.goal === trainingB?.goal) {
    score += 20;
    reasons.push("Same training goal");
  }

  if (trainingA?.intensity && trainingB?.intensity && trainingA.intensity === trainingB.intensity) {
    score += 15;
    reasons.push("Similar training intensity");
  }

  if (trainingA?.experience && trainingB?.experience && trainingA.experience === trainingB.experience) {
    score += 15;
    reasons.push("Similar experience level");
  }

  const daysA = Array.isArray(trainingA?.daysAvailable) ? trainingA.daysAvailable : [];
  const daysB = Array.isArray(trainingB?.daysAvailable) ? trainingB.daysAvailable : [];
  
  const overlap = daysA.filter((day: string) => daysB.includes(day));
  if (overlap.length > 0) {
    score += Math.min(15, overlap.length * 5);
    reasons.push("Overlapping availability");
  }

  return { score: Math.min(score, 100), reasons };
}