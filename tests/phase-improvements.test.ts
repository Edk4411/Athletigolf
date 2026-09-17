import { readFileSync } from "node:fs";

function equal(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) throw new Error(`${message}: expected ${expected}, received ${actual}`);
}

const generator = readFileSync("src/lib/matching/splitGenerator.ts", "utf8");
if (!generator.includes('weekDays.filter((day) => !protectedDays.has(day))')) throw new Error("generator must select only non-rest replacement days");
if (!generator.includes('if (!replacementDay) return { ...trainingDay, day: "" }')) throw new Error("generator must not reuse a protected day when no slot remains");

const scoreBadge = readFileSync("src/components/ScoreBadge.tsx", "utf8");
if (!scoreBadge.includes('relativeScore <= -3) return "rounded-full border-green-200')) throw new Error("albatross must use light-green circle");
if (!scoreBadge.includes('relativeScore === -2) return "rounded-full border-yellow-300')) throw new Error("eagle must use yellow circle");
if (!scoreBadge.includes('relativeScore === 0) return "border-transparent bg-transparent')) throw new Error("par must have no shape");

const tracker = readFileSync("src/pages/RoundTracker.tsx", "utf8");
if (tracker.includes("Allowance: sync default when games change")) throw new Error("format changes must not reset allowances");
const routes = readFileSync("src/App.tsx", "utf8");
if (!routes.includes('path="/practice/log"') || !routes.includes('path="/golf/practice"')) throw new Error("canonical and legacy practice routes are required");

console.log("Phase improvement tests passed.");
