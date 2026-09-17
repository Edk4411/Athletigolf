import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ScoreBadgeSize = "sm" | "md" | "lg";

type ScoreBadgeProps = {
  score: ReactNode;
  par?: number | string | null;
  scoreToPar?: number | null;
  size?: ScoreBadgeSize;
  className?: string;
};

const sizeClasses: Record<ScoreBadgeSize, string> = {
  sm: "h-7 min-w-7 px-2 text-xs",
  md: "h-9 min-w-9 px-2.5 text-sm",
  lg: "h-12 min-w-12 px-3 text-lg",
};

export default function ScoreBadge({ score, par, scoreToPar, size = "md", className }: ScoreBadgeProps) {
  const scoreValue = getNumber(score);
  const parValue = getNumber(par);
  const relativeScore = scoreToPar ?? (scoreValue !== null && parValue !== null ? scoreValue - parValue : null);
  const tone = getScoreTone(relativeScore);
  const displayScore = score === null || score === undefined || score === "" ? "-" : score;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center border text-center font-black leading-none",
        sizeClasses[size],
        tone,
        className
      )}
      title={relativeScore === null ? undefined : getScoreLabel(relativeScore)}
    >
      {displayScore}
    </span>
  );
}

function getScoreTone(relativeScore: number | null) {
  if (relativeScore === null) return "rounded-full border-steel/15 bg-steel/7 text-dark";
  if (relativeScore <= -3) return "rounded-full border-green-200 bg-green-200 text-green-950";
  if (relativeScore === -2) return "rounded-full border-yellow-300 bg-yellow-300 text-dark";
  if (relativeScore === -1) return "rounded-full border-red-500 bg-red-500 text-white";
  if (relativeScore === 0) return "border-transparent bg-transparent text-dark";
  if (relativeScore === 1) return "rounded-sm border-sky-200 bg-sky-200 text-sky-950";
  if (relativeScore === 2) return "rounded-sm border-blue-700 bg-blue-700 text-white";
  return "rounded-sm border-purple-600 bg-purple-600 text-white";
}

function getScoreLabel(relativeScore: number) {
  if (relativeScore <= -3) return "Albatross";
  if (relativeScore === -2) return "Eagle";
  if (relativeScore === -1) return "Birdie";
  if (relativeScore === 0) return "Par";
  if (relativeScore === 1) return "Bogey";
  if (relativeScore === 2) return "Double bogey";
  return "Triple bogey or worse";
}

function getNumber(value: ReactNode) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
