import type { FairwayResult, TeeShotLocation, RoundHole, GolfCourseTee } from "@/lib/types";
import {
  computeCourseHandicap,
  computePlayingHandicap,
  parseHandicapIndex,
} from "@/lib/handicap";

export type LiveParticipant = {
  id: string;
  name: string;
  handicap: string;
  allowancePercent: number;
  type: "owner" | "friend" | "guest";
  team: "A" | "B";
  userId?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
};

export type Hole = {
  par: number;
  yardage: number | null;
  meters: number | null;
  handicap: number | null;
  score: string;
  fairway: FairwayResult;
  teeShotLocation: "" | TeeShotLocation;
  gir: boolean;
  putts: string;
  penaltyShots: string;
  chipShots: string;
  greensideBunkerShots: string;
  recoveryShotType: "" | "chip" | "sand";
};

export const createHoles = (count: number): Hole[] =>
  Array.from({ length: count }, () => ({
    par: 4,
    yardage: null,
    meters: null,
    handicap: null,
    score: "",
    fairway: "na",
    teeShotLocation: "",
    gir: false,
    putts: "",
    penaltyShots: "",
    chipShots: "",
    greensideBunkerShots: "",
    recoveryShotType: "",
  }));

export const parseStat = (value: string) => Number(value || 0);

export const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim();
  return trimmed === "" ? null : Number(trimmed);
};

export const needsRecoveryChoice = (hole: Hole) =>
  parseStat(hole.chipShots) > 0 &&
  parseStat(hole.greensideBunkerShots) > 0 &&
  hole.putts.trim() !== "" &&
  hole.recoveryShotType === "";

export function toDraftHoles(count: 9 | 18, rows: RoundHole[]): Hole[] {
  const holes = createHoles(count);
  rows.forEach((row) => {
    const index = row.hole_number - 1;
    if (index < 0 || index >= holes.length) return;
    holes[index] = {
      par: row.par || 4,
      yardage: row.yardage ?? null,
      meters: row.meters ?? null,
      handicap: row.handicap ?? null,
      score: row.score == null ? "" : row.score.toString(),
      fairway: row.fairway_result || "na",
      teeShotLocation: row.tee_shot_location || "",
      gir: row.gir,
      putts: row.putts == null ? "" : row.putts.toString(),
      penaltyShots: row.penalty_shots == null ? "" : row.penalty_shots.toString(),
      chipShots: row.chip_shots == null ? "" : row.chip_shots.toString(),
      greensideBunkerShots: row.greenside_bunker_shots == null ? "" : row.greenside_bunker_shots.toString(),
      recoveryShotType: row.recovery_shot_type || "",
    };
  });
  return holes;
}

export function formatOption(option: string) {
  if (option === "na") return "N/A";
  return option.replaceAll("_", " ");
}

export function formatToParValue(score: number) {
  if (score === 0) return "E";
  return score > 0 ? `+${score}` : `${score}`;
}

export function getParticipantPlayingHandicap(
  participant: LiveParticipant,
  selectedTee: GolfCourseTee | null,
  holesPlayed: 9 | 18
): number {
  const index = parseHandicapIndex(participant.handicap);
  if (!index) return 0;
  if (selectedTee?.slopeRating && selectedTee.courseRating && selectedTee.parTotal) {
    const ch = computeCourseHandicap(
      index,
      selectedTee.slopeRating,
      selectedTee.courseRating,
      selectedTee.parTotal
    );
    return computePlayingHandicap(ch, participant.allowancePercent);
  }
  // Fallback: use raw index × allowance
  return Math.round(index * (participant.allowancePercent / 100));
}
