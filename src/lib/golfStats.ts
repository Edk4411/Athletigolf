import type { Round, RoundHole } from "@/lib/types";

const FAIRWAY_HOLES_PER_ROUND = 14;

const hasValue = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined;

const average = (values: number[]) =>
  values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;

export function getGolfStats(rounds: Round[]) {
  const scoredRoundValues = rounds
    .map(getComparableRoundScore)
    .filter(hasValue);
  const fairwayRounds = rounds.filter((round) => hasValue(round.fairways_hit));
  const girRounds = rounds.filter((round) => hasValue(round.greens_in_regulation));
  const puttingRounds = rounds.filter((round) => hasValue(round.putts));
  const scrambleRounds = rounds.filter((round) => hasValue(round.scramble_percentage));
  const distanceRounds = rounds.filter((round) => hasValue(round.average_driving_distance));
  const longestDriveRounds = rounds.filter((round) => hasValue(round.longest_drive));

  const fairwaysHit = fairwayRounds.reduce(
    (sum, round) => sum + (round.fairways_hit ?? 0),
    0
  );
  const fairwaysPossible = fairwayRounds.reduce((sum, round) => {
    if (hasValue(round.fairways_possible) && round.fairways_possible > 0) {
      return sum + round.fairways_possible;
    }
    const holesPlayed = round.holes_played ?? 18;
    return sum + estimateFairwayHoles(holesPlayed);
  }, 0);

  const greensHit = girRounds.reduce(
    (sum, round) => sum + (round.greens_in_regulation ?? 0),
    0
  );
  const greensPossible = girRounds.reduce(
    (sum, round) => sum + (round.holes_played ?? 18),
    0
  );

  return {
    avgScore: average(scoredRoundValues),
    bestScore:
      scoredRoundValues.length > 0
        ? Math.min(...scoredRoundValues)
        : null,
    avgFairwayPercent:
      fairwaysPossible > 0 ? Math.round((fairwaysHit / fairwaysPossible) * 100) : null,
    avgGirPercent:
      greensPossible > 0 ? Math.round((greensHit / greensPossible) * 100) : null,
    avgPutts: average(puttingRounds.map((round) => round.putts as number)),
    avgPenaltyShots: average(rounds.map((round) => round.penalty_shots ?? 0)),
    avgChipShots: average(rounds.map((round) => round.chip_shots ?? 0)),
    avgGreensideBunkerShots: average(
      rounds.map((round) => round.greenside_bunker_shots ?? 0)
    ),
    totalPenaltyShots: rounds.reduce(
      (sum, round) => sum + (round.penalty_shots ?? 0),
      0
    ),
    avgScramblePercent: average(
      scrambleRounds.map((round) => round.scramble_percentage as number)
    ),
    avgDrivingDistance: average(
      distanceRounds.map((round) => round.average_driving_distance as number)
    ),
    longestDrive:
      longestDriveRounds.length > 0
        ? Math.max(...longestDriveRounds.map((round) => round.longest_drive as number))
        : null,
  };
}

export function getComparableRoundScore(round: Round) {
  if (!hasValue(round.score)) return null;
  const holesPlayed = round.holes_played ?? 18;
  if (holesPlayed === 18) return round.score;
  if (holesPlayed === 9) return round.score * 2;
  return null;
}

export function getShortGameStats(holes: RoundHole[]) {
  const chipChances = holes.filter((hole) => isChipRecoveryHole(hole));
  const upAndDowns = chipChances.filter((hole) => (hole.putts ?? 0) <= 1);
  const sandSaveChances = holes.filter((hole) => isSandRecoveryHole(hole));
  const sandSaves = sandSaveChances.filter((hole) => (hole.putts ?? 0) <= 1);

  return {
    chipChances: chipChances.length,
    upAndDowns: upAndDowns.length,
    upAndDownPercent:
      chipChances.length > 0 ? Math.round((upAndDowns.length / chipChances.length) * 100) : null,
    sandSaveChances: sandSaveChances.length,
    sandSaves: sandSaves.length,
    sandSavePercent:
      sandSaveChances.length > 0
        ? Math.round((sandSaves.length / sandSaveChances.length) * 100)
        : null,
  };
}

function isChipRecoveryHole(hole: RoundHole) {
  const chips = hole.chip_shots ?? 0;
  const bunkers = hole.greenside_bunker_shots ?? 0;
  if (chips <= 0) return false;
  if (bunkers <= 0) return true;
  return hole.recovery_shot_type === "chip";
}

function isSandRecoveryHole(hole: RoundHole) {
  const bunkers = hole.greenside_bunker_shots ?? 0;
  const chips = hole.chip_shots ?? 0;
  if (bunkers <= 0) return false;
  if (chips <= 0) return true;
  return hole.recovery_shot_type === "sand";
}

function estimateFairwayHoles(holesPlayed: number) {
  if (holesPlayed <= 0) return 0;
  if (holesPlayed === 9) return 7;
  if (holesPlayed === 18) return FAIRWAY_HOLES_PER_ROUND;
  return Math.max(0, Math.round((holesPlayed / 18) * FAIRWAY_HOLES_PER_ROUND));
}

export const formatAverage = (value: number | null, digits = 1) =>
  value === null ? "-" : value.toFixed(digits);

export const formatPercent = (value: number | null) =>
  value === null ? "-" : `${value}%`;

export const lowerIsBetterControl = (
  value: number | null,
  cautionPoint: number,
  dangerPoint: number
) => {
  if (value === null) return null;
  if (value <= cautionPoint) return 100;
  const bounded = Math.min(Math.max(value - cautionPoint, 0), dangerPoint - cautionPoint);
  return Math.round(100 - (bounded / (dangerPoint - cautionPoint)) * 100);
};

export const formatControlPercent = (value: number | null) =>
  value === null ? "-" : `${value}%`;
